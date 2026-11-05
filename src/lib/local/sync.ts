/**
 * Moves data between IndexedDB and the server.
 *
 *  - bootstrap(): pulls the library, "previous" sets and settings into IndexedDB.
 *  - enqueue(): records a change in the outbox and tries to send it right away.
 *  - flush(): sends queued changes in batches; anything unsent waits for signal.
 */
import { db, type OutboxOp } from './db.ts';
import type { LibraryExercise, MeasurementDTO, PreviousSet, Settings } from '#lib/types.ts';
import type { Bests } from '#lib/records.ts';
import { uuidv7 } from '#lib/uuid.ts';

type Bootstrap = {
	userId: string;
	exercises: LibraryExercise[];
	previous: Record<string, PreviousSet[]>;
	bests: Record<string, Bests>;
	measurements: MeasurementDTO[];
	settings: Settings;
};

let bootstrapping: Promise<void> | null = null;

/**
 * Run `task` unless it's already running, in which case join it. The slot is
 * cleared in a .finally() attached *after* assignment, so a task that finishes
 * synchronously (e.g. flush while offline) can't leave a stale promise behind.
 */
function single(
	get: () => Promise<void> | null,
	set: (p: Promise<void> | null) => void,
	task: () => Promise<void>
) {
	const running = get();
	if (running) return running;
	const p = task().finally(() => set(null));
	set(p);
	return p;
}

export function bootstrap(): Promise<void> {
	return single(
		() => bootstrapping,
		(p) => (bootstrapping = p),
		async () => {
			try {
				const res = await fetch('/api/bootstrap');
				if (!res.ok) return;
				const data: Bootstrap = await res.json();

				// A different account signed in on this device: start clean.
				const owner = await db.meta.get('userId');
				if (owner && owner.value !== data.userId) await clearLocal();

				const pendingCustom = await pendingCustomExercises();
				const tables = [
					db.exercises,
					db.previous,
					db.bests,
					db.measurements,
					db.workouts,
					db.meta,
					db.outbox
				];
				await db.transaction('rw', tables, async () => {
					await db.exercises.clear();
					await db.exercises.bulkPut([...data.exercises, ...pendingCustom]);

					// The server only knows synced workouts. For exercises logged in a
					// workout that's still queued, the local "previous" is newer: keep it.
					const unsynced = await db.workouts.where('synced').equals(0).toArray();
					const localIds = [
						...new Set(unsynced.flatMap((w) => w.exercises.map((e) => e.exerciseId)))
					];
					const keep = (await db.previous.bulkGet(localIds)).filter((p) => p !== undefined);
					await db.previous.clear();
					await db.previous.bulkPut(
						Object.entries(data.previous).map(([exerciseId, sets]) => ({ exerciseId, sets }))
					);
					await db.previous.bulkPut(keep);

					// Same for bests: a queued workout may have raised them.
					const keepBests = (await db.bests.bulkGet(localIds)).filter((b) => b !== undefined);
					await db.bests.clear();
					await db.bests.bulkPut(
						Object.entries(data.bests).map(([exerciseId, bests]) => ({ exerciseId, bests }))
					);
					await db.bests.bulkPut(keepBests);

					// Measurements: the server's list, then changes still in the outbox on top.
					await db.measurements.clear();
					await db.measurements.bulkPut(data.measurements);
					for (const op of await db.outbox.orderBy('createdAt').toArray()) {
						if (op.type === 'measurement.save') await db.measurements.put(op.payload);
						if (op.type === 'measurement.delete') await db.measurements.delete(op.payload.id);
					}
					await db.meta.bulkPut([
						{ key: 'userId', value: data.userId },
						{ key: 'settings', value: data.settings },
						{ key: 'bootstrappedAt', value: Date.now() }
					]);
				});
			} catch {
				// Offline: keep whatever is cached.
			}
		}
	);
}

/** Custom exercises created offline that the server hasn't seen yet. */
async function pendingCustomExercises(): Promise<LibraryExercise[]> {
	const ops = await db.outbox.toArray();
	return ops
		.filter((op) => op.type === 'exercise.upsert')
		.map((op) => ({ ...(op.payload as Omit<LibraryExercise, 'custom'>), custom: true }));
}

export async function enqueue<T extends OutboxOp['type']>(
	type: T,
	payload: Extract<OutboxOp, { type: T }>['payload']
) {
	await db.outbox.put({ id: uuidv7(), type, payload, createdAt: Date.now() } as OutboxOp);
	void flush();
}

let flushing: Promise<void> | null = null;

export function flush(): Promise<void> {
	return single(
		() => flushing,
		(p) => (flushing = p),
		async () => {
			let moved = false;
			try {
				while (navigator.onLine) {
					const batch = await db.outbox.orderBy('createdAt').limit(20).toArray();
					if (batch.length === 0) break;

					const res = await fetch('/api/sync', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							ops: batch.map(({ id, type, payload }) => ({ id, type, payload }))
						})
					});
					if (!res.ok) break; // signed out or server trouble: retry later

					const { done, rejected } = (await res.json()) as {
						done: string[];
						rejected: { id: string; reason: string }[];
					};
					for (const r of rejected) console.warn('[sync] dropped invalid change', r);

					const settled = new Set([...done, ...rejected.map((r) => r.id)]);
					const savedWorkouts = batch
						.filter((op) => op.type === 'workout.save' && done.includes(op.id))
						.map((op) => op.payload.id);

					await db.transaction('rw', [db.outbox, db.workouts], async () => {
						await db.outbox.bulkDelete([...settled]);
						await db.workouts.where('id').anyOf(savedWorkouts).modify({ synced: 1 });
					});
					if (settled.size === 0) break;
					moved = true;
				}
			} catch {
				// Network dropped mid-flush; the outbox is intact.
			} finally {
				notify(moved);
			}
		}
	);
}

/**
 * Delete a finished workout. Removes it from this phone at once, drops a save
 * that hasn't gone out yet, and queues the server delete. The "previous" cache
 * is rebuilt from the server once the delete lands.
 */
export async function deleteWorkout(id: string) {
	await db.transaction('rw', [db.outbox, db.workouts], async () => {
		await db.outbox.filter((op) => op.type === 'workout.save' && op.payload.id === id).delete();
		await db.workouts.delete(id);
	});
	await enqueue('workout.delete', { id });
	await flushing;
	if ((await db.outbox.filter((op) => op.type === 'workout.delete').count()) === 0) {
		await bootstrap();
	}
}

/** Add or change a measurement: saved on the phone now, synced when there's signal. */
export async function saveMeasurement(m: MeasurementDTO) {
	await db.measurements.put(m);
	await enqueue('measurement.save', m);
}

export async function deleteMeasurement(id: string) {
	await db.transaction('rw', [db.outbox, db.measurements], async () => {
		// A save that never left the phone can simply be dropped.
		await db.outbox.filter((op) => op.type === 'measurement.save' && op.payload.id === id).delete();
		await db.measurements.delete(id);
	});
	await enqueue('measurement.delete', { id });
}

/** Workouts deleted on this phone whose delete hasn't reached the server yet. */
export async function pendingDeletes(): Promise<Set<string>> {
	const ops = await db.outbox.filter((op) => op.type === 'workout.delete').toArray();
	return new Set(ops.map((op) => (op.payload as { id: string }).id));
}

export async function pendingCount() {
	return db.outbox.count();
}

/** Wipe everything on this device for the signed-in user (sign-out / account switch). */
export async function clearLocal() {
	await Promise.all([
		db.live.clear(),
		db.outbox.clear(),
		db.exercises.clear(),
		db.previous.clear(),
		db.bests.clear(),
		db.measurements.clear(),
		db.workouts.clear(),
		db.meta.clear()
	]);
	notify();
}

// Lightweight change signal for UI that shows sync status.
/** `changed` is true when the server now holds something it didn't before. */
const listeners = new Set<(changed: boolean) => void>();
function notify(changed = true) {
	for (const fn of listeners) fn(changed);
}
export function onSyncChange(fn: (changed: boolean) => void) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

let started = false;
/** Call once from the app shell. */
export function startSync() {
	if (started) return;
	started = true;
	void bootstrap().then(flush);
	addEventListener('online', () => void flush());
	addEventListener('focus', () => void flush());
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') void flush();
	});
	// The 'online' event is unreliable (notably on iOS), so also retry while
	// anything is waiting. Cheap when the outbox is empty: one IndexedDB count.
	setInterval(async () => {
		if (document.visibilityState === 'visible' && (await db.outbox.count()) > 0) void flush();
	}, 20_000);
}
