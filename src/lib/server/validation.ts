import * as v from 'valibot';
import {
	EQUIPMENT,
	KINDS,
	MEASUREMENT_KINDS,
	MUSCLES,
	SESSION_TYPES,
	SET_TYPES
} from '#lib/types.ts';

const uuid = v.pipe(v.string(), v.uuid());
const name = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80));
const notes = v.nullable(v.pipe(v.string(), v.maxLength(2000)));
const weight = v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(2000)));
const reps = v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1000)));
const restSec = v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(3600)));
const isoDate = v.pipe(v.string(), v.isoTimestamp());
const supersetGroup = v.optional(v.nullable(v.pipe(v.string(), v.maxLength(40))), null);

export const ExerciseInput = v.object({
	id: uuid,
	name,
	equipment: v.picklist(EQUIPMENT),
	primaryMuscle: v.picklist(MUSCLES),
	kind: v.picklist(KINDS)
});

export const TemplateInput = v.object({
	id: uuid,
	name,
	sessionType: v.picklist(SESSION_TYPES),
	folderId: v.nullable(v.string()),
	/** Create a new folder with this name instead of using folderId. */
	newFolderName: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(60)))),
	notes,
	exercises: v.pipe(
		v.array(
			v.object({
				exerciseId: v.string(),
				restSec,
				notes,
				supersetGroup,
				sets: v.pipe(
					v.array(
						v.object({
							type: v.picklist(SET_TYPES),
							targetWeightKg: weight,
							targetReps: reps
						})
					),
					v.maxLength(30)
				)
			})
		),
		v.maxLength(40)
	)
});

export const WorkoutInput = v.object({
	id: uuid,
	templateId: v.nullable(v.string()),
	name,
	sessionType: v.picklist(SESSION_TYPES),
	notes,
	startedAt: isoDate,
	finishedAt: isoDate,
	exercises: v.pipe(
		v.array(
			v.object({
				id: uuid,
				exerciseId: v.string(),
				restSec,
				notes,
				supersetGroup,
				sets: v.pipe(
					v.array(
						v.object({
							id: uuid,
							type: v.picklist(SET_TYPES),
							weightKg: weight,
							reps,
							completedAt: v.nullable(isoDate)
						})
					),
					v.maxLength(50)
				)
			})
		),
		v.maxLength(60)
	)
});

export const MeasurementInput = v.object({
	id: uuid,
	kind: v.picklist(MEASUREMENT_KINDS),
	value: v.pipe(v.number(), v.minValue(0.1), v.maxValue(1000)),
	measuredAt: isoDate
});

export const SyncInput = v.object({
	ops: v.pipe(
		v.array(
			v.object({
				id: v.string(),
				type: v.picklist([
					'workout.save',
					'workout.delete',
					'exercise.upsert',
					'measurement.save',
					'measurement.delete'
				]),
				payload: v.unknown()
			})
		),
		v.maxLength(50)
	)
});
