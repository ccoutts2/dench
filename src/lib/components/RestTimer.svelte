<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { live } from '#lib/local/live.svelte.ts';
	import { chime } from '#lib/chime.ts';
	import { formatDuration } from '#lib/types.ts';

	let now = $state(Date.now());
	let pulse = $state(false);

	const rest = $derived(live.workout?.rest ?? null);
	const remainingMs = $derived(rest ? Math.max(0, rest.endsAt - now) : 0);
	const progress = $derived(rest ? remainingMs / (rest.totalSec * 1000) : 0);

	$effect(() => {
		if (!rest) {
			live.restExpanded = false;
			return;
		}
		const id = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(id);
	});

	// Rest over: chime + visual pulse. Timers pause while iOS backgrounds the app,
	// but endsAt is absolute, so the countdown is right the moment you return.
	$effect(() => {
		if (!rest || remainingMs > 0) return;
		const overdue = now - rest.endsAt;
		if (overdue < 3000 && document.visibilityState === 'visible') chime();
		pulse = true;
		setTimeout(() => (pulse = false), 900);
		void live.clearRest();
	});
</script>

{#if pulse}
	<div
		class="pointer-events-none fixed inset-0 z-[60] animate-[ping_0.9s_ease-out] bg-cyan/10"
		out:fade
	></div>
{/if}

{#if rest && live.restExpanded}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-night/50 px-6 backdrop-blur-2xl"
		transition:fade={{ duration: 180 }}
	>
		<p class="eyebrow">Resting after {rest.exercise}</p>
		<button
			class="relative grid size-64 place-items-center rounded-full"
			onclick={() => (live.restExpanded = false)}
			aria-label="Collapse rest timer"
			in:scale={{ start: 0.85, duration: 260 }}
		>
			<!-- glowing conic ring -->
			<div
				class="absolute inset-0 rounded-full blur-xl"
				style="background: conic-gradient(from -90deg, var(--color-violet), var(--color-cyan) {progress *
					360}deg, transparent 0); opacity: .55"
			></div>
			<div
				class="absolute inset-0 rounded-full"
				style="background: conic-gradient(from -90deg, var(--color-violet), var(--color-cyan) {progress *
					360}deg, rgb(255 255 255 / 0.08) 0); mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px)); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px));"
			></div>
			<div class="relative text-center">
				<p class="num font-display text-6xl font-extrabold tracking-tight">
					{formatDuration(remainingMs + 999)}
				</p>
				<p class="mt-2 text-sm text-ink-2">{rest.next}</p>
			</div>
		</button>
		<div class="grid w-full max-w-xs grid-cols-3 gap-3">
			<button
				class="btn-glass num"
				onclick={() => live.adjustRest(-15)}
				aria-label="Rest 15 seconds less">−15s</button
			>
			<button
				class="btn-glass num"
				onclick={() => live.adjustRest(15)}
				aria-label="Rest 15 seconds more">+15s</button
			>
			<button class="btn-primary" onclick={() => live.clearRest()}>Skip</button>
		</div>
	</div>
{/if}
