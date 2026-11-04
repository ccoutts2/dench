<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import { authClient } from '#lib/auth-client.ts';
	import { ask } from '#lib/confirm.svelte.ts';
	import { bootstrap, clearLocal, pendingCount } from '#lib/local/sync.ts';
	import { units } from '#lib/units.svelte.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const initials = $derived(
		data.name
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
	const restText = (sec: number) =>
		sec === 0 ? 'Off' : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

	const rows = $derived([
		{ label: 'Units', value: units.label },
		{ label: 'Default rest', value: restText(data.profile.defaultRestSec) },
		{
			label: 'Bodyweight',
			value: data.profile.bodyweightKg ? units.fmt(data.profile.bodyweightKg) : '—'
		},
		{ label: 'Height', value: data.profile.heightCm ? `${data.profile.heightCm} cm` : '—' },
		{ label: 'Bar and plates', value: `${units.fmt(data.profile.barWeightKg)} bar` }
	]);

	// ─── Edit sheet ────────────────────────────────────────────────────────────

	let editing = $state(false);
	let saving = $state(false);
	let formUnits = $state<'KG' | 'LB'>('KG');
	let bodyweight = $state('');
	let barWeight = $state('');

	const KG_PER_LB = 0.45359237;
	const inUnit = (kg: number | null, u: 'KG' | 'LB') =>
		kg === null ? '' : String(u === 'KG' ? +kg.toFixed(2) : +(kg / KG_PER_LB).toFixed(1));

	function openEdit() {
		formUnits = data.profile.units;
		bodyweight = inUnit(data.profile.bodyweightKg, formUnits);
		barWeight = inUnit(data.profile.barWeightKg, formUnits);
		editing = true;
	}

	/** Switching units converts what's already typed, so nothing silently changes value. */
	function switchUnits(u: 'KG' | 'LB') {
		if (u === formUnits) return;
		const conv = (s: string) => {
			const n = Number(s.replace(',', '.'));
			if (s.trim() === '' || Number.isNaN(n)) return s;
			const kg = formUnits === 'KG' ? n : n * KG_PER_LB;
			return inUnit(kg, u);
		};
		bodyweight = conv(bodyweight);
		barWeight = conv(barWeight);
		formUnits = u;
	}

	const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

	let signingOut = $state(false);
	async function signOut() {
		const pending = await pendingCount();
		if (pending > 0) {
			const ok = await ask({
				title: 'Sign out anyway?',
				message: `${pending} change${pending > 1 ? 's' : ''} on this phone haven't synced yet and will be lost if you sign out now.`,
				confirmLabel: 'Sign out',
				danger: true
			});
			if (!ok) return;
		}
		signingOut = true;
		await authClient.signOut();
		await clearLocal();
		navigator.serviceWorker?.controller?.postMessage({ type: 'clear-user-cache' });
		await invalidateAll();
		await goto(resolve('/(auth)/sign-in'));
	}
</script>

<ScreenHeader title="Profile">
	{#snippet actions()}
		<button class="glass mb-1 rounded-full px-3 py-1.5 text-xs font-semibold" onclick={openEdit}
			>Edit</button
		>
	{/snippet}
</ScreenHeader>

<section class="glass mb-4 flex items-center gap-4 p-4">
	<div
		class="grid size-14 shrink-0 place-items-center rounded-2xl font-display text-lg font-extrabold text-night bg-primary-gradient"
	>
		{initials}
	</div>
	<div class="min-w-0">
		<p class="truncate text-lg font-semibold">{data.name}</p>
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

<section class="glass mb-4 divide-y divide-white/[0.07] overflow-hidden">
	{#each rows as row (row.label)}
		<button
			class="flex w-full items-center justify-between px-4 py-3.5 text-left"
			onclick={openEdit}
		>
			<span class="text-[0.9375rem]">{row.label}</span>
			<span class="num text-sm text-ink-2">{row.value}</span>
		</button>
	{/each}
</section>

<section class="glass mb-6 overflow-hidden">
	<a
		class="flex items-center justify-between px-4 py-3.5"
		href={resolve('/(app)/profile/measurements')}
	>
		<span class="text-[0.9375rem]">Body measurements</span>
		<span class="text-ink-3">›</span>
	</a>
</section>

<button class="btn-glass w-full text-ink-2" onclick={signOut} disabled={signingOut}>
	{signingOut ? 'Signing out…' : 'Sign out'}
</button>

<Sheet bind:open={editing} title="Edit profile">
	<form
		id="profile-form"
		method="POST"
		action="?/save"
		class="flex flex-col gap-4 pt-2"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				await update({ reset: false });
				saving = false;
				if (result.type === 'success') {
					editing = false;
					// Default rest and units live in the phone's cache too.
					void bootstrap();
				}
			};
		}}
	>
		<label class="flex flex-col gap-1.5">
			<span class="eyebrow">Name</span>
			<input class="field" name="name" value={data.name} autocomplete="name" required />
		</label>

		<fieldset class="flex flex-col gap-1.5">
			<legend class="mb-1.5 eyebrow">Units</legend>
			<input type="hidden" name="units" value={formUnits} />
			<div class="flex gap-1 rounded-full bg-white/[0.05] p-1">
				{#each [['KG', 'Kilograms'], ['LB', 'Pounds']] as const as [u, name] (u)}
					<button
						type="button"
						aria-pressed={formUnits === u}
						class={[
							'flex-1 rounded-full py-2 text-sm font-semibold',
							formUnits === u ? 'bg-white/15' : 'text-ink-3'
						]}
						onclick={() => switchUnits(u)}>{name}</button
					>
				{/each}
			</div>
		</fieldset>

		<label class="flex flex-col gap-1.5">
			<span class="eyebrow">Default rest</span>
			<select class="field" name="defaultRestSec" value={String(data.profile.defaultRestSec)}>
				{#each REST_OPTIONS as s (s)}
					<option value={String(s)}>{restText(s)}</option>
				{/each}
			</select>
		</label>

		<div class="grid grid-cols-2 gap-3">
			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="eyebrow">Bodyweight ({formUnits === 'KG' ? 'kg' : 'lb'})</span>
				<input class="field num" name="bodyweight" inputmode="decimal" bind:value={bodyweight} />
			</label>
			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="eyebrow">Height (cm)</span>
				<input
					class="field num"
					name="heightCm"
					inputmode="decimal"
					value={data.profile.heightCm ?? ''}
				/>
			</label>
		</div>

		<label class="flex flex-col gap-1.5">
			<span class="eyebrow">Bar weight ({formUnits === 'KG' ? 'kg' : 'lb'})</span>
			<input class="field num" name="barWeight" inputmode="decimal" bind:value={barWeight} />
		</label>

		{#if form?.error}<p class="text-sm text-ember">{form.error}</p>{/if}
	</form>

	{#snippet footer()}
		<div class="flex gap-3 pb-3">
			<button type="button" class="btn-glass flex-1" onclick={() => (editing = false)}
				>Cancel</button
			>
			<button form="profile-form" class="btn-primary flex-1" disabled={saving}
				>{saving ? 'Saving…' : 'Save'}</button
			>
		</div>
	{/snippet}
</Sheet>
