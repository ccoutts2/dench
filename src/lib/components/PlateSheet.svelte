<script lang="ts">
	import Sheet from './Sheet.svelte';
	import { getSettings } from '#lib/local/db.ts';
	import { loadBar } from '#lib/plates.ts';
	import { units } from '#lib/units.svelte.ts';
	import type { Settings } from '#lib/types.ts';

	let { open = $bindable(false), initialKg = null }: { open?: boolean; initialKg?: number | null } =
		$props();

	let settings = $state<Settings | null>(null);
	let total = $state('');

	// Each time the sheet opens: fresh settings, and the weight of the set in hand.
	$effect(() => {
		if (!open) return;
		void getSettings().then((s) => (settings = s));
		total = initialKg !== null ? String(units.show(initialKg)) : '';
	});

	const bar = $derived(settings ? units.show(settings.barWeightKg)! : 0);
	const plates = $derived(settings ? settings.plateSetKg.map((p) => units.show(p)!) : []);
	const totalNum = $derived(Number(total.replace(',', '.')));
	const result = $derived(
		settings && total.trim() !== '' && totalNum > 0 ? loadBar(totalNum, bar, plates) : null
	);

	/** Plate height relative to the biggest plate, so the picture reads at a glance. */
	const biggest = $derived(Math.max(...plates, 1));
	const PLATE_COLOURS = ['bg-violet', 'bg-cyan', 'bg-magenta', 'bg-ember', 'bg-ink-2'];
	const colourFor = (p: number) => PLATE_COLOURS[plates.indexOf(p) % PLATE_COLOURS.length];
</script>

<Sheet bind:open title="Plate calculator">
	<label class="mt-2 flex items-baseline gap-2">
		<span class="sr-only">Total weight ({units.label})</span>
		<input
			class="w-40 min-w-0 rounded-2xl bg-white/[0.06] px-4 py-3 text-center font-display text-4xl font-extrabold focus:bg-white/10 focus:outline-none"
			inputmode="decimal"
			placeholder="0"
			bind:value={total}
		/>
		<span class="text-sm text-ink-2">{units.label} total · {bar} {units.label} bar</span>
	</label>

	{#if result}
		<div
			class="mt-6 flex h-28 items-center justify-center gap-[3px] rounded-2xl bg-white/[0.03] px-3"
			aria-hidden="true"
		>
			<span class="h-2 w-10 shrink-0 rounded-l-sm bg-ink-3"></span>
			{#each result.perSide as p, k (k)}
				<span
					class={['w-3.5 shrink-0 rounded-[3px]', colourFor(p)]}
					style:height="{28 + (p / biggest) * 68}%"
				></span>
			{/each}
			<span class="h-4 w-2 shrink-0 rounded-sm bg-ink-2"></span>
			<span class="h-2 flex-1 bg-ink-3"></span>
		</div>

		<p class="mt-4 text-center text-lg font-semibold">
			{#if result.perSide.length}
				Each side: <span class="num">{result.perSide.join(' + ')}</span>
			{:else}
				Just the bar
			{/if}
		</p>
		{#if result.short > 0}
			<p class="mt-1 text-center text-sm text-ember">
				Closest you can load is <span class="num">{result.loaded} {units.label}</span>
				({result.short}
				{units.label} short)
			</p>
		{/if}
	{:else}
		<p class="mt-6 text-center text-sm text-ink-3">Enter a total to see the plates.</p>
	{/if}

	<p class="mt-6 text-center text-xs text-ink-3">Change the bar and plates you own in Profile.</p>
</Sheet>
