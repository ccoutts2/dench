/** Shared client/server shapes. Mirrors the Prisma enums without importing server code. */

export const SESSION_TYPES = ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER', 'FULL', 'OTHER'] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const MUSCLES = [
	'CHEST',
	'BACK',
	'SHOULDERS',
	'BICEPS',
	'TRICEPS',
	'FOREARMS',
	'QUADS',
	'HAMSTRINGS',
	'GLUTES',
	'CALVES',
	'ABS',
	'TRAPS',
	'FULL_BODY',
	'CARDIO'
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const EQUIPMENT = [
	'BARBELL',
	'DUMBBELL',
	'MACHINE',
	'CABLE',
	'BODYWEIGHT',
	'KETTLEBELL',
	'EZ_BAR',
	'SMITH_MACHINE',
	'BAND',
	'TRAP_BAR',
	'ASSISTED',
	'OTHER'
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const KINDS = [
	'WEIGHT_REPS',
	'BODYWEIGHT_REPS',
	'WEIGHTED_BODYWEIGHT',
	'ASSISTED_BODYWEIGHT',
	'DURATION',
	'DISTANCE_DURATION'
] as const;
export type ExerciseKind = (typeof KINDS)[number];

export const SET_TYPES = ['NORMAL', 'WARMUP', 'DROP', 'FAILURE'] as const;
export type SetType = (typeof SET_TYPES)[number];

export const MEASUREMENT_KINDS = [
	'BODYWEIGHT',
	'BODY_FAT',
	'CHEST',
	'WAIST',
	'HIPS',
	'NECK',
	'SHOULDERS',
	'LEFT_ARM',
	'RIGHT_ARM',
	'LEFT_THIGH',
	'RIGHT_THIGH',
	'LEFT_CALF',
	'RIGHT_CALF'
] as const;
export type MeasurementKind = (typeof MEASUREMENT_KINDS)[number];

export type LibraryExercise = {
	id: string;
	name: string;
	equipment: Equipment;
	primaryMuscle: Muscle;
	kind: ExerciseKind;
	/** true for the user's own custom exercises */
	custom: boolean;
};

/** Last logged sets for an exercise — powers the "previous" column. */
export type PreviousSet = { type: SetType; weightKg: number | null; reps: number | null };

export type Settings = {
	defaultRestSec: number;
	units: 'KG' | 'LB';
	barWeightKg: number;
	/** Plate sizes the user has, in kg, largest first. */
	plateSetKg: number[];
};

export type TemplateDTO = {
	id: string;
	name: string;
	sessionType: SessionType;
	folderId: string | null;
	notes: string | null;
	exercises: {
		exerciseId: string;
		restSec: number | null;
		notes: string | null;
		/** Adjacent exercises sharing a group run as a superset. */
		supersetGroup: string | null;
		sets: { type: SetType; targetWeightKg: number | null; targetReps: number | null }[];
	}[];
};

/** A workout as it travels from phone to server. */
export type WorkoutDTO = {
	id: string;
	templateId: string | null;
	name: string;
	sessionType: SessionType;
	notes: string | null;
	startedAt: string;
	finishedAt: string;
	exercises: {
		id: string;
		exerciseId: string;
		restSec: number | null;
		notes: string | null;
		supersetGroup: string | null;
		sets: {
			id: string;
			type: SetType;
			weightKg: number | null;
			reps: number | null;
			completedAt: string | null;
		}[];
	}[];
};

export const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replaceAll('_', ' ');

/** Session type → mesh hue key used by [data-session]. */
export function hueFor(type: SessionType): 'push' | 'pull' | 'legs' | null {
	if (type === 'PUSH' || type === 'UPPER') return 'push';
	if (type === 'PULL') return 'pull';
	if (type === 'LEGS' || type === 'LOWER') return 'legs';
	return null;
}

/** Working-set volume in kg (warm-ups excluded). */
export function volumeOf(sets: { type: SetType; weightKg: number | null; reps: number | null }[]) {
	return sets.reduce(
		(sum, s) => (s.type === 'WARMUP' ? sum : sum + (s.weightKg ?? 0) * (s.reps ?? 0)),
		0
	);
}

export function formatDuration(ms: number) {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	return h > 0
		? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
		: `${m}:${String(s).padStart(2, '0')}`;
}

export function formatVolume(kg: number) {
	return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`;
}
