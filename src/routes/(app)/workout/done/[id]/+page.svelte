<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { db, type LocalWorkout } from '#lib/local/db.ts';
	import { onSyncChange } from '#lib/local/sync.ts';
	import { formatVolume, hueFor, volumeOf } from '#lib/types.ts';

	let workout = $state<LocalWorkout | null>(null);
	let missing = $state(false);

	async function load() {
		const w = await db.workouts.get(page.params.id!);
		if (w) workout = w;
		else missing = true;
	}

	onMount(() => {
		void load();
		return onSyncChange(() => void load());
	});

	$effect(() => {
		const hue = workout ? hueFor(workout.sessionType) : null;
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
		return `${day} · ${f(workout.startedAt)} – ${f(workout.finishedAt)}`;
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
			? `${best.weightKg} × ${best.reps ?? 0}`
			: `${best.reps ?? 0} reps`;
	}
</script>

<svelte:head><title>Workout complete · Dench</title></svelte:head>

{#if workout}
	<header class="pt-10 pt-safe pb-6">
		<p class="mb-2 eyebrow">Workout complete</p>
		<h1 class="font-display text-[3rem] leading-[0.95] font-extrabold tracking-tight">
			Nice<br /><span class="text-gradient">work.</span>
		</h1>
		<p class="mt-3 text-sm text-ink-2">{workout.name} · {timeRange}</p>
	</header>

	<dl class="mb-4 grid grid-cols-3 gap-3">
		<div class="glass p-4">
			<dt class="eyebrow">Time</dt>
			<dd class="mt-1 num text-2xl font-bold">{minutes}m</dd>
		</div>
		<div class="glass p-4">
			<dt class="eyebrow">Volume</dt>
			<dd class="mt-1 num text-2xl font-bold">{formatVolume(volumeOf(sets))}</dd>
		</div>
		<div class="glass p-4">
			<dt class="eyebrow">Sets</dt>
			<dd class="mt-1 num text-2xl font-bold">{sets.length}</dd>
		</div>
	</dl>

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

	<p class="mb-6 flex items-center gap-2 px-1 text-xs text-ink-3">
		<span class={['size-1.5 rounded-full', workout.synced ? 'bg-cyan' : 'bg-ember']}></span>
		{workout.synced ? 'Saved to your account' : 'Saved on this phone · syncs when you have signal'}
	</p>

	<a class="btn-primary w-full" href={resolve('/(app)')}>Done</a>
{:else if missing}
	<div class="pt-16 pt-safe text-center">
		<p class="mb-4 text-ink-2">This summary isn't on this device.</p>
		<a class="btn-glass" href={resolve('/(app)/history')}>Go to history</a>
	</div>
{/if}
