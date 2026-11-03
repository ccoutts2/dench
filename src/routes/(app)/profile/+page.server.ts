import { db } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	// Older accounts (or ones created before the hook ran) get a profile lazily.
	const profile = await db.profile.upsert({
		where: { userId },
		update: {},
		create: { userId, liftingSince: new Date() }
	});
	const workouts = await db.workout.count({ where: { userId, finishedAt: { not: null } } });
	const prs = await db.personalRecord.count({ where: { userId } });

	return {
		profile: {
			units: profile.units,
			defaultRestSec: profile.defaultRestSec,
			bodyweightKg: profile.bodyweightKg?.toNumber() ?? null,
			heightCm: profile.heightCm?.toNumber() ?? null,
			barWeightKg: profile.barWeightKg.toNumber(),
			liftingSince: profile.liftingSince?.toISOString() ?? null
		},
		stats: { workouts, prs }
	};
};
