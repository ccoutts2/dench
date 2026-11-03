<script lang="ts">
	import './layout.css';
	import Mesh from '#lib/components/Mesh.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Dench</title>
</svelte:head>

<Mesh />
{@render children()}
