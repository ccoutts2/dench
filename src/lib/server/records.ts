import { db } from './db.ts';
import { detectRecords, mergeBests, type Bests, type SetLike } from '#lib/records.ts';

/**
 * Rebuild the stored PRs for these exercises from the full history. Run after
 * any save, edit or delete touching them, so records stay correct when an old
 * workout is changed (not only when a new one is added).
 */
export async function recomputeRecords(userId: string, exerciseIds: string[]) {
	for (const exerciseId of new Set(exerciseIds)) {
		const rows = await db.workoutExercise.findMany({
			where: { exerciseId, workout: { userId, finishedAt: { not: null } } },
			orderBy: [{ workout: { startedAt: 'asc' } }, { position: 'asc' }],
			select: {
				workoutId: true,
				workout: { select: { startedAt: true } },
				sets: { select: { id: true, type: true, weightKg: true, reps: true } }
			}
		});

		// One exercise can appear twice in a workout; treat it as one session.
		const sessions = new Map<string, { at: Date; sets: SetLike[] }>();
		for (const r of rows) {
			const s = sessions.get(r.workoutId) ?? { at: r.workout.startedAt, sets: [] };
			for (const set of r.sets) {
				s.sets.push({ ...set, weightKg: set.weightKg?.toNumber() ?? null });
			}
			sessions.set(r.workoutId, s);
		}

		let bests: Bests | undefined;
		const records = [];
		for (const [workoutId, s] of sessions) {
			for (const hit of detectRecords(s.sets, bests)) {
				records.push({
					userId,
					exerciseId,
					workoutId,
					setId: hit.setId,
					type: hit.type,
					value: hit.value,
					achievedAt: s.at
				});
			}
			bests = mergeBests(bests, s.sets);
		}

		await db.$transaction([
			db.personalRecord.deleteMany({ where: { userId, exerciseId } }),
			db.personalRecord.createMany({ data: records })
		]);
	}
}

/** Current best per record type for every exercise the user has done. */
export async function bestsFor(userId: string): Promise<Record<string, Bests>> {
	const rows = await db.$queryRaw<
		{
			exerciseId: string;
			e1rm: unknown;
			heaviest: unknown;
			volume: unknown;
			reps: unknown;
		}[]
	>`
		SELECT we."exerciseId",
			MAX(ROUND(CASE WHEN s.reps = 1 THEN s."weightKg" ELSE s."weightKg" * (1 + s.reps / 30.0) END, 2))
				FILTER (WHERE s."weightKg" > 0 AND s.reps BETWEEN 1 AND 12) AS e1rm,
			MAX(s."weightKg") FILTER (WHERE s."weightKg" > 0 AND s.reps >= 1) AS heaviest,
			MAX(ROUND(s."weightKg" * s.reps, 2)) FILTER (WHERE s."weightKg" > 0 AND s.reps >= 1) AS volume,
			MAX(s.reps) FILTER (WHERE COALESCE(s."weightKg", 0) <= 0 AND s.reps >= 1) AS reps
		FROM workout_set s
		JOIN workout_exercise we ON we.id = s."workoutExerciseId"
		JOIN workout w ON w.id = we."workoutId"
		WHERE w."userId" = ${userId} AND w."finishedAt" IS NOT NULL AND s.type <> 'WARMUP'
		GROUP BY we."exerciseId"`;

	const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
	const out: Record<string, Bests> = {};
	for (const r of rows) {
		const b: Bests = {
			EST_1RM: num(r.e1rm),
			HEAVIEST_WEIGHT: num(r.heaviest),
			BEST_SET_VOLUME: num(r.volume),
			MOST_REPS: num(r.reps)
		};
		for (const k of Object.keys(b) as (keyof Bests)[]) if (b[k] === undefined) delete b[k];
		out[r.exerciseId] = b;
	}
	return out;
}
