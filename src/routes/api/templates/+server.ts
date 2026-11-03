import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '#lib/server/db.ts';
import { assertUsableExercises, InputError } from '#lib/server/library.ts';
import { TemplateInput } from '#lib/server/validation.ts';
import type { RequestHandler } from './$types';

/** Create or replace a template (and optionally create its folder). */
export const POST: RequestHandler = async ({ locals, request }) => {
	const userId = locals.user!.id;
	const parsed = v.safeParse(TemplateInput, await request.json().catch(() => null));
	if (!parsed.success) error(400, parsed.issues[0]?.message ?? 'Invalid template');
	const t = parsed.output;

	const existing = await db.template.findUnique({ where: { id: t.id }, select: { userId: true } });
	if (existing && existing.userId !== userId) error(404, 'Template not found');

	try {
		await assertUsableExercises(
			userId,
			t.exercises.map((e) => e.exerciseId)
		);
	} catch (err) {
		if (err instanceof InputError) error(400, err.message);
		throw err;
	}

	let folderId = t.folderId;
	if (t.newFolderName) {
		const count = await db.folder.count({ where: { userId } });
		folderId = (
			await db.folder.create({ data: { userId, name: t.newFolderName, position: count } })
		).id;
	} else if (folderId) {
		const f = await db.folder.findFirst({ where: { id: folderId, userId }, select: { id: true } });
		if (!f) folderId = null;
	}

	const fields = { name: t.name, sessionType: t.sessionType, notes: t.notes, folderId };

	await db.$transaction([
		db.templateExercise.deleteMany({ where: { templateId: t.id, template: { userId } } }),
		db.template.upsert({
			where: { id: t.id },
			create: { id: t.id, userId, ...fields },
			update: fields
		}),
		...t.exercises.map((e, position) =>
			db.templateExercise.create({
				data: {
					templateId: t.id,
					exerciseId: e.exerciseId,
					position,
					restSec: e.restSec,
					notes: e.notes,
					sets: {
						create: e.sets.map((s, i) => ({
							position: i,
							type: s.type,
							targetWeightKg: s.targetWeightKg,
							targetReps: s.targetReps
						}))
					}
				}
			})
		)
	]);

	return json({ id: t.id, folderId });
};
