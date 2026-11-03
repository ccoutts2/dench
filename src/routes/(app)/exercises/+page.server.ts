import { listExercises } from '#lib/server/exercises.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	exercises: await listExercises(locals.user!.id)
});
