/**
 * On-device database (IndexedDB via Dexie).
 *
 * Holds only what the phone needs to work offline: the live workout, the
 * outbox of unsynced changes, and read-only caches of the library and
 * "previous" sets. Neon stays the source of truth.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { Bests, RecordHit } from '#lib/records.ts';
import type {
	LibraryExercise,
	PreviousSet,
	SessionType,
	SetType,
	Settings,
	WorkoutDTO
} from '#lib/types.ts';

export type LiveSet = {
	id: string;
	type: SetType;
	weightKg: number | null;
	reps: number | null;
	/** Target from the template, shown as placeholder. */
	targetWeightKg: number | null;
	targetReps: number | null;
	completedAt: string | null;
};

export type LiveExercise = {
	id: string;
	exerciseId: string;
	name: string;
	restSec: number | null;
	notes: string | null;
	sets: LiveSet[];
};

export type LiveWorkout = {
	key: 'current';
	id: string;
	templateId: string | null;
	name: string;
	sessionType: SessionType;
	notes: string | null;
	startedAt: string;
	exercises: LiveExercise[];
	rest: { endsAt: number; totalSec: number; exercise: string; next: string } | null;
};

export type OutboxOp =
	| { id: string; type: 'workout.save'; payload: WorkoutDTO; createdAt: number }
	| { id: string; type: 'workout.delete'; payload: { id: string }; createdAt: number }
	| {
			id: string;
			type: 'exercise.upsert';
			payload: Omit<LibraryExercise, 'custom'>;
			createdAt: number;
	  };

/** Locally finished workouts, kept for the summary screen and offline history. */
export type LocalWorkout = WorkoutDTO & {
	/** 0 = waiting in the outbox, 1 = on the server (IndexedDB can't index booleans). */
	synced: 0 | 1;
	exerciseNames: Record<string, string>;
	/** PRs worked out on the phone at finish time (the server recomputes its own). */
	records?: (RecordHit & { exerciseId: string })[];
};

class DenchDB extends Dexie {
	live!: EntityTable<LiveWorkout, 'key'>;
	outbox!: EntityTable<OutboxOp, 'id'>;
	exercises!: EntityTable<LibraryExercise, 'id'>;
	previous!: EntityTable<{ exerciseId: string; sets: PreviousSet[] }, 'exerciseId'>;
	workouts!: EntityTable<LocalWorkout, 'id'>;
	meta!: EntityTable<{ key: string; value: unknown }, 'key'>;
	bests!: EntityTable<{ exerciseId: string; bests: Bests }, 'exerciseId'>;

	constructor() {
		super('dench');
		this.version(1).stores({
			live: 'key',
			outbox: 'id, createdAt',
			exercises: 'id, name, primaryMuscle',
			previous: 'exerciseId',
			workouts: 'id, startedAt, synced',
			meta: 'key'
		});
		this.version(2).stores({ bests: 'exerciseId' });
	}
}

export const db = new DenchDB();

export async function getSettings(): Promise<Settings> {
	const row = await db.meta.get('settings');
	return (row?.value as Settings) ?? { defaultRestSec: 120, units: 'KG', barWeightKg: 20 };
}
