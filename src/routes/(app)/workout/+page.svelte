<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ExercisePicker from '#lib/components/ExercisePicker.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import { live } from '#lib/local/live.svelte.ts';
	import type { LiveExercise } from '#lib/local/db.ts';
	import { unlockAudio } from '#lib/chime.ts';
	import { SESSION_TYPES, formatDuration, hueFor, label } from '#lib/types.ts';

	let now = $state(Date.now());
	let pickerOpen = $state(false);
	let menuFor = $state<number | null>(null);
	let menuOpen = $state(false);
	let finishOpen = $state(false);
	let deleting = $state<string | null>(null);
	let finishing = $state(false);

	const w = $derived(live.workout);
	const elapsed = $derived(w ? now - new Date(w.startedAt).getTime() : 0);
	const unticked = $derived(
		w?.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.completedAt).length, 0) ?? 0
	);
	const ticked = $derived(
		w?.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completedAt).length, 0) ?? 0
	);

	// No workout in progress (e.g. opened /workout directly): go home.
	$effect(() => {
		if (live.loaded && !live.workout && !finishing)
			void goto(resolve('/(app)'), { replaceState: true });
	});

	$effect(() => {
		const hue = w ? hueFor(w.sessionType) : null;
		if (hue) document.documentElement.dataset.session = hue;
		else delete document.documentElement.dataset.session;
		return () => {
			delete document.documentElement.dataset.session;
		};
	});

	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 1000);

		// Keep the screen on mid-set (Safari 18.4+). The lock drops when the app is
		// backgrounded, so take it again on return.
		let lock: WakeLockSentinel | null = null;
		const acquire = async () => {
			try {
				if (document.visibilityState === 'visible')
					lock = await navigator.wakeLock?.request('screen');
			} catch {
				// unsupported or denied: fine
			}
		};
		void acquire();
		document.addEventListener('visibilitychange', acquire);

		return () => {
			clearInterval(id);
			document.removeEventListener('visibilitychange', acquire);
			void lock?.release();
		};
	});

	/** "1, 2, 3" for working sets, "W" for warm-ups. */
	function setLabel(ex: LiveExercise, j: number) {
		if (ex.sets[j].type === 'WARMUP') return 'W';
		return String(ex.sets.slice(0, j + 1).filter((s) => s.type !== 'WARMUP').length);
	}

	function prevText(ex: LiveExercise, j: number) {
		const p = live.previousFor(ex, j);
		if (!p || (p.weightKg === null && p.reps === null)) return '—';
		return p.weightKg !== null ? `${p.weightKg} × ${p.reps ?? 0}` : `${p.reps} reps`;
	}

	function placeholder(ex: LiveExercise, j: number, field: 'weightKg' | 'reps') {
		const set = ex.sets[j];
		const target = field === 'weightKg' ? set.targetWeightKg : set.targetReps;
		const v = target ?? live.previousFor(ex, j)?.[field];
		return v === null || v === undefined ? '' : String(v);
	}

	function parse(value: string) {
		const n = Number(value.replace(',', '.'));
		return value.trim() === '' || Number.isNaN(n) ? null : n;
	}

	function tick(i: number, j: number) {
		unlockAudio();
		deleting = null;
		void live.toggleSet(i, j);
	}

	async function finish() {
		finishing = true;
		const id = await live.finish();
		finishOpen = false;
		if (id) await goto(resolve('/(app)/workout/done/[id]', { id }), { replaceState: true });
		else finishing = false;
	}

	async function discard() {
		if (!confirm('Discard this workout? Nothing will be saved.')) return;
		await live.discard();
		await goto(resolve('/(app)'), { replaceState: true });
	}
</script>

<svelte:head><title>{w?.name ?? 'Workout'} · Dench</title></svelte:head>

{#if w}
	<header class="sticky top-0 z-20 -mx-4 mb-4 bg-night/40 px-4 pt-safe pb-3 backdrop-blur-xl">
		<div class="flex items-center justify-between gap-3">
			<a class="text-sm text-ink-2" href={resolve('/(app)')} aria-label="Minimise workout">⌄</a>
			<p class="num text-lg font-bold">{formatDuration(elapsed)}</p>
			<button class="btn-primary h-9 rounded-xl px-4 text-sm" onclick={() => (finishOpen = true)}
				>Finish</button
			>
		</div>
	</header>

	<input
		class="w-full bg-transparent font-display text-[1.75rem] leading-tight font-extrabold tracking-tight focus:outline-none"
		aria-label="Workout name"
		value={w.name}
		onchange={(e) => live.rename(e.currentTarget.value)}
	/>
	<select
		class="mt-1 mb-5 bg-transparent text-xs font-semibold tracking-[0.12em] text-ink-3 uppercase focus:outline-none"
		aria-label="Session type"
		value={w.sessionType}
		onchange={(e) => live.setSessionType(e.currentTarget.value as (typeof SESSION_TYPES)[number])}
	>
		{#each SESSION_TYPES as s (s)}<option value={s}>{label(s)} session</option>{/each}
	</select>

	<ul class="flex flex-col gap-4">
		{#each w.exercises as ex, i (ex.id)}
			<li class="glass p-4">
				<div class="mb-3 flex items-start justify-between gap-2">
					<h2 class="min-w-0 text-gradient font-semibold">{ex.name}</h2>
					<button
						class="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-2"
						aria-label="Exercise options"
						onclick={() => ((menuFor = i), (menuOpen = true))}>⋯</button
					>
				</div>

				<div
					class="grid grid-cols-[2rem_1fr_4.25rem_3.5rem_2.75rem] items-center gap-x-2 gap-y-2 text-center"
				>
					<span class="eyebrow">Set</span>
					<span class="eyebrow">Previous</span>
					<span class="eyebrow">Kg</span>
					<span class="eyebrow">Reps</span>
					<span class="eyebrow">✓</span>

					{#each ex.sets as set, j (set.id)}
						{@const done = !!set.completedAt}
						<button
							class={[
								'h-10 rounded-lg num text-sm font-bold',
								set.type === 'WARMUP' ? 'text-ember' : 'text-ink-2'
							]}
							aria-label="Set {j + 1} options"
							onclick={() => (deleting = deleting === set.id ? null : set.id)}
							>{setLabel(ex, j)}</button
						>
						<span class="truncate num text-xs text-ink-3">{prevText(ex, j)}</span>
						<input
							class={[
								'h-10 w-full rounded-xl text-center num focus:outline-none',
								done ? 'bg-transparent font-bold' : 'bg-white/[0.06] focus:bg-white/10'
							]}
							inputmode="decimal"
							aria-label="Kg, set {j + 1}"
							placeholder={placeholder(ex, j, 'weightKg')}
							value={set.weightKg ?? ''}
							onchange={(e) => live.updateSet(i, j, { weightKg: parse(e.currentTarget.value) })}
						/>
						<input
							class={[
								'h-10 w-full rounded-xl text-center num focus:outline-none',
								done ? 'bg-transparent font-bold' : 'bg-white/[0.06] focus:bg-white/10'
							]}
							inputmode="numeric"
							aria-label="Reps, set {j + 1}"
							placeholder={placeholder(ex, j, 'reps')}
							value={set.reps ?? ''}
							onchange={(e) => live.updateSet(i, j, { reps: parse(e.currentTarget.value) })}
						/>
						{#if deleting === set.id}
							<button
								class="h-10 rounded-xl bg-ember/20 text-xs font-bold text-ember"
								onclick={() => ((deleting = null), live.removeSet(i, j))}>Del</button
							>
						{:else}
							<button
								class={[
									'tick relative h-10 rounded-xl text-sm font-bold transition',
									done ? 'is-done text-night bg-primary-gradient' : 'bg-white/[0.08] text-ink-3'
								]}
								aria-label={done ? `Untick set ${j + 1}` : `Tick set ${j + 1}`}
								aria-pressed={done}
								onclick={() => tick(i, j)}>✓</button
							>
						{/if}
					{/each}
				</div>

				<button
					class="mt-3 w-full rounded-xl bg-white/[0.05] py-2.5 text-sm font-semibold text-ink-2"
					onclick={() => live.addSet(i)}>+ Add set</button
				>
			</li>
		{/each}
	</ul>

	<button class="btn-glass mt-4 w-full" onclick={() => (pickerOpen = true)}>+ Add exercises</button>
	<button class="mt-6 w-full py-3 text-sm text-ember" onclick={discard}>Discard workout</button>

	<ExercisePicker bind:open={pickerOpen} onpick={(list) => live.addExercises(list)} />

	<Sheet bind:open={menuOpen} title={menuFor !== null ? w.exercises[menuFor]?.name : ''}>
		{#if menuFor !== null && w.exercises[menuFor]}
			{@const i = menuFor}
			{@const ex = w.exercises[i]}
			<label class="mb-4 flex items-center justify-between gap-3">
				<span>Rest timer</span>
				<select
					class="field w-auto appearance-none"
					value={ex.restSec ?? ''}
					onchange={(e) =>
						live.setRest(i, e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
				>
					<option value="">Default</option>
					<option value="0">Off</option>
					{#each [30, 60, 90, 120, 150, 180, 240, 300] as s (s)}
						<option value={s}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</option>
					{/each}
				</select>
			</label>
			<div class="grid grid-cols-2 gap-3">
				<button
					class="btn-glass"
					disabled={i === 0}
					onclick={() => ((menuOpen = false), live.moveExercise(i, -1))}>Move up</button
				>
				<button
					class="btn-glass"
					disabled={i === w.exercises.length - 1}
					onclick={() => ((menuOpen = false), live.moveExercise(i, 1))}>Move down</button
				>
			</div>
			<button
				class="btn-glass mt-3 w-full text-ember"
				onclick={() => ((menuOpen = false), live.removeExercise(i))}>Remove exercise</button
			>
		{/if}
	</Sheet>

	<Sheet bind:open={finishOpen} title="Finish workout?">
		{#if ticked === 0}
			<p class="text-sm text-ink-2">No sets are ticked yet, so there's nothing to save.</p>
		{:else if unticked > 0}
			<p class="text-sm text-ink-2">
				{unticked} unticked set{unticked > 1 ? 's' : ''} will be left out. {ticked} ticked set{ticked >
				1
					? 's'
					: ''} will be saved.
			</p>
		{:else}
			<p class="text-sm text-ink-2">All {ticked} sets will be saved.</p>
		{/if}
		{#snippet footer()}
			<div class="mb-1 grid grid-cols-2 gap-3">
				<button class="btn-glass" onclick={() => (finishOpen = false)}>Keep going</button>
				<button class="btn-primary" disabled={ticked === 0 || finishing} onclick={finish}
					>Finish</button
				>
			</div>
		{/snippet}
	</Sheet>
{/if}

<style>
	/* Ticked sets fill with the gradient and bloom outward. */
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
