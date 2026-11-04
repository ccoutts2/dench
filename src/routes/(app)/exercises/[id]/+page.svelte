<script lang="ts">
	import { resolve } from '$app/paths';
	import LineChart from '#lib/components/LineChart.svelte';
	import MuscleMap from '#lib/components/MuscleMap.svelte';
	import type { MuscleLoad } from '#lib/muscles.ts';
	import { units } from '#lib/units.svelte.ts';
	import { label } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const sessions = $derived(data.sessions);
	const weighted = $derived(sessions.some((s) => s.heaviest !== null));

	type Metric = 'e1rm' | 'heaviest' | 'volume' | 'reps';
	const METRICS = $derived<{ key: Metric; label: string }[]>(
		weighted
			? [
					{ key: 'e1rm', label: 'Est. 1RM' },
					{ key: 'heaviest', label: 'Heaviest' },
					{ key: 'volume', label: 'Volume' }
				]
			: [{ key: 'reps', label: 'Best reps' }]
	);
	let chosen = $state<Metric | null>(null);
	const metric = $derived(
		chosen && METRICS.some((m) => m.key === chosen) ? chosen : METRICS[0].key
	);

	/** Chart values are converted to the user's unit so the axis reads naturally. */
	const points = $derived(
		sessions
			.filter((s) => s[metric] !== null && s[metric] !== 0)
			.map((s) => ({
				x: s.date,
				y: metric === 'reps' ? s.reps! : units.show(s[metric] as number, 1)!
			}))
	);
	const format = (y: number) =>
		metric === 'reps' ? `${y} reps` : `${y.toLocaleString('en-GB')} ${units.label}`;

	const max = <K extends 'e1rm' | 'heaviest' | 'reps'>(k: K) =>
		sessions.reduce<(typeof sessions)[number] | null>(
			(b, s) => (s[k] !== null && (b === null || s[k]! > b[k]!) ? s : b),
			null
		);
	const best1rm = $derived(max('e1rm'));
	const heaviest = $derived(max('heaviest'));
	const mostReps = $derived(max('reps'));
	const bestSet = $derived(
		sessions.reduce<(typeof sessions)[number]['bestSet']>(
			(b, s) => (s.bestSet && (!b || s.bestSet.value > b.value) ? s.bestSet : b),
			null
		)
	);
	const isLatest = (s: (typeof sessions)[number] | null) =>
		!!s && s.workoutId === sessions.at(-1)?.workoutId;

	const since = $derived(
		sessions[0]
			? new Date(sessions[0].date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
			: null
	);

	/** "82.5 × 8, 8, 8" when the weight is constant, otherwise each set. */
	function setsText(list: { weightKg: number | null; reps: number | null }[]) {
		if (list.length === 0) return 'warm-ups only';
		if (list.every((s) => s.weightKg === null))
			return `${list.map((s) => s.reps ?? 0).join(', ')} reps`;
		const same = list.every((s) => s.weightKg === list[0].weightKg);
		if (same) return `${units.show(list[0].weightKg)} × ${list.map((s) => s.reps ?? 0).join(', ')}`;
		return list.map((s) => `${units.show(s.weightKg) ?? 0}×${s.reps ?? 0}`).join(', ');
	}

	/** Primary = 1, secondary = 0.5: the map shades them differently. */
	const exerciseLoad = $derived.by(() => {
		const load: Record<string, number> = {};
		for (const m of data.exercise.secondaryMuscles) load[m] = 0.5;
		load[data.exercise.primaryMuscle] = 1;
		return load as MuscleLoad;
	});

	const recent = $derived([...sessions].reverse().slice(0, 12));
	const prSet = $derived(new Set(data.prWorkouts));
</script>

<svelte:head><title>{data.exercise.name} · Dench</title></svelte:head>

<header class="pt-safe pb-5">
	<div class="pt-4 pb-4">
		<a class="text-sm font-semibold text-ink-2" href={resolve('/(app)/exercises')}>‹ Exercises</a>
	</div>
	<p class="mb-1.5 eyebrow">
		{data.exercise.custom ? 'Custom' : label(data.exercise.primaryMuscle)} · {label(
			data.exercise.equipment
		)}
	</p>
	<h1 class="font-display text-[1.75rem] leading-[1.08] font-extrabold tracking-tight">
		{data.exercise.name}
	</h1>
</header>

<section class="glass mb-4 p-4">
	<MuscleMap load={exerciseLoad} exercise />
</section>

{#if sessions.length === 0}
	<div class="glass flex flex-col items-center gap-2 px-6 py-12 text-center">
		<p class="font-semibold">Not logged yet</p>
		<p class="max-w-[17rem] text-sm text-ink-2">
			Once you log this exercise, its best sets and progress chart show up here.
		</p>
	</div>
{:else}
	<dl class="mb-4 grid grid-cols-2 gap-3">
		{#if weighted}
			<div class="glass p-4">
				<dt class="eyebrow">Est. 1RM</dt>
				<dd class="mt-1 num text-2xl font-bold">
					{best1rm ? units.show(best1rm.e1rm, 1) : '—'}<span class="ml-1 text-sm text-ink-3"
						>{units.label}</span
					>
				</dd>
				{#if isLatest(best1rm) && sessions.length > 1}
					<p class="mt-1 text-xs font-semibold text-ember">PR last session</p>
				{/if}
			</div>
			<div class="glass p-4">
				<dt class="eyebrow">Heaviest</dt>
				<dd class="mt-1 num text-2xl font-bold">
					{heaviest ? units.show(heaviest.heaviest) : '—'}<span class="ml-1 text-sm text-ink-3"
						>{units.label}</span
					>
				</dd>
			</div>
			<div class="glass p-4">
				<dt class="eyebrow">Best set</dt>
				<dd class="mt-1 num text-2xl font-bold">
					{bestSet ? `${units.show(bestSet.weightKg)} × ${bestSet.reps}` : '—'}
				</dd>
			</div>
		{:else}
			<div class="glass p-4">
				<dt class="eyebrow">Most reps</dt>
				<dd class="mt-1 num text-2xl font-bold">{mostReps?.reps ?? '—'}</dd>
			</div>
		{/if}
		<div class="glass p-4">
			<dt class="eyebrow">Sessions</dt>
			<dd class="mt-1 num text-2xl font-bold">{sessions.length}</dd>
			{#if since}<p class="mt-1 text-xs text-ink-3">since {since}</p>{/if}
		</div>
	</dl>

	<section class="glass mb-4 p-4">
		{#if METRICS.length > 1}
			<div class="mb-8 flex gap-1 rounded-full bg-white/[0.05] p-1" role="tablist">
				{#each METRICS as m (m.key)}
					<button
						role="tab"
						aria-selected={metric === m.key}
						class={[
							'flex-1 rounded-full py-1.5 text-xs font-semibold',
							metric === m.key ? 'bg-white/15 text-ink' : 'text-ink-3'
						]}
						onclick={() => (chosen = m.key)}>{m.label}</button
					>
				{/each}
			</div>
		{:else}
			<p class="mb-8 eyebrow">{METRICS[0].label}</p>
		{/if}
		{#if points.length}
			<LineChart
				{points}
				{format}
				title="{METRICS.find((m) => m.key === metric)?.label} per session"
			/>
		{:else}
			<p class="py-10 text-center text-sm text-ink-3">Nothing to chart yet.</p>
		{/if}
	</section>

	<p class="mb-2 eyebrow">Recent sessions</p>
	<ul class="glass divide-y divide-white/[0.07] overflow-hidden">
		{#each recent as s (s.workoutId)}
			<li>
				<a
					class="flex items-center justify-between gap-3 px-4 py-3"
					href={resolve('/(app)/history/[id]', { id: s.workoutId })}
				>
					<span class="shrink-0 text-sm text-ink-2"
						>{new Date(s.date).toLocaleDateString('en-GB', {
							weekday: 'short',
							day: 'numeric',
							month: 'short'
						})}</span
					>
					<span class="flex min-w-0 items-center gap-2">
						<span class="truncate num text-sm">{setsText(s.sets)}</span>
						{#if prSet.has(s.workoutId)}<span class="shrink-0 text-xs text-ember" aria-label="PR"
								>★</span
							>{/if}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
