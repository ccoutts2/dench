import { db } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const now = new Date();
	const m = MONTH.exec(url.searchParams.get('m') ?? '');
	const year = m ? Number(m[1]) : now.getUTCFullYear();
	const month = m ? Number(m[2]) - 1 : now.getUTCMonth();

	// Pad a day each side: the phone groups by its own timezone, not the server's.
	const from = new Date(Date.UTC(year, month, 1) - 86_400_000);
	const to = new Date(Date.UTC(year, month + 1, 1) + 86_400_000);

	const [workouts, first] = await Promise.all([
		db.workout.findMany({
			where: { userId, finishedAt: { not: null }, startedAt: { gte: from, lt: to } },
			orderBy: { startedAt: 'desc' },
			include: {
				exercises: {
					orderBy: { position: 'asc' },
					include: { exercise: { select: { name: true } }, sets: true }
				},
				personalRecords: { select: { exerciseId: true, exercise: { select: { name: true } } } }
			}
		}),
		db.workout.findFirst({
			where: { userId, finishedAt: { not: null } },
			orderBy: { startedAt: 'asc' },
			select: { startedAt: true }
		})
	]);

	return {
		year,
		month,
		firstWorkoutAt: first?.startedAt.toISOString() ?? null,
		workouts: workouts.map((w) => ({
			id: w.id,
			name: w.name,
			sessionType: w.sessionType,
			startedAt: w.startedAt.toISOString(),
			durationMs: w.finishedAt!.getTime() - w.startedAt.getTime(),
			volumeKg: w.exercises
				.flatMap((e) => e.sets)
				.reduce(
					(sum, s) =>
						s.type === 'WARMUP' ? sum : sum + (s.weightKg?.toNumber() ?? 0) * (s.reps ?? 0),
					0
				),
			exercises: w.exercises.map((e) => ({ name: e.exercise.name, sets: e.sets.length })),
			prs: [...new Map(w.personalRecords.map((r) => [r.exerciseId, r.exercise.name])).values()]
		}))
	};
};
