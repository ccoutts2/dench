import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	const folders = await db.folder.findMany({ where: { userId }, orderBy: { position: 'asc' } });

	if (params.id === 'new') {
		return { folders: folders.map((f) => ({ id: f.id, name: f.name })), template: null };
	}

	const t = await db.template.findFirst({
		where: { id: params.id, userId },
		include: {
			exercises: {
				orderBy: { position: 'asc' },
				include: {
					exercise: { select: { name: true, primaryMuscle: true, secondaryMuscles: true } },
					sets: { orderBy: { position: 'asc' } }
				}
			}
		}
	});
	if (!t) error(404, 'Template not found');

	return {
		folders: folders.map((f) => ({ id: f.id, name: f.name })),
		template: {
			id: t.id,
			name: t.name,
			sessionType: t.sessionType,
			folderId: t.folderId,
			notes: t.notes,
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
		}
	};
};
