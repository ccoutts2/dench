import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import { libraryFor, previousFor } from '#lib/server/library.ts';
import type { Settings } from '#lib/types.ts';
import type { RequestHandler } from './$types';

/** Everything the phone caches in IndexedDB so logging works with no signal. */
export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.user!.id;
	const [exercises, previous, profile] = await Promise.all([
		libraryFor(userId),
		previousFor(userId),
		db.profile.findUnique({ where: { userId } })
	]);
	const settings: Settings = {
		defaultRestSec: profile?.defaultRestSec ?? 120,
		units: profile?.units ?? 'KG',
		barWeightKg: profile?.barWeightKg.toNumber() ?? 20
	};
	return json(
		{ userId, exercises, previous, settings },
		{ headers: { 'cache-control': 'private, no-store' } }
	);
};
