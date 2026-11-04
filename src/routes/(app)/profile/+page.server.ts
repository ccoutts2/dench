import { fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '#lib/server/db.ts';
import { uuidv7 } from '#lib/uuid.ts';
import type { Actions, PageServerLoad } from './$types';

const KG_PER_LB = 0.45359237;

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	// Older accounts (or ones created before the hook ran) get a profile lazily.
	const profile = await db.profile.upsert({
		where: { userId },
		update: {},
		create: { userId, liftingSince: new Date() }
	});
	const [user, workouts, prGroups, firstWorkout] = await Promise.all([
		// Read fresh: the session cookie caches the name for a few minutes after an edit.
		db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
		db.workout.count({ where: { userId, finishedAt: { not: null } } }),
		// A PR is "an exercise improved in a workout", however many record types it beat.
		db.personalRecord.groupBy({ by: ['workoutId', 'exerciseId'], where: { userId } }),
		db.workout.findFirst({
			where: { userId, finishedAt: { not: null } },
			orderBy: { startedAt: 'asc' },
			select: { startedAt: true }
		})
	]);

	const since = [profile.liftingSince, firstWorkout?.startedAt]
		.filter((d): d is Date => !!d)
		.sort((a, b) => a.getTime() - b.getTime())[0];

	return {
		profile: {
			units: profile.units,
			defaultRestSec: profile.defaultRestSec,
			bodyweightKg: profile.bodyweightKg?.toNumber() ?? null,
			heightCm: profile.heightCm?.toNumber() ?? null,
			barWeightKg: profile.barWeightKg.toNumber(),
			liftingSince: since?.toISOString() ?? null
		},
		name: user.name,
		stats: { workouts, prs: prGroups.length }
	};
};

const optionalNumber = (max: number) =>
	v.pipe(
		v.string(),
		v.trim(),
		v.transform((s) => (s === '' ? null : Number(s.replace(',', '.')))),
		v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(max)))
	);

const ProfileForm = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Enter your name'), v.maxLength(60)),
	units: v.picklist(['KG', 'LB']),
	defaultRestSec: v.pipe(
		v.string(),
		v.transform(Number),
		v.number(),
		v.integer(),
		v.minValue(0),
		v.maxValue(900)
	),
	/** In the chosen unit. */
	bodyweight: optionalNumber(1000),
	heightCm: optionalNumber(272),
	/** In the chosen unit. */
	barWeight: v.pipe(
		optionalNumber(100),
		v.transform((n) => n ?? 20)
	)
});

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const parsed = v.safeParse(ProfileForm, Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.issues[0].message });
		const f = parsed.output;

		const toKg = (n: number | null) =>
			n === null ? null : Math.round((f.units === 'LB' ? n * KG_PER_LB : n) * 100) / 100;
		const bodyweightKg = toKg(f.bodyweight);

		const before = await db.profile.findUnique({
			where: { userId },
			select: { bodyweightKg: true }
		});
		const bodyweightChanged =
			bodyweightKg !== null &&
			Math.abs((before?.bodyweightKg?.toNumber() ?? -1) - bodyweightKg) >= 0.01;

		await db.$transaction([
			db.user.update({ where: { id: userId }, data: { name: f.name } }),
			db.profile.update({
				where: { userId },
				data: {
					units: f.units,
					defaultRestSec: f.defaultRestSec,
					bodyweightKg,
					heightCm: f.heightCm,
					barWeightKg: toKg(f.barWeight)!
				}
			}),
			// A new bodyweight also goes on the measurements chart.
			...(bodyweightChanged
				? [
						db.measurement.create({
							data: {
								id: uuidv7(),
								userId,
								kind: 'BODYWEIGHT',
								value: bodyweightKg!,
								measuredAt: new Date()
							}
						})
					]
				: [])
		]);
		return { saved: true };
	}
};
