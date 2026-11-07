import { db } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Monday-start week, for the streak strip.
	const now = new Date();
	const weekStart = new Date(now);
	weekStart.setHours(0, 0, 0, 0);
	weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

	const [workoutsThisWeek, folders, templates, lastWorkout] = await Promise.all([
		db.workout.findMany({
			where: { userId, startedAt: { gte: weekStart }, finishedAt: { not: null } },
			select: { startedAt: true }
		}),
		db.folder.findMany({ where: { userId }, orderBy: { position: 'asc' } }),
		db.template.findMany({
			where: { userId },
			orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
			include: {
				exercises: {
					orderBy: { position: 'asc' },
					include: {
						exercise: { select: { name: true, primaryMuscle: true, secondaryMuscles: true } },
						sets: { orderBy: { position: 'asc' } }
					}
				}
			}
		}),
		db.workout.findFirst({
			where: { userId, finishedAt: { not: null } },
			orderBy: { startedAt: 'desc' },
			include: { exercises: { include: { sets: true } } }
		})
	]);

	return {
		weekStart: weekStart.toISOString(),
		trainedDays: workoutsThisWeek.map((w) => (w.startedAt.getDay() + 6) % 7),
		folders: folders.map((f) => ({ id: f.id, name: f.name })),
		templates: templates.map((t) => ({
			id: t.id,
			name: t.name,
			sessionType: t.sessionType,
			progression: t.progression,
			folderId: t.folderId,
			lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
			exercises: t.exercises.map((e) => ({
				exerciseId: e.exerciseId,
				name: e.exercise.name,
				primaryMuscle: e.exercise.primaryMuscle,
				secondaryMuscles: e.exercise.secondaryMuscles,
				restSec: e.restSec,
				notes: e.notes,
				supersetGroup: e.supersetGroup,
				sets: e.sets.map((s) => ({
					type: s.type,
					targetWeightKg: s.targetWeightKg?.toNumber() ?? null,
					targetReps: s.targetReps
				}))
			}))
		})),
		lastWorkout: lastWorkout && {
			id: lastWorkout.id,
			name: lastWorkout.name,
			startedAt: lastWorkout.startedAt.toISOString(),
			durationMs: lastWorkout.finishedAt!.getTime() - lastWorkout.startedAt.getTime(),
			volumeKg: lastWorkout.exercises
				.flatMap((e) => e.sets)
				.reduce(
					(sum, s) =>
						s.type === 'WARMUP' ? sum : sum + (s.weightKg?.toNumber() ?? 0) * (s.reps ?? 0),
					0
				),
			sets: lastWorkout.exercises.flatMap((e) => e.sets).length
		}
	};
};
