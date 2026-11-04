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

export type Scale = { high: number; mid: number; unit: string };

/** One session: High ≥ 6 effective sets, Moderate ≥ 3. */
export const SESSION_SCALE: Scale = { high: 6, mid: 3, unit: 'sets' };
/** Weekly average: ~10+ hard sets a week is the usual target for growth. */
export const WEEKLY_SCALE: Scale = { high: 10, mid: 5, unit: 'sets/wk' };

export function levelOf(sets: number | undefined, scale: Scale = SESSION_SCALE): Level {
	if (!sets) return 'none';
	if (sets >= scale.high) return 'high';
	if (sets >= scale.mid) return 'mid';
	return 'low';
}

/** Opposing groups worth keeping in proportion. */
const PAIRS: [MapMuscle, MapMuscle][] = [
	['CHEST', 'BACK'],
	['QUADS', 'HAMSTRINGS'],
	['BICEPS', 'TRICEPS']
];

/**
 * Plain-language notes on imbalances: a pair where one side gets 1.5× the
 * other (and enough volume to matter), plus big groups not trained at all.
 */
export function balanceNotes(load: MuscleLoad, scale: Scale = WEEKLY_SCALE): string[] {
	const notes: string[] = [];
	const name = (m: MapMuscle) => m.charAt(0) + m.slice(1).toLowerCase();
	const n = (v: number) => +v.toFixed(1);
	for (const [a, b] of PAIRS) {
		const va = load[a] ?? 0;
		const vb = load[b] ?? 0;
		const [hi, lo, vhi, vlo] = va >= vb ? [a, b, va, vb] : [b, a, vb, va];
		if (vhi >= scale.mid && vhi >= vlo * 1.5) {
			notes.push(
				`${name(lo)} is lagging ${name(hi).toLowerCase()}: ${n(vlo)} vs ${n(vhi)} ${scale.unit}`
			);
		}
	}
	const total = Object.values(load).reduce((s, v) => s + (v ?? 0), 0);
	if (total > 0) {
		const missed = (
			['CHEST', 'BACK', 'SHOULDERS', 'QUADS', 'HAMSTRINGS', 'GLUTES'] as const
		).filter((m) => !load[m]);
		if (missed.length) notes.push(`Not trained: ${missed.map(name).join(', ')}`);
	}
	return notes;
}

export const LEVEL_LABEL: Record<Exclude<Level, 'none'>, string> = {
	high: 'High',
	mid: 'Moderate',
	low: 'Low'
};
