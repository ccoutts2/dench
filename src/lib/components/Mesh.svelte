<script lang="ts">
	import { onMount } from 'svelte';

	let glow: HTMLDivElement;

	// A set tick or a PR sends 'dench:pulse': the light swells once, then settles.
	onMount(() => {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)');
		const pulse = (e: Event) => {
			if (reduce.matches) return;
			const strong = (e as CustomEvent<{ strong?: boolean }>).detail?.strong;
			glow.animate(
				[
					{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.6)' },
					{
						opacity: strong ? 0.95 : 0.55,
						transform: 'translate(-50%, -50%) scale(1)',
						offset: 0.3
					},
					{ opacity: 0, transform: 'translate(-50%, -50%) scale(1.25)' }
				],
				{ duration: strong ? 2200 : 1100, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
			);
		};
		addEventListener('dench:pulse', pulse);
		return () => removeEventListener('dench:pulse', pulse);
	});
</script>

<!--
	Drifting gradient light behind every screen. Colours come from the
	--mesh-* custom properties, which change with [data-session] on <html>.
-->
<div
	class="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night [view-transition-name:mesh]"
	aria-hidden="true"
>
	<div
		class="absolute -top-[20vh] -left-[25vw] size-[85vw] max-h-[720px] max-w-[720px] animate-drift-a rounded-full opacity-80 blur-[90px] transition-colors duration-1000"
		style="background: radial-gradient(circle, var(--mesh-1), transparent 68%)"
	></div>
	<div
		class="absolute top-[30vh] -right-[30vw] size-[90vw] max-h-[760px] max-w-[760px] animate-drift-b rounded-full opacity-70 blur-[100px] transition-colors duration-1000"
		style="background: radial-gradient(circle, var(--mesh-2), transparent 68%)"
	></div>
	<div
		class="absolute -bottom-[25vh] left-[5vw] size-[80vw] max-h-[680px] max-w-[680px] animate-drift-c rounded-full opacity-55 blur-[110px] transition-colors duration-1000"
		style="background: radial-gradient(circle, var(--mesh-3), transparent 68%)"
	></div>
	<div
		bind:this={glow}
		class="absolute top-[45%] left-1/2 size-[110vw] max-h-[900px] max-w-[900px] rounded-full opacity-0 blur-[80px]"
		style="background: radial-gradient(circle, var(--mesh-2), var(--mesh-1) 40%, transparent 70%)"
	></div>
	<!-- vignette keeps text legible over the light -->
	<div
		class="absolute inset-0"
		style="background: radial-gradient(120% 85% at 50% 10%, transparent 45%, rgb(7 7 13 / 0.6))"
	></div>
</div>
