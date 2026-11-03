<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: Snippet } =
		$props();
</script>

<header class="flex items-end justify-between gap-4 pt-safe pb-5">
	<div>
		{#if eyebrow}<p class="mb-1.5 eyebrow">{eyebrow}</p>{/if}
		<h1 class="font-display text-[2rem] leading-[1.05] font-extrabold tracking-tight">{title}</h1>
	</div>
	{@render actions?.()}
</header>
