<script lang="ts">
	/**
	 * The landing page's live demo: one exercise card that behaves like the real
	 * thing. Tick a set and the rest ring starts (compressed to a few seconds);
	 * the third set beats last week and earns a PR.
	 */
	import { onMount } from 'svelte';

	type DemoSet = { prev: string; kg: number; reps: number; done: boolean };
	let sets = $state<DemoSet[]>([
		{ prev: '80 × 8', kg: 80, reps: 8, done: true },
		{ prev: '80 × 8', kg: 82.5, reps: 8, done: false },
		{ prev: '80 × 7', kg: 82.5, reps: 8, done: false }
	]);

	const REST_MS = 6000;
	let restEnds = $state<number | null>(null);
	let now = $state(Date.now());
	let pr = $state(false);

	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 100);
		return () => clearInterval(id);
	});

	const restLeft = $derived(restEnds ? Math.max(0, restEnds - now) : 0);
	$effect(() => {
		if (restEnds && restLeft === 0) restEnds = null;
	});

	function tick(j: number) {
		const s = sets[j];
		s.done = !s.done;
		if (!s.done) return;
		dispatchEvent(new CustomEvent('dench:pulse', { detail: { strong: j === 2 } }));
		if (j === 2) pr = true;
		restEnds = j < 2 ? Date.now() + REST_MS : null;
	}

	function reset() {
		sets.forEach((s, j) => (s.done = j === 0));
		pr = false;
		restEnds = null;
	}

	const allDone = $derived(sets.every((s) => s.done));
</script>

<div class="glass p-4 glass-strong sm:p-5">
	<div class="mb-1 flex items-center justify-between gap-3">
		<p class="text-gradient font-semibold">Bench Press (Barbell)</p>
		{#if restEnds}
			<span class="flex items-center gap-2 text-sm" aria-live="polite">
				<span
					class="size-6 rounded-full"
					style="background: conic-gradient(from -90deg, var(--color-violet), var(--color-cyan) {(restLeft /
						REST_MS) *
						360}deg, rgb(255 255 255 / 0.1) 0); mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px)); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));"
				></span>
				<span class="num font-bold text-cyan">0:0{Math.ceil(restLeft / 1000)}</span>
			</span>
		{:else if pr}
			<span
				class="pr-card rounded-full bg-ember/15 px-2.5 py-1 text-xs font-semibold text-ember"
				aria-live="polite"><span class="pr-star">★</span> New PR</span
			>
		{/if}
	</div>
	<p class="mb-4 text-sm text-ink-3">
		{allDone ? 'Est. 1RM up from 101.3 to 104.5 kg.' : 'Tick each set as you finish it.'}
	</p>

	<div
		class="grid grid-cols-[1.75rem_minmax(0,1fr)_3.75rem_3rem_2.75rem] items-center gap-x-2 gap-y-2 text-center"
	>
		<span class="text-xs text-ink-3">Set</span>
		<span class="text-xs text-ink-3">Last week</span>
		<span class="text-xs text-ink-3">kg</span>
		<span class="text-xs text-ink-3">Reps</span>
		<span></span>
		{#each sets as s, j (j)}
			<span class="num text-sm font-bold text-ink-2">{j + 1}</span>
			<span class="truncate num text-xs text-ink-3">{s.prev}</span>
			<span
				class={[
					'grid h-10 place-items-center rounded-xl num',
					s.done ? 'font-bold' : 'bg-white/[0.06]'
				]}>{s.kg}</span
			>
			<span
				class={[
					'grid h-10 place-items-center rounded-xl num',
					s.done ? 'font-bold' : 'bg-white/[0.06]'
				]}>{s.reps}</span
			>
			<button
				class={[
					'tick relative h-10 rounded-xl text-sm font-bold transition',
					s.done ? 'is-done text-night bg-primary-gradient' : 'bg-white/[0.08] text-ink-3'
				]}
				aria-label={s.done ? `Untick set ${j + 1}` : `Tick set ${j + 1}`}
				aria-pressed={s.done}
				onclick={() => tick(j)}>✓</button
			>
		{/each}
	</div>

	{#if allDone}
		<button class="mt-4 text-sm font-semibold text-cyan" onclick={reset}>Try it again</button>
	{/if}
</div>

<style>
	.tick.is-done::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow: 0 0 0 0 rgb(62 230 255 / 0.6);
		animation: bloom 0.6s ease-out;
	}
	@keyframes bloom {
		to {
			box-shadow: 0 0 0 14px rgb(62 230 255 / 0);
		}
	}
</style>
