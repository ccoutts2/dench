<script lang="ts">
	import { resolve } from '$app/paths';
	import LandingDemo from '#lib/components/LandingDemo.svelte';
	import LineChart from '#lib/components/LineChart.svelte';
	import MuscleMap from '#lib/components/MuscleMap.svelte';
	import { WEEKLY_SCALE } from '#lib/muscles.ts';

	const SESSIONS = [
		{ key: 'push', label: 'Push' },
		{ key: 'pull', label: 'Pull' },
		{ key: 'legs', label: 'Legs' }
	] as const;
	let session = $state<(typeof SESSIONS)[number]['key']>('push');

	// The page's light follows the chosen session, like the app does mid-workout.
	$effect(() => {
		document.documentElement.dataset.session = session;
		return () => {
			delete document.documentElement.dataset.session;
		};
	});

	const day = (d: number) => new Date(Date.UTC(2026, 8, 1) + d * 86_400_000).toISOString();
	const chart = [96.7, 98.0, 98.0, 99.3, 101.3, 101.3, 102.7, 104.5].map((y, k) => ({
		x: day(k * 7),
		y
	}));
	const week = {
		CHEST: 12,
		SHOULDERS: 10.5,
		TRICEPS: 7.5,
		BACK: 6,
		BICEPS: 4,
		QUADS: 9,
		HAMSTRINGS: 3.5,
		GLUTES: 5,
		ABS: 2,
		TRAPS: 3,
		CALVES: 1.5
	};
</script>

<svelte:head>
	<title>Dench, a workout log for your home screen</title>
	<meta
		name="description"
		content="Log sets in one tap, time your rest, see your PRs and the muscles you trained. Installs to your iPhone home screen and works with no signal."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 pt-safe pb-safe sm:px-8">
	<nav class="flex items-center justify-between py-5">
		<span class="font-display text-2xl font-extrabold tracking-tight"
			>Dench<span class="text-gradient">.</span></span
		>
		<a class="text-sm font-semibold text-ink-2 hover:text-ink" href={resolve('/(auth)/sign-in')}
			>Sign in</a
		>
	</nav>

	<!-- Hero: the core loop, live. -->
	<section class="grid items-center gap-10 pt-6 pb-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-16">
		<div>
			<h1
				class="font-display text-[3.1rem] leading-[0.92] font-extrabold tracking-[-0.03em] sm:text-[4.5rem] lg:text-[5.75rem]"
			>
				One tap<br />per set<span class="text-gradient">.</span>
			</h1>
			<p class="mt-6 max-w-[30rem] text-lg leading-relaxed text-ink-2">
				A workout log that lives on your home screen. It remembers last week's numbers, starts your
				rest the moment you tick a set, and keeps working in a basement gym with no signal.
			</p>
			<div class="mt-8 flex flex-wrap gap-3">
				<a class="btn-primary px-7" href={resolve('/(auth)/sign-up')}>Create a free account</a>
				<a class="btn-glass px-6" href={resolve('/(auth)/sign-in')}>Sign in</a>
			</div>
		</div>

		<div class="flex flex-col gap-3">
			<div class="flex items-center justify-between gap-3">
				<p class="text-sm text-ink-3">Try it. The light follows the session.</p>
				<div
					class="flex gap-1 rounded-full bg-white/[0.05] p-1"
					role="radiogroup"
					aria-label="Session"
				>
					{#each SESSIONS as s (s.key)}
						<button
							role="radio"
							aria-checked={session === s.key}
							class={[
								'rounded-full px-3 py-1 text-xs font-semibold transition',
								session === s.key ? 'bg-white/15 text-ink' : 'text-ink-3'
							]}
							onclick={() => (session = s.key)}>{s.label}</button
						>
					{/each}
				</div>
			</div>
			<LandingDemo />
		</div>
	</section>

	<!-- What it does, one idea per row; visuals are the real components. -->
	<section class="grid gap-x-16 gap-y-6 border-t border-white/[0.08] py-16 lg:grid-cols-2">
		<div class="lg:pt-10">
			<h2 class="font-display text-3xl leading-tight font-extrabold sm:text-4xl">
				See your progress as a line, not a spreadsheet<span class="text-gradient">.</span>
			</h2>
			<p class="mt-4 max-w-[28rem] text-ink-2">
				Every exercise gets an estimated one-rep max, your heaviest set and your volume over time.
				PRs are spotted the moment you finish, even offline.
			</p>
		</div>
		<div class="glass p-5">
			<div class="mb-6 flex items-baseline justify-between">
				<p class="font-semibold">Bench Press, est. 1RM</p>
				<p class="num text-sm text-ember">+7.8 kg</p>
			</div>
			<LineChart points={chart} format={(y) => `${y} kg`} title="Estimated one-rep max per week" />
		</div>
	</section>

	<section class="grid gap-x-16 gap-y-6 border-t border-white/[0.08] py-16 lg:grid-cols-2">
		<div class="glass order-2 p-5 lg:order-1">
			<MuscleMap load={week} scale={WEEKLY_SCALE} showList={false} />
		</div>
		<div class="order-1 lg:order-2 lg:pt-10">
			<h2 class="font-display text-3xl leading-tight font-extrabold sm:text-4xl">
				Know what you trained, and what you skipped<span class="text-gradient">.</span>
			</h2>
			<p class="mt-4 max-w-[28rem] text-ink-2">
				A body map for every workout, template and week. It shades each muscle by working sets, and
				tells you when back is lagging chest or hamstrings trail quads.
			</p>
		</div>
	</section>

	<section class="border-t border-white/[0.08] py-16">
		<h2 class="max-w-[40rem] font-display text-3xl leading-tight font-extrabold sm:text-4xl">
			Built for the gym floor<span class="text-gradient">.</span>
		</h2>
		<dl class="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
			<div>
				<dt class="font-semibold">No signal, no problem</dt>
				<dd class="mt-1.5 text-sm text-ink-2">
					Sets save on your phone first and sync when you're back online.
				</dd>
			</div>
			<div>
				<dt class="font-semibold">Rest that tells you</dt>
				<dd class="mt-1.5 text-sm text-ink-2">
					A chime when rest ends, and a notification if your phone is locked.
				</dd>
			</div>
			<div>
				<dt class="font-semibold">Plates worked out</dt>
				<dd class="mt-1.5 text-sm text-ink-2">
					Type the total and see exactly what goes on each side of the bar.
				</dd>
			</div>
			<div>
				<dt class="font-semibold">Supersets and set types</dt>
				<dd class="mt-1.5 text-sm text-ink-2">
					Warm-ups, drop sets and failure sets, with rest only after the round.
				</dd>
			</div>
		</dl>
	</section>

	<section class="border-t border-white/[0.08] py-20 text-center">
		<h2 class="font-display text-4xl leading-tight font-extrabold sm:text-6xl">
			Your next set starts here<span class="text-gradient">.</span>
		</h2>
		<p class="mx-auto mt-4 max-w-[28rem] text-ink-2">
			Free to use. Open it in Safari, add it to your home screen, and it runs like an app.
		</p>
		<a class="btn-primary mt-8 px-8" href={resolve('/(auth)/sign-up')}>Create a free account</a>
	</section>

	<footer class="flex justify-between border-t border-white/[0.08] py-6 text-xs text-ink-3">
		<span>Dench</span>
		<a class="hover:text-ink-2" href={resolve('/(auth)/sign-in')}>Sign in</a>
	</footer>
</div>
