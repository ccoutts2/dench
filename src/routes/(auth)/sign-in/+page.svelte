<script lang="ts">
	import AuthForm from '#lib/components/AuthForm.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Sign in · Dench</title></svelte:head>

<h1 class="mb-6 text-xl font-semibold">Welcome back.</h1>
<AuthForm mode="sign-in" providers={data.providers} />
