<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import TabBar from '#lib/components/TabBar.svelte';
	import RestTimer from '#lib/components/RestTimer.svelte';
	import { live } from '#lib/local/live.svelte.ts';
	import { startSync } from '#lib/local/sync.ts';
	import { formatDuration } from '#lib/types.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let now = $state(Date.now());
	const onWorkout = $derived(page.url.pathname.startsWith('/workout'));
	const showBar = $derived(!!live.workout && !onWorkout);

	onMount(() => {
		startSync();
		void live.load();
		warmOfflineCache();
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	/** Ask the service worker to cache the core screens so they open with no signal. */
	function warmOfflineCache() {
		navigator.serviceWorker?.ready.then((reg) =>
			reg.active?.postMessage({
				type: 'warm',
				urls: ['/', '/workout', '/history', '/exercises', '/profile'].flatMap((p) => [
					p,
					`${p === '/' ? '' : p}/__data.json`
				])
			})
		);
	}
</script>

<main
	class={['mx-auto min-h-dvh max-w-md px-4', onWorkout ? 'pb-28' : showBar ? 'pb-48' : 'pb-32']}
>
	{@render children()}
</main>

{#if showBar && live.workout}
	<a
		href={resolve('/(app)/workout')}
		class="glass fixed inset-x-4 bottom-[calc(max(var(--safe-bottom),0.75rem)+5.25rem)] z-30 mx-auto flex max-w-[calc(28rem-2rem)] items-center justify-between rounded-2xl px-4 py-3 glass-strong"
		transition:fly={{ y: 40, duration: 200 }}
	>
		<span class="min-w-0">
			<span class="block eyebrow">Workout in progress</span>
			<span class="block truncate font-semibold">{live.workout.name}</span>
		</span>
		{#if live.workout.rest}
			<span class="text-right">
				<span class="block eyebrow">Rest</span>
				<span class="num text-lg font-bold text-cyan">
					{formatDuration(Math.max(0, live.workout.rest.endsAt - now) + 999)}
				</span>
			</span>
		{:else}
			<span class="text-gradient num text-lg font-bold">
				{formatDuration(now - new Date(live.workout.startedAt).getTime())}
			</span>
		{/if}
	</a>
{/if}

<!-- Always mounted so the chime fires on any tab; the pill shows on the workout screen. -->
<RestTimer showPill={onWorkout} />

{#if !onWorkout}
	<TabBar />
{/if}
