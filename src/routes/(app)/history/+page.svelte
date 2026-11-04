<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { ask } from '#lib/confirm.svelte.ts';
	import { db } from '#lib/local/db.ts';
	import { deleteWorkout, onSyncChange, pendingDeletes } from '#lib/local/sync.ts';
	import { formatVolume, volumeOf } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Row = (typeof data.workouts)[number] & { pending?: boolean };

	/** Workouts held on this phone (some not on the server yet). */
	let pending = $state<Row[]>([]);
	/** Deleted here, delete not yet on the server: hide them. */
	let deleted = $state(new Set<string>());

	async function loadPending() {
		deleted = await pendingDeletes();
		// All local copies, not just unsynced ones: if a sync lands after the server
		// list loaded, the workout would otherwise vanish from both.
		const local = await db.workouts.toArray();
		pending = local.map((w) => ({
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
			pending: w.synced === 0
		}));
	}

	onMount(() => {
		void loadPending();
		return onSyncChange((changed) => {
			void loadPending();
			if (changed) void invalidateAll();
		});
	});

	const rows = $derived.by(() => {
		const serverIds = new Set(data.workouts.map((w) => w.id));
		return [...pending.filter((p) => !serverIds.has(p.id)), ...data.workouts]
			.filter((w) => !deleted.has(w.id))
			.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
	});

	async function remove(w: Row) {
		const ok = await ask({
			title: `Delete “${w.name}”?`,
			message: 'This removes the workout and its sets from your history for good.',
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		deleted = new Set([...deleted, w.id]);
		await deleteWorkout(w.id);
		await invalidateAll();
	}

	const groups = $derived.by(() => {
		const out: { month: string; items: Row[] }[] = [];
		for (const r of rows) {
			const month = new Date(r.startedAt).toLocaleDateString('en-GB', {
				month: 'long',
				year: 'numeric'
			});
			if (out.at(-1)?.month !== month) out.push({ month, items: [] });
			out.at(-1)!.items.push(r);
		}
		return out;
	});
</script>

<ScreenHeader title="History" eyebrow="{rows.length} workout{rows.length === 1 ? '' : 's'}" />

{#if rows.length === 0}
	<div class="glass flex flex-col items-center gap-2 px-6 py-12 text-center">
		<p class="font-semibold">No workouts yet</p>
		<p class="max-w-[17rem] text-sm text-ink-2">
			Finished sessions land here with time, volume and sets.
		</p>
	</div>
{:else}
	{#each groups as g (g.month)}
		<p class="mt-2 mb-2 eyebrow">{g.month}</p>
		<ul class="mb-4 flex flex-col gap-3">
			{#each g.items as w (w.id)}
				<li class="glass p-4">
					<div class="flex items-baseline justify-between gap-3">
						<h2 class="truncate font-semibold">{w.name}</h2>
						<span class="shrink-0 text-xs text-ink-3">
							{new Date(w.startedAt).toLocaleDateString('en-GB', {
								weekday: 'short',
								day: 'numeric',
								month: 'short'
							})}
						</span>
					</div>
					<p class="mt-1 num text-xs text-ink-2">
						{Math.max(1, Math.round(w.durationMs / 60000))} min · {formatVolume(w.volumeKg)}
						{#if w.pending}<span class="ml-1 text-ember">· waiting to sync</span>{/if}
					</p>
					<ul class="mt-3 flex flex-col gap-1 text-sm text-ink-2">
						{#each w.exercises as e, i (i)}
							<li class="truncate"><span class="num text-ink-3">{e.sets} ×</span> {e.name}</li>
						{/each}
					</ul>
					<div class="mt-3 flex justify-end border-t border-white/[0.07] pt-3">
						<button
							class="text-xs font-semibold text-ember"
							aria-label="Delete {w.name}"
							onclick={() => remove(w)}>Delete</button
						>
					</div>
				</li>
			{/each}
		</ul>
	{/each}
{/if}
