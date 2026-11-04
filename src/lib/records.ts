/**
 * Personal-record rules, shared by the phone (instant PRs on the summary screen,
 * even offline) and the server (the stored source of truth).
 *
 * Warm-ups never count. A lift's first session sets the baseline, so it isn't a PR.
 */
import type { SetType } from './types.ts';

export const RECORD_TYPES = ['EST_1RM', 'HEAVIEST_WEIGHT', 'BEST_SET_VOLUME', 'MOST_REPS'] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

/** Best value so far for each record type, for one exercise. */
export type Bests = Partial<Record<RecordType, number>>;

export type SetLike = { id?: string; type: SetType; weightKg: number | null; reps: number | null };

export type RecordHit = {
	type: RecordType;
	value: number;
	setId: string | null;
	weightKg: number | null;
	reps: number | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Epley estimate. Only trusted up to 12 reps; beyond that it overshoots badly. */
export function e1rm(weightKg: number | null, reps: number | null): number | null {
	if (!weightKg || weightKg <= 0 || !reps || reps < 1 || reps > 12) return null;
	return round2(reps === 1 ? weightKg : weightKg * (1 + reps / 30));
}

/** What a single set scores on each record type. Bodyweight sets only count for reps. */
export function setValues(s: SetLike): Bests {
	if (s.type === 'WARMUP' || !s.reps || s.reps < 1) return {};
	const w = s.weightKg ?? 0;
	if (w <= 0) return { MOST_REPS: s.reps };
	const out: Bests = { HEAVIEST_WEIGHT: w, BEST_SET_VOLUME: round2(w * s.reps) };
	const est = e1rm(w, s.reps);
	if (est !== null) out.EST_1RM = est;
	return out;
}

/** The best set of a session for each record type. */
export function sessionBests(sets: SetLike[]): Map<RecordType, RecordHit> {
	const out = new Map<RecordType, RecordHit>();
	for (const s of sets) {
		for (const [type, value] of Object.entries(setValues(s)) as [RecordType, number][]) {
			const cur = out.get(type);
			if (!cur || value > cur.value) {
				out.set(type, { type, value, setId: s.id ?? null, weightKg: s.weightKg, reps: s.reps });
			}
		}
	}
	return out;
}

/** Records this session breaks, measured against everything before it. */
export function detectRecords(sets: SetLike[], prior: Bests | undefined): RecordHit[] {
	if (!prior) return [];
	return [...sessionBests(sets).values()].filter((h) => {
		const before = prior[h.type];
		return before !== undefined && h.value > before + 1e-9;
	});
}

export function mergeBests(prior: Bests | undefined, sets: SetLike[]): Bests {
	const out: Bests = { ...prior };
	for (const h of sessionBests(sets).values()) {
		if (out[h.type] === undefined || h.value > out[h.type]!) out[h.type] = h.value;
	}
	return out;
}

/** Most impressive first: used to pick the one PR to headline per exercise. */
export const RECORD_PRIORITY: RecordType[] = [
	'EST_1RM',
	'HEAVIEST_WEIGHT',
	'BEST_SET_VOLUME',
	'MOST_REPS'
];

export function headline<T extends { type: RecordType }>(hits: T[]): T | undefined {
	return [...hits].sort(
		(a, b) => RECORD_PRIORITY.indexOf(a.type) - RECORD_PRIORITY.indexOf(b.type)
	)[0];
}

/** "est. 1RM 104.5 kg", "heaviest 92.5 kg × 3", … `w` formats a kg value (to `dp` decimals). */
export function describeRecord(h: RecordHit, w: (kg: number, dp?: number) => string): string {
	switch (h.type) {
		case 'EST_1RM':
			return `est. 1RM ${w(h.value, 1)}`;
		case 'HEAVIEST_WEIGHT':
			return `heaviest ${w(h.value)} × ${h.reps}`;
		case 'BEST_SET_VOLUME':
			return `best set ${w(h.weightKg ?? 0)} × ${h.reps}`;
		case 'MOST_REPS':
			return `${h.reps} reps`;
	}
}
