import { json } from '@sveltejs/kit';
import { listExercises } from '#lib/server/exercises.ts';
import type { RequestHandler } from './$types';

/** Exercise library as JSON. The service worker caches this for offline use. */
export const GET: RequestHandler = async ({ locals }) => {
	const exercises = await listExercises(locals.user!.id);
	return json(exercises, { headers: { 'cache-control': 'private, max-age=0, must-revalidate' } });
};
