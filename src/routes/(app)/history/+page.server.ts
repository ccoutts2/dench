import { db } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const workouts = await db.workout.findMany({
		where: { userId: locals.user!.id, finishedAt: { not: null } },
		orderBy: { startedAt: 'desc' },
		take: 60,
		include: {
			exercises: {
				orderBy: { position: 'asc' },
				include: { exercise: { select: { name: true } }, sets: true }
			}
		}
	});

	return {
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
			exercises: w.exercises.map((e) => ({ name: e.exercise.name, sets: e.sets.length }))
		}))
	};
};
