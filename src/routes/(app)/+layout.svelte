<script lang="ts">
	import TabBar from '#lib/components/TabBar.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main class="mx-auto min-h-dvh max-w-md px-4 pb-32">
	{@render children()}
</main>
<TabBar />
