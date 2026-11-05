<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { page } from '$app/state';
	import { RELEASES, type Release } from '#lib/whats-new.ts';

	let { userCreatedAt, blocked = false }: { userCreatedAt: string; blocked?: boolean } = $props();

	const KEY = 'dench:whats-new';
	let release = $state<Release | null>(null);
	let closeBtn = $state<HTMLButtonElement>();

	onMount(() => {
		const latest = RELEASES[0];
		// New accounts start fresh: everything is new to them anyway.
		if (!latest || new Date(userCreatedAt) >= new Date(latest.date)) return;
		try {
			if (localStorage.getItem(KEY) === latest.id) return;
		} catch {
			return; // no storage (private mode): don't show it on every visit
		}
		// A moment after the app settles, so it doesn't fight the first paint.
		const t = setTimeout(() => (release = latest), 900);
		return () => clearTimeout(t);
	});

	// Never interrupt a set, and never stack on top of the install guide.
	const open = $derived(!!release && !blocked && !page.url.pathname.startsWith('/workout'));

	$effect(() => {
		if (open) closeBtn?.focus();
	});

	function close() {
		try {
			if (release) localStorage.setItem(KEY, release.id);
		} catch {
			// fine: worst case it shows again next visit
		}
		release = null;
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && close()} />

{#if open && release}
	<div
		class="fixed inset-0 z-[60] grid place-items-center px-5 pt-safe pb-safe"
		role="presentation"
	>
		<button
			class="absolute inset-0 bg-night/55 backdrop-blur-sm"
			aria-label="Close"
			tabindex="-1"
			onclick={close}
			transition:fade={{ duration: 200 }}
		></button>
		<div
			class="glass relative w-full max-w-sm p-6 glass-strong"
			role="dialog"
			aria-modal="true"
			aria-labelledby="whats-new-title"
			in:scale={{ start: 0.94, duration: 320, opacity: 0 }}
			out:fade={{ duration: 160 }}
		>
			<button
				bind:this={closeBtn}
				class="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/[0.08] text-ink-2 hover:text-ink"
				aria-label="Close what's new"
				onclick={close}
			>
				<svg
					class="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg
				>
			</button>
			<h2
				id="whats-new-title"
				class="pr-10 font-display text-[1.6rem] leading-[1.05] font-extrabold tracking-tight"
			>
				{release.title}<span class="text-gradient">.</span>
			</h2>
			<ul class="mt-5 flex flex-col gap-4">
				{#each release.items as item (item.title)}
					<li class="flex gap-3">
						<span class="mt-1.5 size-2 shrink-0 rounded-full bg-primary-gradient" aria-hidden="true"
						></span>
						<span>
							<span class="block font-semibold">{item.title}</span>
							<span class="mt-0.5 block text-sm text-ink-2">{item.text}</span>
						</span>
					</li>
				{/each}
			</ul>
			<button class="btn-primary mt-6 w-full" onclick={close}>Got it</button>
		</div>
	</div>
{/if}
