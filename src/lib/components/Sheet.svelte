<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let {
		open = $bindable(false),
		title,
		tall = false,
		children,
		footer
	}: {
		open?: boolean;
		title?: string;
		tall?: boolean;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	function onkeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') open = false;
	}
</script>

<svelte:window {onkeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
		<button
			class="absolute inset-0 bg-night/60 backdrop-blur-sm"
			aria-label="Close"
			onclick={() => (open = false)}
			transition:fade={{ duration: 150 }}
		></button>
		<div
			class={[
				'glass relative flex w-full max-w-md flex-col !rounded-b-none bg-night/70 pb-safe glass-strong',
				tall ? 'h-[92dvh]' : 'max-h-[85dvh]'
			]}
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:fly={{ y: 320, duration: 260, opacity: 1 }}
		>
			<div class="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/25"></div>
			{#if title}
				<h2 class="shrink-0 px-5 pt-3 pb-2 font-display text-lg font-extrabold">{title}</h2>
			{/if}
			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
				{@render children()}
			</div>
			{#if footer}
				<div class="shrink-0 border-t border-white/10 px-5 pt-3">{@render footer()}</div>
			{/if}
		</div>
	</div>
{/if}
