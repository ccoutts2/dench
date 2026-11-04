import { db } from './db.ts';
import { muscleLoad, type MuscleLoad } from '#lib/muscles.ts';
import type { SetType } from '#lib/types.ts';

/** Muscle load for a logged workout, using the exercise library cached on the phone. */
export async function localMuscleLoad(
	exercises: { exerciseId: string; sets: { type: SetType }[] }[]
): Promise<MuscleLoad> {
	const lib = await db.exercises.bulkGet(exercises.map((e) => e.exerciseId));
	return muscleLoad(
		exercises.flatMap((e, k) => {
			const ex = lib[k];
			return ex
				? [{ primaryMuscle: ex.primaryMuscle, secondaryMuscles: ex.secondaryMuscles, sets: e.sets }]
				: [];
		})
	);
}
