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
	import { onMount } from 'svelte';
	import InstallGuide from '#lib/components/InstallGuide.svelte';
	import { PLATE_CHOICES } from '#lib/plates.ts';
	import {
		disablePush,
		enablePush,
		isIos,
		isStandalone,
		pushAvailable,
		pushEnabled
	} from '#lib/push.ts';
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

	let plates = $state<number[]>([]);
	const DEFAULT_PLATES = { KG: [25, 20, 15, 10, 5, 2.5, 1.25], LB: [45, 35, 25, 10, 5, 2.5] };
	const plateChoices = $derived(
		[...new Set([...PLATE_CHOICES[formUnits], ...plates])].sort((a, b) => b - a)
	);

	function openEdit() {
		formUnits = data.profile.units;
		bodyweight = inUnit(data.profile.bodyweightKg, formUnits);
		barWeight = inUnit(data.profile.barWeightKg, formUnits);
		plates = data.profile.plateSetKg.map((p) => Number(inUnit(p, formUnits)));
		editing = true;
	}

	function togglePlate(p: number) {
		plates = plates.includes(p) ? plates.filter((x) => x !== p) : [...plates, p];
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
		// Standard bars and plates differ by unit: swap to that unit's usual kit.
		const bar = Number(barWeight);
		barWeight = u === 'LB' && bar === 20 ? '45' : u === 'KG' && bar === 45 ? '20' : conv(barWeight);
		plates = [...DEFAULT_PLATES[u]];
		formUnits = u;
	}

	const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

	// ─── Rest alerts & install ───────────────────────────────────────────────

	let installOpen = $state(false);
	let installed = $state(false);
	let canPush = $state(false);
	let pushOn = $state(false);
	let pushBusy = $state(false);
	let pushNote = $state<string | null>(null);

	onMount(async () => {
		installed = isStandalone();
		canPush = pushAvailable();
		pushOn = await pushEnabled();
	});

	async function togglePush() {
		pushNote = null;
		if (isIos() && !installed) {
			installOpen = true;
			return;
		}
		pushBusy = true;
		try {
			if (pushOn) {
				await disablePush();
				pushOn = false;
			} else {
				pushOn = await enablePush();
				if (!pushOn) pushNote = 'Notifications are blocked. Allow them in Settings to get alerts.';
			}
		} catch {
			pushNote = "Couldn't turn alerts on. Try again with signal.";
		} finally {
			pushBusy = false;
		}
	}

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

<section class="glass mb-2 divide-y divide-white/[0.07] overflow-hidden">
	{#if canPush || isIos()}
		<button
			class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
			onclick={togglePush}
			disabled={pushBusy}
			aria-pressed={pushOn}
		>
			<span>
				<span class="block text-[0.9375rem]">Rest-over alerts</span>
				<span class="block text-xs text-ink-3"
					>{isIos() && !installed
						? 'Add Dench to your Home Screen first'
						: 'A notification when rest ends, even with the phone locked'}</span
				>
			</span>
			<span
				class={[
					'relative h-7 w-12 shrink-0 rounded-full transition',
					pushOn ? 'bg-primary-gradient' : 'bg-white/15'
				]}
			>
				<span
					class={[
						'absolute top-1 size-5 rounded-full bg-ink transition-all',
						pushOn ? 'left-6' : 'left-1'
					]}
				></span>
			</span>
		</button>
	{/if}
	<a
		class="flex items-center justify-between px-4 py-3.5"
		href={resolve('/api/export')}
		download
		data-sveltekit-reload
	>
		<span class="text-[0.9375rem]">Export CSV</span>
		<span class="text-ink-3">›</span>
	</a>
	<button
		class="flex w-full items-center justify-between px-4 py-3.5 text-left"
		onclick={() => (installOpen = true)}
	>
		<span class="text-[0.9375rem]">Add to Home Screen</span>
		<span class="text-sm text-ink-3">{installed ? 'Installed ✓' : 'How to ›'}</span>
	</button>
</section>
{#if pushNote}<p class="mb-2 px-1 text-xs text-ember">{pushNote}</p>{/if}
<div class="mb-6"></div>

<InstallGuide bind:open={installOpen} />

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

		<fieldset class="flex flex-col gap-1.5">
			<legend class="mb-1.5 eyebrow">Plates you have ({formUnits === 'KG' ? 'kg' : 'lb'})</legend>
			<div class="flex flex-wrap gap-2">
				{#each plateChoices as p (p)}
					<button
						type="button"
						aria-pressed={plates.includes(p)}
						class={[
							'min-w-12 rounded-full px-3 py-1.5 num text-sm font-semibold',
							plates.includes(p) ? 'text-night bg-primary-gradient' : 'bg-white/[0.06] text-ink-3'
						]}
						onclick={() => togglePlate(p)}>{p}</button
					>
				{/each}
			</div>
			{#each plates as p (p)}<input type="hidden" name="plates" value={p} />{/each}
		</fieldset>

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
