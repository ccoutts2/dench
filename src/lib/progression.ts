/**
 * Progression suggestions (double progression), worked out on the phone from
 * the last session's sets, so it works offline.
 *
 * - Hit the target reps on every working set last time → add weight, same reps.
 * - Missed any → same weight, go for the target again.
 * - Bodyweight moves add a rep instead of weight.
 * - No target reps on the template → the best set from last time is the target.
 *
 * Single rep targets only, not ranges. Warm-up and drop sets are left alone.
 */
import { loadBar } from './plates.ts';
import type { Equipment, ExerciseKind, Muscle, SetType } from './types.ts';

type TemplateSet = { type: SetType; targetWeightKg: number | null; targetReps: number | null };
type LoggedSet = { type: SetType; weightKg: number | null; reps: number | null };

export type ProgressionExercise = {
	name: string;
	equipment: Equipment;
	primaryMuscle: Muscle;
	kind: ExerciseKind;
};

export type ProgressionContext = {
	system: 'KG' | 'LB';
	barWeightKg: number;
	plateSetKg: number[];
	/** Formats a kg amount in the user's unit, e.g. "2.5 kg" / "5 lb". */
	fmt: (kg: number) => string;
};

export type Suggestion = {
	/** Same length and order as the template sets; warm-ups keep their targets. */
	sets: { targetWeightKg: number | null; targetReps: number | null }[];
	direction: 'up' | 'hold';
	/** One plain line for the workout screen. */
	note: string;
};

const LB = 0.45359237;
const working = (t: SetType) => t === 'NORMAL' || t === 'FAILURE';
const round2 = (n: number) => Math.round(n * 100) / 100;

const LOWER = new Set<Muscle>(['QUADS', 'HAMSTRINGS', 'GLUTES']);
const isLowerBody = (ex: ProgressionExercise) =>
	LOWER.has(ex.primaryMuscle) || /deadlift/i.test(ex.name) || ex.equipment === 'TRAP_BAR';

const BARBELLS = new Set<Equipment>(['BARBELL', 'TRAP_BAR', 'EZ_BAR', 'SMITH_MACHINE']);

/** The smallest sensible jump for this kit, in kg. */
export function increment(ex: ProgressionExercise, system: 'KG' | 'LB'): number {
	const kg = system === 'KG';
	if (BARBELLS.has(ex.equipment)) {
		if (isLowerBody(ex)) return kg ? 5 : 10 * LB;
		return kg ? 2.5 : 5 * LB;
	}
	if (ex.equipment === 'DUMBBELL') return kg ? 2 : 5 * LB;
	if (ex.equipment === 'KETTLEBELL') return kg ? 4 : 10 * LB;
	return kg ? 2.5 : 5 * LB;
}

/**
 * Round up to a weight the user can actually load on a bar with their plates.
 * Works in the user's own unit, so 135 lb + 5 lb lands on 140 lb exactly.
 */
function loadable(totalKg: number, ctx: ProgressionContext): number {
	const per = ctx.system === 'KG' ? 1 : LB;
	const inUnit = (kg: number) => Math.round((kg / per) * 100) / 100;
	const plates = ctx.plateSetKg.filter((p) => p > 0).map(inUnit);
	const total = inUnit(totalKg);
	const bar = inUnit(ctx.barWeightKg);
	if (!plates.length || total <= bar) return round2(totalKg);
	const fit = loadBar(total, bar, plates);
	const loaded = fit.short < 0.1 ? fit.loaded : fit.loaded + 2 * Math.min(...plates);
	return round2(loaded * per);
}

function repsLabel(targets: number[]) {
	return targets.every((t) => t === targets[0]) ? `all your ${targets[0]}s` : 'every target';
}

export function suggest(
	template: TemplateSet[],
	previous: LoggedSet[] | undefined,
	ex: ProgressionExercise,
	ctx: ProgressionContext
): Suggestion | null {
	if (
		ex.kind === 'ASSISTED_BODYWEIGHT' ||
		ex.kind === 'DURATION' ||
		ex.kind === 'DISTANCE_DURATION'
	)
		return null;

	const last = (previous ?? []).filter((s) => working(s.type) && (s.reps ?? 0) > 0);
	const slots = template.map((s, i) => ({ s, i })).filter(({ s }) => working(s.type));
	if (!last.length || !slots.length) return null;

	const bestReps = Math.max(...last.map((s) => s.reps ?? 0));
	const weighted =
		ex.kind !== 'BODYWEIGHT_REPS' && last.every((s) => s.weightKg !== null && s.weightKg > 0);

	// Line each template working set up with the same set from last time.
	const pairs = slots.map(({ s, i }, k) => ({
		i,
		target: s.targetReps ?? bestReps,
		prev: last[k] as LoggedSet | undefined
	}));
	const hitAll = pairs.every((p) => p.prev && (p.prev.reps ?? 0) >= p.target);
	const targets = pairs.map((p) => p.target);
	const goal = targets.every((t) => t === targets[0]) ? `${targets[0]}s` : 'your target reps';

	const sets = template.map((s) => ({
		targetWeightKg: s.targetWeightKg,
		targetReps: s.targetReps
	}));

	if (!weighted) {
		for (const p of pairs) {
			const done = p.prev?.reps ?? last.at(-1)!.reps!;
			sets[p.i] = {
				targetWeightKg: null,
				targetReps: hitAll ? Math.max(done, p.target) + 1 : p.target
			};
		}
		return hitAll
			? { sets, direction: 'up', note: `One more rep: you hit ${repsLabel(targets)} last time` }
			: { sets, direction: 'hold', note: `Same again: go for ${goal}` };
	}

	const step = increment(ex, ctx.system);
	const plates = ex.equipment === 'BARBELL' || ex.equipment === 'TRAP_BAR';
	let jump = 0;
	for (const p of pairs) {
		const base = (p.prev ?? last.at(-1)!).weightKg!;
		const next = hitAll ? (plates ? loadable(base + step, ctx) : round2(base + step)) : base;
		jump ||= next - base;
		sets[p.i] = { targetWeightKg: next, targetReps: p.target };
	}

	if (!hitAll) {
		return { sets, direction: 'hold', note: `Same weight: go for ${goal} again` };
	}
	return {
		sets,
		direction: 'up',
		note: `Up ${ctx.fmt(jump)}: you hit ${repsLabel(targets)} last time`
	};
}
