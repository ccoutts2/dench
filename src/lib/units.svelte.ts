/**
 * Weight display. Everything is stored in kg; this converts at the edges
 * (inputs and labels) when the user prefers pounds.
 *
 * The app layout sets `units.system` from server data on every render, and from
 * the IndexedDB settings when offline. On the server that render is synchronous,
 * so one request's value can't leak into another's output.
 */
const KG_PER_LB = 0.45359237;

const trim = (n: number, dp: number) => Number(n.toFixed(dp));

class Units {
	system = $state<'KG' | 'LB'>('KG');

	get label() {
		return this.system === 'KG' ? 'kg' : 'lb';
	}

	/** kg → number in the user's unit (null passes through). */
	show(kg: number | null, dp?: number): number | null {
		if (kg === null) return null;
		return this.system === 'KG' ? trim(kg, dp ?? 2) : trim(kg / KG_PER_LB, dp ?? 1);
	}

	/** number typed in the user's unit → kg for storage. */
	toKg(value: number | null): number | null {
		if (value === null) return null;
		return this.system === 'KG' ? trim(value, 2) : trim(value * KG_PER_LB, 2);
	}

	/** "82.5 kg" / "182 lb" */
	fmt(kg: number, dp?: number): string {
		return `${this.show(kg, dp)} ${this.label}`;
	}

	/** Session volume: "8,210 kg" / "9.8t" style, in the user's unit. */
	volume(kg: number): string {
		const v = this.system === 'KG' ? kg : kg / KG_PER_LB;
		if (this.system === 'KG' && v >= 1000) return `${(v / 1000).toFixed(1)}t`;
		return `${Math.round(v).toLocaleString('en-GB')} ${this.label}`;
	}
}

export const units = new Units();
