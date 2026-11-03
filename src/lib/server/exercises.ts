import { db } from './db.ts';

/** The global library plus the user's custom exercises, alphabetical. */
export function listExercises(userId: string) {
	return db.exercise.findMany({
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
}

export type ExerciseSummary = Awaited<ReturnType<typeof listExercises>>[number];
