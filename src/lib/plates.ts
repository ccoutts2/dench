/** Plate calculator: which plates go on each side of the bar. */

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

const LB = 0.45359237;
/** Standard pound plates, stored in kg like everything else. */
export const DEFAULT_PLATES_LB_AS_KG = [45, 35, 25, 10, 5, 2.5].map(
	(p) => Math.round(p * LB * 100) / 100
);

/** Sizes offered in the profile editor, per unit system (in that unit). */
export const PLATE_CHOICES = {
	KG: [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5],
	LB: [55, 45, 35, 25, 15, 10, 5, 2.5]
} as const;

export type PlateLoad = {
	/** Plates for one side, largest first, in the same unit as the inputs. */
	perSide: number[];
	/** What the bar actually weighs with those plates. */
	loaded: number;
	/** total − loaded: > 0 when the plates can't make the exact weight. */
	short: number;
};

/**
 * Greedy fill per side, which is exact for any normal plate set. Values are in
 * whatever single unit the caller uses (kg or lb), with plates assumed in pairs.
 */
export function loadBar(total: number, bar: number, plates: number[]): PlateLoad {
	const sizes = [...new Set(plates)].filter((p) => p > 0).sort((a, b) => b - a);
	let side = Math.max(0, (total - bar) / 2);
	const perSide: number[] = [];
	for (const p of sizes) {
		while (side + 1e-6 >= p) {
			perSide.push(p);
			side -= p;
		}
	}
	const loaded = round(bar + perSide.reduce((a, b) => a + b, 0) * 2);
	return { perSide, loaded, short: round(Math.max(0, total - loaded)) };
}

const round = (n: number) => Math.round(n * 100) / 100;
