<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { db } from '#lib/local/db.ts';
	import { onSyncChange, pendingDeletes } from '#lib/local/sync.ts';
	import { units } from '#lib/units.svelte.ts';
	import { hueFor, volumeOf, type SessionType } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Row = (typeof data.workouts)[number] & { pending?: boolean };

	/** Workouts held on this phone (some not on the server yet). */
	let local = $state<Row[]>([]);
	/** Deleted here, delete not yet on the server: hide them. */
	let deleted = $state(new Set<string>());
	let selectedDay = $state<number | null>(null);

	async function loadLocal() {
		deleted = await pendingDeletes();
		// All local copies, not just unsynced ones: if a sync lands after the server
		// list loaded, the workout would otherwise vanish from both.
		const rows = await db.workouts.toArray();
		local = rows.map((w) => ({
			id: w.id,
			name: w.name,
			sessionType: w.sessionType,
			startedAt: w.startedAt,
			durationMs: new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime(),
			volumeKg: volumeOf(w.exercises.flatMap((e) => e.sets)),
			exercises: w.exercises.map((e) => ({
				name: w.exerciseNames[e.exerciseId] ?? 'Exercise',
				sets: e.sets.length
			})),
			prs: [...new Set((w.records ?? []).map((r) => w.exerciseNames[r.exerciseId] ?? 'Exercise'))],
			pending: w.synced === 0
		}));
	}

	onMount(() => {
		void loadLocal();
		return onSyncChange((changed) => {
			void loadLocal();
			if (changed) void invalidateAll();
		});
	});

	const inMonth = (iso: string) => {
		const d = new Date(iso);
		return d.getFullYear() === data.year && d.getMonth() === data.month;
	};

	/** Everything in the shown month, by the phone's own calendar. */
	const monthRows = $derived.by((): Row[] => {
		// A queued edit on this phone beats the server copy; otherwise the server wins.
		const serverIds = new Set(data.workouts.map((w) => w.id));
		const edited = new Set(local.filter((p) => p.pending).map((p) => p.id));
		return [
			...local.filter((p) => p.pending || !serverIds.has(p.id)),
			...data.workouts.filter((w) => !edited.has(w.id))
		]
			.filter((w) => !deleted.has(w.id) && inMonth(w.startedAt))
			.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
	});

	const rows = $derived(
		selectedDay === null
			? monthRows
			: monthRows.filter((w) => new Date(w.startedAt).getDate() === selectedDay)
	);

	// ─── Calendar ──────────────────────────────────────────────────────────────

	const monthName = $derived(
		new Date(data.year, data.month, 1).toLocaleDateString('en-GB', {
			month: 'long',
			year: 'numeric'
		})
	);
	const today = new Date();
	const isCurrentMonth = $derived(
		data.year === today.getFullYear() && data.month === today.getMonth()
	);
	const canGoBack = $derived.by(() => {
		if (!data.firstWorkoutAt) return false;
		const f = new Date(data.firstWorkoutAt);
		return data.year * 12 + data.month > f.getFullYear() * 12 + f.getMonth();
	});

	/** Leading blanks (Monday start) then one cell per day. */
	const cells = $derived.by(() => {
		const lead = (new Date(data.year, data.month, 1).getDay() + 6) % 7;
		const days = new Date(data.year, data.month + 1, 0).getDate();
		const byDay: Record<number, SessionType[]> = {};
		for (const w of monthRows) (byDay[new Date(w.startedAt).getDate()] ??= []).push(w.sessionType);
		return [
			...Array.from({ length: lead }, () => null),
			...Array.from({ length: days }, (_, i) => ({ day: i + 1, types: byDay[i + 1] ?? [] }))
		];
	});

	const DOT: Record<string, string> = {
		push: 'bg-magenta',
		pull: 'bg-cyan',
		legs: 'bg-ember'
	};
	const dotFor = (t: SessionType) => DOT[hueFor(t) ?? ''] ?? 'bg-violet';

	function shiftMonth(delta: number) {
		const d = new Date(data.year, data.month + delta, 1);
		const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		selectedDay = null;
		// Same route, only the ?m= query changes, so resolve() covers the path.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(`${resolve('/(app)/history')}?m=${m}`, { replace: true, reset: false });
	}

	const day = (iso: string) =>
		new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
</script>

<ScreenHeader
	title="History"
	eyebrow="{monthRows.length} workout{monthRows.length === 1 ? '' : 's'} this month"
/>

<section class="glass mb-5 p-4">
	<div class="mb-3 flex items-center justify-between">
		<button
			class="grid size-9 place-items-center rounded-full text-ink-2 disabled:opacity-25"
			aria-label="Previous month"
			disabled={!canGoBack}
			onclick={() => shiftMonth(-1)}>‹</button
		>
		<p class="font-semibold">{monthName}</p>
		<button
			class="grid size-9 place-items-center rounded-full text-ink-2 disabled:opacity-25"
			aria-label="Next month"
			disabled={isCurrentMonth}
			onclick={() => shiftMonth(1)}>›</button
		>
	</div>
	<div class="grid grid-cols-7 gap-y-1 text-center">
		{#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as d, i (i)}
			<span class="pb-1 text-[0.6875rem] font-semibold text-ink-3">{d}</span>
		{/each}
		{#each cells as cell, i (i)}
			{#if cell}
				{@const isToday = isCurrentMonth && cell.day === today.getDate()}
				{@const trained = cell.types.length > 0}
				<button
					class={[
						'mx-auto flex h-11 w-10 flex-col items-center justify-center gap-1 rounded-xl num text-sm',
						selectedDay === cell.day
							? 'bg-white/15 font-bold'
							: trained
								? 'font-semibold'
								: 'text-ink-3',
						isToday && 'ring-1 ring-cyan/60'
					]}
					aria-label="{cell.day} {monthName}{trained
						? `, ${cell.types.length} workout${cell.types.length > 1 ? 's' : ''}`
						: ''}"
					aria-pressed={selectedDay === cell.day}
					disabled={!trained}
					onclick={() => (selectedDay = selectedDay === cell.day ? null : cell.day)}
				>
					{cell.day}
					<span class="flex h-1.5 gap-0.5">
						{#each cell.types.slice(0, 3) as t, k (k)}
							<span class={['size-1.5 rounded-full', dotFor(t)]}></span>
						{/each}
					</span>
				</button>
			{:else}
				<span></span>
			{/if}
		{/each}
	</div>
	<div class="mt-3 flex justify-center gap-4 text-[0.6875rem] text-ink-3">
		<span class="flex items-center gap-1.5"
			><span class="size-1.5 rounded-full bg-magenta"></span>Push</span
		>
		<span class="flex items-center gap-1.5"
			><span class="size-1.5 rounded-full bg-cyan"></span>Pull</span
		>
		<span class="flex items-center gap-1.5"
			><span class="size-1.5 rounded-full bg-ember"></span>Legs</span
		>
		<span class="flex items-center gap-1.5"
			><span class="size-1.5 rounded-full bg-violet"></span>Other</span
		>
	</div>
</section>

{#if selectedDay !== null}
	<div class="mb-2 flex items-center justify-between">
		<p class="eyebrow">{day(rows[0]?.startedAt ?? new Date().toISOString())}</p>
		<button class="text-xs font-semibold text-cyan" onclick={() => (selectedDay = null)}
			>Show whole month</button
		>
	</div>
{/if}

{#if rows.length === 0}
	<div class="glass flex flex-col items-center gap-2 px-6 py-12 text-center">
		<p class="font-semibold">No workouts in {monthName.split(' ')[0]}</p>
		<p class="max-w-[17rem] text-sm text-ink-2">
			Finished sessions land here with time, volume and sets.
		</p>
	</div>
{:else}
	<ul class="flex flex-col gap-3">
		{#each rows as w (w.id)}
			<li>
				<a class="glass block p-4" href={resolve('/(app)/history/[id]', { id: w.id })}>
					<div class="flex items-baseline justify-between gap-3">
						<h2 class="truncate font-semibold">{w.name}</h2>
						<span class="shrink-0 text-xs text-ink-3">{day(w.startedAt)}</span>
					</div>
					<p class="mt-1 text-sm text-ink-2">
						{Math.max(1, Math.round(w.durationMs / 60000))} min, {units.volume(w.volumeKg)}
						{#if w.prs.length}
							<span class="text-ember">, ★ {w.prs.length} PR{w.prs.length > 1 ? 's' : ''}</span>
						{/if}
						{#if w.pending}<span class="text-ember">, waiting to sync</span>{/if}
					</p>
					<ul class="mt-3 flex flex-col gap-1 text-sm text-ink-2">
						{#each w.exercises as e, i (i)}
							<li class="truncate">
								<span class="num text-ink-3">{e.sets} ×</span>
								{e.name}
								{#if w.prs.includes(e.name)}<span class="text-ember" aria-label="PR">★</span>{/if}
							</li>
						{/each}
					</ul>
				</a>
			</li>
		{/each}
	</ul>
{/if}
