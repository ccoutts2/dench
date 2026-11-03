import { db } from './db.ts';
import type { LibraryExercise, PreviousSet } from '#lib/types.ts';

/** Exercise ids the user may log: the global library plus their own. */
export async function assertUsableExercises(userId: string, ids: string[]) {
	const unique = [...new Set(ids)];
	if (unique.length === 0) return;
	const found = await db.exercise.count({
		where: { id: { in: unique }, OR: [{ userId: null }, { userId }] }
	});
	if (found !== unique.length) throw new InputError('Unknown exercise in payload');
}

export class InputError extends Error {}

export async function libraryFor(userId: string): Promise<LibraryExercise[]> {
	const rows = await db.exercise.findMany({
		where: { OR: [{ userId: null }, { userId }] },
		select: {
			id: true,
			name: true,
			equipment: true,
			primaryMuscle: true,
			kind: true,
			userId: true
		},
		orderBy: { name: 'asc' }
	});
	return rows.map(({ userId: owner, ...e }) => ({ ...e, custom: owner !== null }));
}

/** The sets from the most recent finished workout for each exercise the user has done. */
export async function previousFor(userId: string): Promise<Record<string, PreviousSet[]>> {
	const latest = await db.$queryRaw<{ id: string; exerciseId: string }[]>`
		SELECT DISTINCT ON (we."exerciseId") we.id, we."exerciseId"
		FROM workout_exercise we
		JOIN workout w ON w.id = we."workoutId"
		WHERE w."userId" = ${userId} AND w."finishedAt" IS NOT NULL
		ORDER BY we."exerciseId", w."startedAt" DESC, we.position ASC`;
	if (latest.length === 0) return {};

	const sets = await db.workoutSet.findMany({
		where: { workoutExerciseId: { in: latest.map((l) => l.id) } },
		orderBy: { position: 'asc' },
		select: { workoutExerciseId: true, type: true, weightKg: true, reps: true }
	});
	const byWe = new Map(latest.map((l) => [l.id, l.exerciseId]));
	const out: Record<string, PreviousSet[]> = {};
	for (const s of sets) {
		const exId = byWe.get(s.workoutExerciseId)!;
		(out[exId] ??= []).push({
			type: s.type,
			weightKg: s.weightKg?.toNumber() ?? null,
			reps: s.reps
		});
	}
	return out;
}
