import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '#lib/server/db.ts';
import { assertUsableExercises, InputError } from '#lib/server/library.ts';
import { ExerciseInput, SyncInput, WorkoutInput } from '#lib/server/validation.ts';
import type { RequestHandler } from './$types';

/**
 * Applies a batch of queued changes from the phone. Every op is idempotent
 * (keyed by client-generated ids), so retries after a dropped connection are safe.
 *
 * Response: `done` ops can be removed from the outbox; `rejected` ops are
 * permanently invalid and should be dropped too. Any thrown error is a 500 and
 * the client retries the whole batch later.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const userId = locals.user!.id;
	const body = v.safeParse(SyncInput, await request.json().catch(() => null));
	if (!body.success) error(400, 'Invalid sync batch');

	const done: string[] = [];
	const rejected: { id: string; reason: string }[] = [];

	for (const op of body.output.ops) {
		try {
			if (op.type === 'exercise.upsert') await upsertExercise(userId, op.payload);
			else if (op.type === 'workout.delete') await deleteWorkout(userId, op.payload);
			else await saveWorkout(userId, op.payload);
			done.push(op.id);
		} catch (err) {
			if (err instanceof InputError || err instanceof v.ValiError) {
				rejected.push({ id: op.id, reason: err.message });
			} else {
				throw err;
			}
		}
	}

	return json({ done, rejected });
};

async function upsertExercise(userId: string, payload: unknown) {
	const e = v.parse(ExerciseInput, payload);
	const existing = await db.exercise.findUnique({ where: { id: e.id }, select: { userId: true } });
	if (existing && existing.userId !== userId) throw new InputError('Not your exercise');
	const data = {
		name: e.name,
		equipment: e.equipment,
		primaryMuscle: e.primaryMuscle,
		kind: e.kind
	};
	await db.exercise.upsert({
		where: { id: e.id },
		create: { id: e.id, userId, secondaryMuscles: [], ...data },
		update: data
	});
}

/** Idempotent: deleting something already gone (or never synced) is a no-op. */
async function deleteWorkout(userId: string, payload: unknown) {
	const { id } = v.parse(v.object({ id: v.string() }), payload);
	await db.workout.deleteMany({ where: { id, userId } });
}

async function saveWorkout(userId: string, payload: unknown) {
	const w = v.parse(WorkoutInput, payload);

	const existing = await db.workout.findUnique({ where: { id: w.id }, select: { userId: true } });
	if (existing && existing.userId !== userId) throw new InputError('Not your workout');
	await assertUsableExercises(
		userId,
		w.exercises.map((e) => e.exerciseId)
	);

	let templateId = w.templateId;
	if (templateId) {
		const t = await db.template.findFirst({
			where: { id: templateId, userId },
			select: { id: true }
		});
		if (!t) templateId = null; // template deleted since; keep the workout
	}

	const fields = {
		templateId,
		name: w.name,
		sessionType: w.sessionType,
		notes: w.notes,
		startedAt: new Date(w.startedAt),
		finishedAt: new Date(w.finishedAt)
	};

	await db.$transaction([
		// Replace children so a re-sent or edited workout converges to the latest snapshot.
		db.workoutExercise.deleteMany({ where: { workoutId: w.id, workout: { userId } } }),
		db.workout.upsert({
			where: { id: w.id },
			create: { id: w.id, userId, ...fields },
			update: fields
		}),
		...w.exercises.map((e, position) =>
			db.workoutExercise.create({
				data: {
					id: e.id,
					workoutId: w.id,
					exerciseId: e.exerciseId,
					position,
					restSec: e.restSec,
					notes: e.notes,
					sets: {
						create: e.sets.map((s, i) => ({
							id: s.id,
							position: i,
							type: s.type,
							weightKg: s.weightKg,
							reps: s.reps,
							completed: s.completedAt !== null,
							completedAt: s.completedAt ? new Date(s.completedAt) : null
						}))
					}
				}
			})
		),
		...(templateId
			? [
					db.template.update({
						where: { id: templateId },
						data: { lastUsedAt: new Date(w.finishedAt) }
					})
				]
			: [])
	]);
}
