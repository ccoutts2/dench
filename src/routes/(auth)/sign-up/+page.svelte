<script lang="ts">
	import AuthForm from '#lib/components/AuthForm.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Create account · Dench</title></svelte:head>

<h1 class="mb-1 text-xl font-semibold">Start logging.</h1>
<p class="mb-6 text-sm text-ink-2">Unlimited routines, free. Works offline once installed.</p>
<AuthForm mode="sign-up" providers={data.providers} />
