import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import { sessionBests, type SetLike } from '#lib/records.ts';
import { volumeOf } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	const exercise = await db.exercise.findFirst({
		where: { id: params.id, OR: [{ userId: null }, { userId }] },
		select: {
			id: true,
			name: true,
			primaryMuscle: true,
			secondaryMuscles: true,
			equipment: true,
			userId: true
		}
	});
	if (!exercise) error(404, 'Exercise not found');

	const rows = await db.workoutExercise.findMany({
		where: { exerciseId: exercise.id, workout: { userId, finishedAt: { not: null } } },
		orderBy: [{ workout: { startedAt: 'asc' } }, { position: 'asc' }],
		select: {
			workout: { select: { id: true, startedAt: true } },
			sets: { orderBy: { position: 'asc' }, select: { type: true, weightKg: true, reps: true } }
		}
	});

	// One point per workout (an exercise logged twice in a session counts once).
	const byWorkout = new Map<string, { at: Date; sets: SetLike[] }>();
	for (const r of rows) {
		const s = byWorkout.get(r.workout.id) ?? { at: r.workout.startedAt, sets: [] };
		s.sets.push(...r.sets.map((x) => ({ ...x, weightKg: x.weightKg?.toNumber() ?? null })));
		byWorkout.set(r.workout.id, s);
	}

	const sessions = [...byWorkout].map(([workoutId, s]) => {
		const best = sessionBests(s.sets);
		return {
			workoutId,
			date: s.at.toISOString(),
			e1rm: best.get('EST_1RM')?.value ?? null,
			heaviest: best.get('HEAVIEST_WEIGHT')?.value ?? null,
			volume: volumeOf(s.sets),
			reps: best.get('MOST_REPS')?.value ?? null,
			bestSet: best.get('BEST_SET_VOLUME') ?? null,
			sets: s.sets
				.filter((x) => x.type !== 'WARMUP')
				.map((x) => ({ weightKg: x.weightKg, reps: x.reps }))
		};
	});

	const prs = await db.personalRecord.findMany({
		where: { userId, exerciseId: exercise.id },
		orderBy: { achievedAt: 'desc' },
		select: { type: true, workoutId: true }
	});

	return {
		exercise: { ...exercise, custom: exercise.userId !== null },
		sessions,
		prWorkouts: [...new Set(prs.map((p) => p.workoutId))]
	};
};
