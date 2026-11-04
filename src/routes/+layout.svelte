<script lang="ts">
	// Self-hosted type (no third-party request, and it works offline):
	// Unbounded (display), Inter Tight (UI), JetBrains Mono (numbers).
	import '@fontsource-variable/unbounded';
	import '@fontsource-variable/inter-tight';
	import '@fontsource-variable/jetbrains-mono';
	import './layout.css';
	import { onNavigate } from '$app/navigation';
	import Mesh from '#lib/components/Mesh.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Cross-fade between screens with the View Transitions API (Safari 18+).
	// Deeper screens slide in from the right; going back slides the other way.
	onNavigate((navigation) => {
		if (
			!document.startViewTransition ||
			navigation.from?.url.pathname === navigation.to?.url.pathname
		)
			return;
		const depth = (p?: string) => (p ?? '/').split('/').filter(Boolean).length;
		const from = depth(navigation.from?.url.pathname);
		const to = depth(navigation.to?.url.pathname);
		document.documentElement.dataset.nav = to > from ? 'forward' : to < from ? 'back' : 'tab';
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>Dench</title>
</svelte:head>

<Mesh />
{@render children()}
