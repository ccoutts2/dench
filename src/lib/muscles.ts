/**
 * Muscle load for the body map: how hard each muscle group was hit across a
 * workout or template.
 *
 * Each working set counts 1 for the exercise's primary muscle and 0.5 for each
 * secondary. Warm-ups don't count. Levels are absolute set counts, so a muscle
 * you only touched in passing shows as Low rather than looking maxed out.
 */
import type { Muscle, SetType } from './types.ts';

/** Muscles drawn on the body map. FULL_BODY spreads across these; CARDIO isn't drawn. */
export const MAP_MUSCLES = [
	'CHEST',
	'BACK',
	'SHOULDERS',
	'TRAPS',
	'BICEPS',
	'TRICEPS',
	'FOREARMS',
	'ABS',
	'GLUTES',
	'QUADS',
	'HAMSTRINGS',
	'CALVES'
] as const satisfies readonly Muscle[];
export type MapMuscle = (typeof MAP_MUSCLES)[number];

export type MuscleLoad = Partial<Record<MapMuscle, number>>;
export type Level = 'high' | 'mid' | 'low' | 'none';

export type LoadItem = {
	primaryMuscle: Muscle;
	secondaryMuscles?: Muscle[] | null;
	sets: { type: SetType }[];
};

const SECONDARY = 0.5;
const FULL_BODY = 0.25;

const isMapped = (m: Muscle): m is MapMuscle => (MAP_MUSCLES as readonly Muscle[]).includes(m);

export function muscleLoad(items: LoadItem[]): MuscleLoad {
	const load: MuscleLoad = {};
	const add = (m: Muscle, n: number) => {
		if (m === 'FULL_BODY') for (const k of MAP_MUSCLES) load[k] = (load[k] ?? 0) + n * FULL_BODY;
		else if (isMapped(m)) load[m] = (load[m] ?? 0) + n;
	};
	for (const item of items) {
		const sets = item.sets.filter((s) => s.type !== 'WARMUP').length;
		if (!sets) continue;
		add(item.primaryMuscle, sets);
		for (const m of item.secondaryMuscles ?? []) {
			if (m !== item.primaryMuscle) add(m, sets * SECONDARY);
		}
	}
	return load;
}

/** High ≥ 6 effective sets, Moderate ≥ 3, Low for anything less. */
export function levelOf(sets: number | undefined): Level {
	if (!sets) return 'none';
	if (sets >= 6) return 'high';
	if (sets >= 3) return 'mid';
	return 'low';
}

export const LEVEL_LABEL: Record<Exclude<Level, 'none'>, string> = {
	high: 'High',
	mid: 'Moderate',
	low: 'Low'
};
