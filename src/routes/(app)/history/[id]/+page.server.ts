import { db } from '#lib/server/db.ts';
import type { RecordType } from '#lib/records.ts';
import type { WorkoutDTO } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const w = await db.workout.findFirst({
		where: { id: params.id, userId: locals.user!.id, finishedAt: { not: null } },
		include: {
			exercises: {
				orderBy: { position: 'asc' },
				include: {
					exercise: { select: { name: true } },
					sets: { orderBy: { position: 'asc' } }
				}
			},
			personalRecords: true
		}
	});
	// Not on the server (yet): the page falls back to the copy on the phone.
	if (!w) return { workout: null };

	const dto: WorkoutDTO = {
		id: w.id,
		templateId: w.templateId,
		name: w.name,
		sessionType: w.sessionType,
		notes: w.notes,
		startedAt: w.startedAt.toISOString(),
		finishedAt: w.finishedAt!.toISOString(),
		exercises: w.exercises.map((e) => ({
			id: e.id,
			exerciseId: e.exerciseId,
			restSec: e.restSec,
			notes: e.notes,
			supersetGroup: e.supersetGroup,
			sets: e.sets.map((s) => ({
				id: s.id,
				type: s.type,
				weightKg: s.weightKg?.toNumber() ?? null,
				reps: s.reps,
				completedAt: s.completedAt?.toISOString() ?? null
			}))
		}))
	};
	return {
		workout: {
			...dto,
			exerciseNames: Object.fromEntries(w.exercises.map((e) => [e.exerciseId, e.exercise.name])),
			records: w.personalRecords.map((r) => ({
				exerciseId: r.exerciseId,
				setId: r.setId,
				type: r.type as RecordType
			}))
		}
	};
};
