/**
 * Moves data between IndexedDB and the server.
 *
 *  - bootstrap(): pulls the library, "previous" sets and settings into IndexedDB.
 *  - enqueue(): records a change in the outbox and tries to send it right away.
 *  - flush(): sends queued changes in batches; anything unsent waits for signal.
 */
import { db, type OutboxOp } from './db.ts';
import type { LibraryExercise, PreviousSet, Settings } from '#lib/types.ts';
import { uuidv7 } from '#lib/uuid.ts';

type Bootstrap = {
	userId: string;
	exercises: LibraryExercise[];
	previous: Record<string, PreviousSet[]>;
	settings: Settings;
};

let bootstrapping: Promise<void> | null = null;

export function bootstrap(): Promise<void> {
	return (bootstrapping ??= (async () => {
		try {
			const res = await fetch('/api/bootstrap');
			if (!res.ok) return;
			const data: Bootstrap = await res.json();

			// A different account signed in on this device: start clean.
			const owner = await db.meta.get('userId');
			if (owner && owner.value !== data.userId) await clearLocal();

			const pendingCustom = await pendingCustomExercises();
			const tables = [db.exercises, db.previous, db.workouts, db.meta];
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
				await db.meta.bulkPut([
					{ key: 'userId', value: data.userId },
					{ key: 'settings', value: data.settings },
					{ key: 'bootstrappedAt', value: Date.now() }
				]);
			});
		} catch {
			// Offline: keep whatever is cached.
		} finally {
			bootstrapping = null;
		}
	})());
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
	return (flushing ??= (async () => {
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
			}
		} catch {
			// Network dropped mid-flush; the outbox is intact.
		} finally {
			flushing = null;
			notify();
		}
	})());
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
		db.workouts.clear(),
		db.meta.clear()
	]);
	notify();
}

// Lightweight change signal for UI that shows sync status.
const listeners = new Set<() => void>();
function notify() {
	for (const fn of listeners) fn();
}
export function onSyncChange(fn: () => void) {
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
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') void flush();
	});
}
