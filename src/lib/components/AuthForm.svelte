<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { authClient } from '#lib/auth-client.ts';

	let {
		mode,
		providers
	}: { mode: 'sign-in' | 'sign-up'; providers: { google: boolean; apple: boolean } } = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let pending = $state(false);

	/** Only same-origin relative paths are allowed as a post-login target. */
	const next = $derived.by(() => {
		const n = page.url.searchParams.get('next');
		return n && n.startsWith('/') && !n.startsWith('//') ? n : '/';
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		pending = true;
		error = null;
		const result =
			mode === 'sign-up'
				? await authClient.signUp.email({ name: name.trim(), email, password })
				: await authClient.signIn.email({ email, password });
		pending = false;
		if (result.error) {
			error = result.error.message ?? 'Something went wrong. Try again.';
			return;
		}
		await invalidateAll();
		// `next` is a validated same-origin path taken from the query string.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(next, { replaceState: true });
	}

	async function social(provider: 'google' | 'apple') {
		error = null;
		const { error: err } = await authClient.signIn.social({ provider, callbackURL: next });
		if (err) error = err.message ?? 'Could not reach the provider.';
	}
</script>

<form class="flex flex-col gap-3" onsubmit={submit}>
	{#if mode === 'sign-up'}
		<label class="sr-only" for="name">Name</label>
		<input
			id="name"
			class="field"
			placeholder="Name"
			autocomplete="name"
			required
			bind:value={name}
		/>
	{/if}
	<label class="sr-only" for="email">Email</label>
	<input
		id="email"
		class="field"
		type="email"
		placeholder="Email"
		autocomplete="email"
		inputmode="email"
		required
		bind:value={email}
	/>
	<label class="sr-only" for="password">Password</label>
	<input
		id="password"
		class="field"
		type="password"
		placeholder={mode === 'sign-up' ? 'Password (8+ characters)' : 'Password'}
		autocomplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
		minlength="8"
		required
		bind:value={password}
	/>

	{#if error}
		<p class="rounded-xl bg-ember/15 px-3 py-2 text-sm text-ember" role="alert">{error}</p>
	{/if}

	<button class="btn-primary mt-1" type="submit" disabled={pending}>
		{#if pending}Just a sec…{:else}{mode === 'sign-up' ? 'Create account' : 'Sign in'}{/if}
	</button>
</form>

{#if providers.google || providers.apple}
	<div class="my-6 flex items-center gap-3 text-xs text-ink-3">
		<span class="h-px flex-1 bg-white/10"></span>or<span class="h-px flex-1 bg-white/10"></span>
	</div>
	<div class="flex flex-col gap-3">
		{#if providers.apple}
			<button class="btn-glass" type="button" onclick={() => social('apple')}>
				<svg viewBox="0 0 24 24" class="size-5" fill="currentColor" aria-hidden="true"
					><path
						d="M16.37 12.7c.02 2.4 2.1 3.2 2.13 3.21-.02.06-.33 1.14-1.1 2.26-.66.97-1.35 1.94-2.43 1.96-1.06.02-1.4-.63-2.62-.63-1.21 0-1.6.61-2.6.65-1.05.04-1.85-1.05-2.52-2.02-1.37-1.98-2.42-5.6-1.01-8.04.7-1.21 1.95-1.98 3.3-2 1.03-.02 2 .7 2.63.7.63 0 1.8-.86 3.04-.73.52.02 1.97.21 2.9 1.58-.07.05-1.73 1.01-1.72 3.06M14.36 4.92c.56-.67.93-1.6.83-2.53-.8.03-1.77.53-2.34 1.2-.52.6-.97 1.55-.85 2.46.89.07 1.8-.45 2.36-1.13"
					/></svg
				>
				Continue with Apple
			</button>
		{/if}
		{#if providers.google}
			<button class="btn-glass" type="button" onclick={() => social('google')}>
				<svg viewBox="0 0 24 24" class="size-5" aria-hidden="true"
					><path
						fill="#4285F4"
						d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.74 2.98-4.3 2.98-7.33"
					/><path
						fill="#34A853"
						d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22"
					/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.07a10 10 0 0 0 0 8.96z" /><path
						fill="#EA4335"
						d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98"
					/></svg
				>
				Continue with Google
			</button>
		{/if}
	</div>
{/if}

<p class="mt-8 text-center text-sm text-ink-2">
	{#if mode === 'sign-in'}
		New here? <a
			class="font-semibold text-cyan"
			href="{resolve('/(auth)/sign-up')}{page.url.search}">Create an account</a
		>
	{:else}
		Already lifting with us? <a
			class="font-semibold text-cyan"
			href="{resolve('/(auth)/sign-in')}{page.url.search}">Sign in</a
		>
	{/if}
</p>
