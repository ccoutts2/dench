<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 pt-safe pb-safe">
	<p class="mb-10 font-display text-[3.25rem] leading-none font-extrabold tracking-tight">
		Dench<span class="text-gradient">.</span>
	</p>
	{@render children()}
</main>
