<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import TabBar from '#lib/components/TabBar.svelte';
	import RestTimer from '#lib/components/RestTimer.svelte';
	import ConfirmSheet from '#lib/components/ConfirmSheet.svelte';
	import InstallGuide from '#lib/components/InstallGuide.svelte';
	import { isIos, isStandalone } from '#lib/push.ts';
	import { live } from '#lib/local/live.svelte.ts';
	import { startSync } from '#lib/local/sync.ts';
	import { formatDuration } from '#lib/types.ts';
	import { units } from '#lib/units.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// Set during render (not in an effect) so server-rendered weights use it too.
	// svelte-ignore state_referenced_locally
	units.system = data.units;
	$effect.pre(() => {
		units.system = data.units;
	});

	let now = $state(Date.now());
	const onWorkout = $derived(page.url.pathname.startsWith('/workout'));
	/** Full-screen editors bring their own navigation (Cancel / Save / Finish). */
	const fullScreen = $derived(onWorkout || page.url.pathname.startsWith('/templates/'));
	const showBar = $derived(!!live.workout && !fullScreen);

	onMount(() => {
		startSync();
		void live.load();
		warmOfflineCache();
		offerInstall();
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	let installOpen = $state(false);
	/** iOS has no install prompt: show the how-to once, on the first visit in Safari. */
	function offerInstall() {
		if (!isIos() || isStandalone()) return;
		try {
			if (localStorage.getItem('dench:install-guide')) return;
			localStorage.setItem('dench:install-guide', '1');
		} catch {
			return; // private mode etc.: don't nag every visit
		}
		setTimeout(() => (installOpen = true), 1200);
	}

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
	class={['mx-auto min-h-dvh max-w-md px-4', fullScreen ? 'pb-28' : showBar ? 'pb-48' : 'pb-32']}
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

<!-- Always mounted so the chime fires on any tab. -->
<RestTimer />

{#if !fullScreen}
	<TabBar />
{/if}

<ConfirmSheet />
<InstallGuide bind:open={installOpen} />
