/**
 * The workout in progress. Lives entirely on the phone: every change is written
 * to IndexedDB straight away, so closing the app (or iOS killing it) loses
 * nothing. Finishing turns it into a queued `workout.save` op.
 */
import { db, getSettings, type LiveExercise, type LiveSet, type LiveWorkout } from './db.ts';
import { enqueue } from './sync.ts';
import { uuidv7 } from '#lib/uuid.ts';
import type {
	LibraryExercise,
	PreviousSet,
	SessionType,
	TemplateDTO,
	WorkoutDTO
} from '#lib/types.ts';

export type TemplateStart = Pick<TemplateDTO, 'id' | 'name' | 'sessionType'> & {
	exercises: (TemplateDTO['exercises'][number] & { name: string })[];
};

const blankSet = (): LiveSet => ({
	id: uuidv7(),
	type: 'NORMAL',
	weightKg: null,
	reps: null,
	targetWeightKg: null,
	targetReps: null,
	completedAt: null
});

class LiveSession {
	workout = $state<LiveWorkout | null>(null);
	loaded = $state(false);
	/** Last logged sets per exercise, for the "previous" column and placeholders. */
	previous = $state<Record<string, PreviousSet[]>>({});

	async load() {
		this.workout = (await db.live.get('current')) ?? null;
		await this.refreshPrevious();
		this.loaded = true;
	}

	private async persist() {
		if (this.workout) await db.live.put($state.snapshot(this.workout));
		else await db.live.delete('current');
	}

	private async refreshPrevious() {
		if (!this.workout) return;
		const ids = this.workout.exercises.map((e) => e.exerciseId);
		const rows = await db.previous.bulkGet(ids);
		const map: Record<string, PreviousSet[]> = {};
		for (const r of rows) if (r) map[r.exerciseId] = r.sets;
		this.previous = map;
	}

	// ─── Start / end ──────────────────────────────────────────────────────────

	async startEmpty() {
		this.workout = {
			key: 'current',
			id: uuidv7(),
			templateId: null,
			name: defaultName(),
			sessionType: 'OTHER',
			notes: null,
			startedAt: new Date().toISOString(),
			exercises: [],
			rest: null
		};
		await this.persist();
	}

	async startFromTemplate(t: TemplateStart) {
		this.workout = {
			key: 'current',
			id: uuidv7(),
			templateId: t.id,
			name: t.name,
			sessionType: t.sessionType,
			notes: null,
			startedAt: new Date().toISOString(),
			exercises: t.exercises.map((e) => ({
				id: uuidv7(),
				exerciseId: e.exerciseId,
				name: e.name,
				restSec: e.restSec,
				notes: e.notes,
				sets: (e.sets.length
					? e.sets
					: [{ type: 'NORMAL' as const, targetWeightKg: null, targetReps: null }]
				).map((s) => ({
					...blankSet(),
					type: s.type,
					targetWeightKg: s.targetWeightKg,
					targetReps: s.targetReps
				}))
			})),
			rest: null
		};
		await this.persist();
		await this.refreshPrevious();
	}

	async discard() {
		this.workout = null;
		await this.persist();
	}

	/**
	 * Saves ticked sets only (unticked ones are dropped, like Strong), queues the
	 * workout for sync, and returns its id, or null if nothing was ticked.
	 */
	async finish(): Promise<string | null> {
		const w = this.workout;
		if (!w) return null;
		const exercises = w.exercises
			.map((e) => ({ ...e, sets: e.sets.filter((s) => s.completedAt) }))
			.filter((e) => e.sets.length > 0);
		if (exercises.length === 0) return null;

		const dto: WorkoutDTO = {
			id: w.id,
			templateId: w.templateId,
			name: w.name.trim() || defaultName(),
			sessionType: w.sessionType,
			notes: w.notes,
			startedAt: w.startedAt,
			finishedAt: new Date().toISOString(),
			exercises: exercises.map((e) => ({
				id: e.id,
				exerciseId: e.exerciseId,
				restSec: e.restSec,
				notes: e.notes,
				sets: e.sets.map((s) => ({
					id: s.id,
					type: s.type,
					weightKg: s.weightKg,
					reps: s.reps,
					completedAt: s.completedAt
				}))
			}))
		};

		await db.transaction('rw', [db.workouts, db.previous, db.live], async () => {
			await db.workouts.put({
				...dto,
				synced: 0,
				exerciseNames: Object.fromEntries(exercises.map((e) => [e.exerciseId, e.name]))
			});
			await db.previous.bulkPut(
				dto.exercises.map((e) => ({
					exerciseId: e.exerciseId,
					sets: e.sets.map(({ type, weightKg, reps }) => ({ type, weightKg, reps }))
				}))
			);
			await db.live.delete('current');
		});
		this.workout = null;
		await enqueue('workout.save', dto);
		return dto.id;
	}

	// ─── Editing ──────────────────────────────────────────────────────────────

	async rename(name: string) {
		if (!this.workout) return;
		this.workout.name = name;
		await this.persist();
	}

	async setSessionType(type: SessionType) {
		if (!this.workout) return;
		this.workout.sessionType = type;
		await this.persist();
	}

	async addExercises(list: LibraryExercise[]) {
		if (!this.workout) return;
		for (const ex of list) {
			const prev = (await db.previous.get(ex.id))?.sets ?? [];
			const count = Math.max(1, prev.filter((s) => s.type !== 'WARMUP').length || 3);
			this.workout.exercises.push({
				id: uuidv7(),
				exerciseId: ex.id,
				name: ex.name,
				restSec: null,
				notes: null,
				sets: Array.from({ length: count }, blankSet)
			});
		}
		await this.persist();
		await this.refreshPrevious();
	}

	async removeExercise(i: number) {
		this.workout?.exercises.splice(i, 1);
		await this.persist();
	}

	async moveExercise(i: number, dir: -1 | 1) {
		const list = this.workout?.exercises;
		if (!list || i + dir < 0 || i + dir >= list.length) return;
		[list[i], list[i + dir]] = [list[i + dir], list[i]];
		await this.persist();
	}

	async setRest(i: number, sec: number | null) {
		const ex = this.workout?.exercises[i];
		if (!ex) return;
		ex.restSec = sec;
		await this.persist();
	}

	async addSet(i: number) {
		const ex = this.workout?.exercises[i];
		if (!ex) return;
		const last = ex.sets.at(-1);
		// New sets inherit the last set's numbers, the way people actually log.
		ex.sets.push({
			...blankSet(),
			weightKg: last?.weightKg ?? null,
			reps: last?.reps ?? null,
			targetWeightKg: last?.targetWeightKg ?? null,
			targetReps: last?.targetReps ?? null
		});
		await this.persist();
	}

	async removeSet(i: number, j: number) {
		this.workout?.exercises[i]?.sets.splice(j, 1);
		await this.persist();
	}

	async updateSet(i: number, j: number, patch: Partial<Pick<LiveSet, 'weightKg' | 'reps'>>) {
		const set = this.workout?.exercises[i]?.sets[j];
		if (!set) return;
		Object.assign(set, patch);
		await this.persist();
	}

	/** Tick or untick a set. Ticking fills blanks from target/previous and starts rest. */
	async toggleSet(i: number, j: number) {
		const w = this.workout;
		const ex = w?.exercises[i];
		const set = ex?.sets[j];
		if (!w || !ex || !set) return;

		if (set.completedAt) {
			set.completedAt = null;
		} else {
			const prev = this.previousFor(ex, j);
			set.weightKg ??= set.targetWeightKg ?? prev?.weightKg ?? null;
			set.reps ??= set.targetReps ?? prev?.reps ?? null;
			set.completedAt = new Date().toISOString();

			const sec = ex.restSec ?? (await getSettings()).defaultRestSec;
			const next = ex.sets[j + 1];
			const nextKg = next ? (next.weightKg ?? next.targetWeightKg) : null;
			const upNext = next
				? `next: set ${j + 2}${nextKg !== null ? ` · ${nextKg} kg` : ''}`
				: w.exercises[i + 1]
					? `next: ${w.exercises[i + 1].name}`
					: 'last set done';
			if (sec > 0) {
				w.rest = {
					endsAt: Date.now() + sec * 1000,
					totalSec: sec,
					exercise: ex.name,
					next: upNext
				};
			}
		}
		await this.persist();
	}

	/** The previous-session set that lines up with set j (matching by position). */
	previousFor(ex: LiveExercise, j: number): PreviousSet | undefined {
		return this.previous[ex.exerciseId]?.[j];
	}

	// ─── Rest timer ───────────────────────────────────────────────────────────

	async adjustRest(deltaSec: number) {
		const rest = this.workout?.rest;
		if (!rest) return;
		rest.endsAt = Math.max(Date.now(), rest.endsAt + deltaSec * 1000);
		rest.totalSec = Math.max(1, rest.totalSec + deltaSec);
		await this.persist();
	}

	async clearRest() {
		if (!this.workout?.rest) return;
		this.workout.rest = null;
		await this.persist();
	}
}

function defaultName() {
	const h = new Date().getHours();
	return h < 12 ? 'Morning workout' : h < 17 ? 'Afternoon workout' : 'Evening workout';
}

export const live = new LiveSession();
