import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import { libraryFor, previousFor } from '#lib/server/library.ts';
import { bestsFor } from '#lib/server/records.ts';
import { measurementsFor } from '#lib/server/measurements.ts';
import type { Settings } from '#lib/types.ts';
import { DEFAULT_PLATES_KG } from '#lib/plates.ts';
import type { RequestHandler } from './$types';

/** Everything the phone caches in IndexedDB so logging works with no signal. */
export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.user!.id;
	const [exercises, previous, bests, measurements, profile] = await Promise.all([
		libraryFor(userId),
		previousFor(userId),
		bestsFor(userId),
		measurementsFor(userId),
		db.profile.findUnique({ where: { userId } })
	]);
	const settings: Settings = {
		defaultRestSec: profile?.defaultRestSec ?? 120,
		units: profile?.units ?? 'KG',
		barWeightKg: profile?.barWeightKg.toNumber() ?? 20,
		plateSetKg: profile?.plateSetKg.map((p) => p.toNumber()) ?? DEFAULT_PLATES_KG
	};
	return json(
		{ userId, exercises, previous, bests, measurements, settings },
		{ headers: { 'cache-control': 'private, no-store' } }
	);
};
