<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import LineChart from '#lib/components/LineChart.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import { units } from '#lib/units.svelte.ts';
	import { MEASUREMENT_KINDS, label, type MeasurementKind } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const unitFor = (k: MeasurementKind) =>
		k === 'BODYWEIGHT' ? units.label : k === 'BODY_FAT' ? '%' : 'cm';
	/** Stored value → number shown in the user's unit. */
	const shown = (k: MeasurementKind, v: number) => (k === 'BODYWEIGHT' ? units.show(v)! : v);
	const fmt = (k: MeasurementKind, v: number) =>
		`${+shown(k, v).toFixed(1)}${unitFor(k) === '%' ? '%' : ` ${unitFor(k)}`}`;

	const byKind = $derived.by(() => {
		const map: Partial<Record<MeasurementKind, typeof data.measurements>> = {};
		for (const m of data.measurements) (map[m.kind] ??= []).push(m);
		return map;
	});

	let openKind = $state<MeasurementKind | null>(null);
	let sheetOpen = $state(false);
	let saving = $state(false);
	let value = $state('');
	const todayIso = () => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	};
	let date = $state(todayIso());

	function open(k: MeasurementKind) {
		openKind = k;
		value = '';
		date = todayIso();
		sheetOpen = true;
	}

	const entries = $derived(openKind ? (byKind[openKind] ?? []) : []);
	const points = $derived(
		openKind ? entries.map((e) => ({ x: e.measuredAt, y: shown(openKind!, e.value) })) : []
	);

	const day = (iso: string) =>
		new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<svelte:head><title>Body measurements · Dench</title></svelte:head>

<header class="pt-safe pb-5">
	<div class="pt-4 pb-4">
		<a class="text-sm font-semibold text-ink-2" href={resolve('/(app)/profile')}>‹ Profile</a>
	</div>
	<h1 class="font-display text-[2rem] leading-[1.05] font-extrabold tracking-tight">
		Body measurements
	</h1>
</header>

<ul class="glass divide-y divide-white/[0.07] overflow-hidden">
	{#each MEASUREMENT_KINDS as k (k)}
		{@const list = byKind[k] ?? []}
		{@const latest = list.at(-1)}
		{@const prev = list.at(-2)}
		<li>
			<button
				class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
				onclick={() => open(k)}
			>
				<span class="text-[0.9375rem]">{label(k)}</span>
				<span class="flex items-baseline gap-2 num text-sm">
					{#if latest}
						{#if prev}
							{@const delta = shown(k, latest.value) - shown(k, prev.value)}
							{#if Math.abs(delta) >= 0.05}
								<span class="text-xs text-ink-3"
									>{delta > 0 ? '+' : '−'}{Math.abs(delta).toFixed(1)}</span
								>
							{/if}
						{/if}
						<span>{fmt(k, latest.value)}</span>
					{:else}
						<span class="text-ink-3">Add</span>
					{/if}
					<span class="text-ink-3">›</span>
				</span>
			</button>
		</li>
	{/each}
</ul>

<Sheet bind:open={sheetOpen} title={openKind ? label(openKind) : ''}>
	{#if openKind}
		{#if points.length > 1}
			<div class="mt-6 mb-4">
				<LineChart
					{points}
					format={(y) =>
						`${+y.toFixed(1)}${unitFor(openKind!) === '%' ? '%' : ` ${unitFor(openKind!)}`}`}
					title="{label(openKind)} over time"
				/>
			</div>
		{/if}

		<form
			method="POST"
			action="?/add"
			class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 pt-2"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					await update({ reset: false });
					saving = false;
					if (result.type === 'success') value = '';
				};
			}}
		>
			<input type="hidden" name="kind" value={openKind} />
			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="eyebrow">Value ({unitFor(openKind)})</span>
				<input class="field num" name="value" inputmode="decimal" bind:value required />
			</label>
			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="eyebrow">Date</span>
				<input
					class="field num"
					type="date"
					name="date"
					max={todayIso()}
					bind:value={date}
					required
				/>
			</label>
			<button class="btn-primary col-span-2 mt-1" disabled={saving || !value.trim()}>Add</button>
		</form>
		{#if form?.error}<p class="mt-2 text-sm text-ember">{form.error}</p>{/if}

		{#if entries.length}
			<ul class="mt-5 divide-y divide-white/[0.07]">
				{#each [...entries].reverse() as e (e.id)}
					<li class="flex items-center justify-between gap-3 py-2.5">
						<span class="text-sm text-ink-2">{day(e.measuredAt)}</span>
						<span class="flex items-center gap-3">
							<span class="num text-sm">{fmt(openKind, e.value)}</span>
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={e.id} />
								<button
									class="text-xs font-semibold text-ember"
									aria-label="Delete {day(e.measuredAt)}">Delete</button
								>
							</form>
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-5 text-sm text-ink-3">No entries yet.</p>
		{/if}
	{/if}
</Sheet>
