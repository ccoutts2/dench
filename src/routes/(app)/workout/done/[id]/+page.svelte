<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { db, type LocalWorkout } from '#lib/local/db.ts';
	import { onSyncChange } from '#lib/local/sync.ts';
	import { hueFor, volumeOf } from '#lib/types.ts';
	import { describeRecord, headline } from '#lib/records.ts';
	import { units } from '#lib/units.svelte.ts';
	import MuscleMap from '#lib/components/MuscleMap.svelte';
	import { localMuscleLoad } from '#lib/local/muscles.ts';
	import type { MuscleLoad } from '#lib/muscles.ts';

	let workout = $state<LocalWorkout | null>(null);
	let missing = $state(false);
	let muscles = $state<MuscleLoad>({});

	async function load() {
		const w = await db.workouts.get(page.params.id!);
		if (w) {
			const first = !workout;
			workout = w;
			muscles = await localMuscleLoad(w.exercises);
			// Just finished with a PR: one big swell of light to mark it.
			const fresh = Date.now() - new Date(w.finishedAt).getTime() < 10 * 60_000;
			if (first && fresh && w.records?.length) {
				setTimeout(
					() => dispatchEvent(new CustomEvent('dench:pulse', { detail: { strong: true } })),
					300
				);
			}
		} else missing = true;
	}

	onMount(() => {
		void load();
		return onSyncChange(() => void load());
	});

	$effect(() => {
		const hue = workout ? (prs.length ? 'pr' : hueFor(workout.sessionType)) : null;
		if (hue) document.documentElement.dataset.session = hue;
		return () => {
			delete document.documentElement.dataset.session;
		};
	});

	const sets = $derived(workout?.exercises.flatMap((e) => e.sets) ?? []);
	const minutes = $derived(
		workout
			? Math.max(
					1,
					Math.round(
						(new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime()) / 60000
					)
				)
			: 0
	);
	const timeRange = $derived.by(() => {
		if (!workout) return '';
		const f = (iso: string) =>
			new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
		const day = new Date(workout.startedAt).toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
		return `${day}, ${f(workout.startedAt)}–${f(workout.finishedAt)}`;
	});

	/** One headline PR per exercise, most impressive type first. */
	const prs = $derived.by(() => {
		if (!workout?.records?.length) return [];
		const ids = [...new Set(workout.records.map((r) => r.exerciseId))];
		return ids.map((id) => ({
			name: workout!.exerciseNames[id] ?? 'Exercise',
			hit: headline(workout!.records!.filter((r) => r.exerciseId === id))!
		}));
	});

	function bestSet(s: LocalWorkout['exercises'][number]['sets']) {
		const working = s.filter((x) => x.type !== 'WARMUP');
		const best = working.reduce<(typeof s)[number] | null>(
			(b, x) =>
				(x.weightKg ?? 0) * (x.reps ?? 0) > (b ? (b.weightKg ?? 0) * (b.reps ?? 0) : -1) ? x : b,
			null
		);
		if (!best) return '—';
		return best.weightKg !== null
			? `${units.show(best.weightKg)} × ${best.reps ?? 0}`
			: `${best.reps ?? 0} reps`;
	}
</script>

<svelte:head><title>Workout complete · Dench</title></svelte:head>

{#if workout}
	<header class="pt-10 pt-safe pb-6">
		<p class="mb-2 eyebrow">Workout complete</p>
		<h1 class="font-display text-[3rem] leading-[0.95] font-extrabold tracking-tight">
			Nice<br />work<span class="text-gradient">.</span>
		</h1>
		<p class="mt-3 text-sm text-ink-2">{workout.name}<br />{timeRange}</p>
	</header>

	<dl class="mb-4 grid grid-cols-3 gap-3">
		<div class="glass p-4">
			<dt class="eyebrow">Time</dt>
			<dd class="mt-1 num text-2xl font-bold">{minutes}m</dd>
		</div>
		<div class="glass p-4">
			<dt class="eyebrow">Volume</dt>
			<dd class="mt-1 num text-2xl font-bold">{units.volume(volumeOf(sets))}</dd>
		</div>
		<div class="glass p-4">
			<dt class="eyebrow">Sets</dt>
			<dd class="mt-1 num text-2xl font-bold">{sets.length}</dd>
		</div>
	</dl>

	{#if prs.length}
		<section class="pr-card glass mb-4 overflow-hidden glass-strong">
			<p class="flex items-center gap-2 px-4 pt-4 pb-2 font-semibold">
				<span class="pr-star text-ember" aria-hidden="true">★</span>
				{prs.length} personal record{prs.length > 1 ? 's' : ''}
			</p>
			<ul class="divide-y divide-white/[0.07]">
				{#each prs as pr (pr.name)}
					<li class="flex items-center justify-between gap-3 px-4 py-3">
						<span class="min-w-0 truncate text-[0.9375rem]">{pr.name}</span>
						<span class="shrink-0 text-sm text-ember"
							>{describeRecord(pr.hit, (kg, dp) => units.fmt(kg, dp))}</span
						>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="glass mb-4 divide-y divide-white/[0.07] overflow-hidden">
		{#each workout.exercises as ex (ex.id)}
			<div class="flex items-center justify-between gap-3 px-4 py-3">
				<span class="min-w-0 truncate text-[0.9375rem]">
					<span class="mr-1 num text-ink-3">{ex.sets.length}×</span>
					{workout.exerciseNames[ex.exerciseId] ?? 'Exercise'}
				</span>
				<span class="shrink-0 num text-sm text-ink-2">{bestSet(ex.sets)}</span>
			</div>
		{/each}
	</section>

	<section class="glass mb-4 p-4">
		<p class="mb-3 eyebrow">Muscles worked</p>
		<MuscleMap load={muscles} />
	</section>

	<p class="mb-6 flex items-center gap-2 px-1 text-xs text-ink-3">
		<span class={['size-1.5 rounded-full', workout.synced ? 'bg-cyan' : 'bg-ember']}></span>
		{workout.synced
			? 'Saved to your account'
			: 'Saved on this phone. It syncs when you have signal'}
	</p>

	<a class="btn-primary w-full" href={resolve('/(app)')}>Done</a>
{:else if missing}
	<div class="pt-16 pt-safe text-center">
		<p class="mb-4 text-ink-2">This summary isn't on this device.</p>
		<a class="btn-glass" href={resolve('/(app)/history')}>Go to history</a>
	</div>
{/if}
