<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { authClient } from '#lib/auth-client.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initials = $derived(
		data.user.name
			.split(/\s+/)
			.map((p) => p[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
	const since = $derived(
		data.profile.liftingSince
			? new Date(data.profile.liftingSince).toLocaleDateString('en-GB', {
					month: 'long',
					year: 'numeric'
				})
			: null
	);
	const rest = $derived(
		`${Math.floor(data.profile.defaultRestSec / 60)}:${String(data.profile.defaultRestSec % 60).padStart(2, '0')}`
	);

	const rows = $derived([
		{ label: 'Units', value: data.profile.units === 'KG' ? 'kg' : 'lb' },
		{ label: 'Default rest', value: rest },
		{
			label: 'Bodyweight',
			value: data.profile.bodyweightKg ? `${data.profile.bodyweightKg} kg` : '—'
		},
		{ label: 'Height', value: data.profile.heightCm ? `${data.profile.heightCm} cm` : '—' },
		{ label: 'Bar and plates', value: `${data.profile.barWeightKg} kg bar` }
	]);

	let signingOut = $state(false);
	async function signOut() {
		signingOut = true;
		await authClient.signOut();
		navigator.serviceWorker?.controller?.postMessage({ type: 'clear-user-cache' });
		await invalidateAll();
		await goto(resolve('/(auth)/sign-in'));
	}
</script>

<ScreenHeader title="Profile" />

<section class="glass mb-4 flex items-center gap-4 p-4">
	<div
		class="grid size-14 shrink-0 place-items-center rounded-2xl font-display text-lg font-extrabold text-night bg-primary-gradient"
	>
		{initials}
	</div>
	<div class="min-w-0">
		<p class="truncate text-lg font-semibold">{data.user.name}</p>
		<p class="truncate text-sm text-ink-2">{since ? `Lifting since ${since}` : data.user.email}</p>
	</div>
</section>

<section class="mb-4 grid grid-cols-2 gap-3">
	<div class="glass p-4">
		<p class="num text-2xl font-bold">{data.stats.workouts}</p>
		<p class="mt-1 eyebrow">Workouts</p>
	</div>
	<div class="glass p-4">
		<p class="num text-2xl font-bold text-ember">{data.stats.prs}</p>
		<p class="mt-1 eyebrow">PRs</p>
	</div>
</section>

<section class="glass mb-2 divide-y divide-white/[0.07] overflow-hidden">
	{#each rows as row (row.label)}
		<div class="flex items-center justify-between px-4 py-3.5">
			<span class="text-[0.9375rem]">{row.label}</span>
			<span class="num text-sm text-ink-2">{row.value}</span>
		</div>
	{/each}
</section>
<p class="mb-6 px-1 text-xs text-ink-3">
	Editing settings and body measurements arrive in phase 3.
</p>

<button class="btn-glass w-full text-ink-2" onclick={signOut} disabled={signingOut}>
	{signingOut ? 'Signing out…' : 'Sign out'}
</button>
