<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { ask } from '#lib/confirm.svelte.ts';
	import { db } from '#lib/local/db.ts';
	import { bootstrap, deleteWorkout, enqueue, flush } from '#lib/local/sync.ts';
	import { units } from '#lib/units.svelte.ts';
	import { RECORD_PRIORITY, type RecordType } from '#lib/records.ts';
	import { hueFor, volumeOf, type WorkoutDTO } from '#lib/types.ts';
	import { uuidv7 } from '#lib/uuid.ts';
	import MuscleMap from '#lib/components/MuscleMap.svelte';
	import { localMuscleLoad } from '#lib/local/muscles.ts';
	import { muscleLoad, type MuscleLoad } from '#lib/muscles.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type View = WorkoutDTO & {
		exerciseNames: Record<string, string>;
		records: { exerciseId: string; setId: string | null; type: RecordType }[];
		pending?: boolean;
	};

	let localCopy = $state<View | null>(null);
	let checkedLocal = $state(false);

	onMount(async () => {
		const w = await db.workouts.get(page.params.id!);
		if (w) {
			localCopy = {
				...w,
				records: (w.records ?? []).map((r) => ({
					exerciseId: r.exerciseId,
					setId: r.setId,
					type: r.type
				})),
				pending: w.synced === 0
			};
		}
		checkedLocal = true;
	});

	// A queued edit on this phone is newer than the server copy.
	const view = $derived<View | null>(localCopy?.pending ? localCopy : (data.workout ?? localCopy));

	// Server copy carries each exercise's muscles; a phone-only copy uses the cached library.
	let localLoad = $state<MuscleLoad>({});
	const load = $derived.by((): MuscleLoad => {
		const m = data.workout?.muscles;
		if (!view || view !== data.workout || !m) return localLoad;
		return muscleLoad(
			view.exercises.flatMap((e) =>
				m[e.exerciseId]
					? [
							{
								primaryMuscle: m[e.exerciseId].primary,
								secondaryMuscles: m[e.exerciseId].secondary,
								sets: e.sets
							}
						]
					: []
			)
		);
	});
	$effect(() => {
		if (view && view !== data.workout)
			void localMuscleLoad(view.exercises).then((l) => (localLoad = l));
	});

	$effect(() => {
		const hue = view ? hueFor(view.sessionType) : null;
		if (hue) document.documentElement.dataset.session = hue;
		return () => {
			delete document.documentElement.dataset.session;
		};
	});

	const sets = $derived(view?.exercises.flatMap((e) => e.sets) ?? []);
	const minutes = $derived(
		view
			? Math.max(
					1,
					Math.round(
						(new Date(view.finishedAt).getTime() - new Date(view.startedAt).getTime()) / 60000
					)
				)
			: 0
	);
	const when = $derived.by(() => {
		if (!view) return '';
		const t = (iso: string) =>
			new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
		const d = new Date(view.startedAt).toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
		return `${d} · ${t(view.startedAt)} – ${t(view.finishedAt)}`;
	});

	const RECORD_LABEL: Record<RecordType, string> = {
		EST_1RM: '1RM',
		HEAVIEST_WEIGHT: 'Heaviest',
		BEST_SET_VOLUME: 'Best set',
		MOST_REPS: 'Reps'
	};
	/** The headline PR label for a set, if it set one. */
	function prFor(setId: string) {
		const types = view?.records.filter((r) => r.setId === setId).map((r) => r.type) ?? [];
		const best = RECORD_PRIORITY.find((t) => types.includes(t));
		return best ? RECORD_LABEL[best] : null;
	}

	function setLabel(list: WorkoutDTO['exercises'][number]['sets'], j: number) {
		const t = list[j].type;
		if (t !== 'NORMAL') return t[0];
		return String(list.slice(0, j + 1).filter((s) => s.type === 'NORMAL').length);
	}

	// ─── Editing ───────────────────────────────────────────────────────────────

	let draft = $state<WorkoutDTO | null>(null);
	let saving = $state(false);

	function startEdit() {
		if (!view) return;
		const v = $state.snapshot(view);
		draft = {
			id: v.id,
			templateId: v.templateId,
			name: v.name,
			sessionType: v.sessionType,
			notes: v.notes,
			startedAt: v.startedAt,
			finishedAt: v.finishedAt,
			exercises: v.exercises
		};
	}

	function parse(value: string) {
		const n = Number(value.replace(',', '.'));
		return value.trim() === '' || Number.isNaN(n) || n < 0 ? null : n;
	}

	function addSet(i: number) {
		const ex = draft!.exercises[i];
		const last = ex.sets.at(-1);
		ex.sets.push({
			id: uuidv7(),
			type: 'NORMAL',
			weightKg: last?.weightKg ?? null,
			reps: last?.reps ?? null,
			completedAt: draft!.finishedAt
		});
	}

	async function save() {
		if (!draft || !view) return;
		const dto: WorkoutDTO = {
			...$state.snapshot(draft),
			name: draft.name.trim() || view.name
		};
		dto.exercises = dto.exercises.filter((e) => e.sets.length > 0);
		if (dto.exercises.length === 0) {
			await remove();
			return;
		}
		saving = true;
		await db.workouts.put({ ...dto, synced: 0, exerciseNames: view.exerciseNames, records: [] });
		localCopy = { ...dto, exerciseNames: view.exerciseNames, records: [], pending: true };
		draft = null;
		await enqueue('workout.save', dto);
		await flush();
		// Records and "previous" may have shifted; pull the server's view.
		await bootstrap();
		const synced = (await db.workouts.get(dto.id))?.synced === 1;
		if (synced) {
			localCopy = null;
			await invalidateAll();
		}
		saving = false;
	}

	async function cancelEdit() {
		const ok = await ask({
			title: 'Discard changes?',
			message: 'Your edits to this workout will be lost.',
			confirmLabel: 'Discard',
			cancelLabel: 'Keep editing',
			danger: true
		});
		if (ok) draft = null;
	}

	let templating = $state(false);
	let templateError = $state<string | null>(null);

	/** Turn this session into a template: same exercises, its numbers become the targets. */
	async function saveAsTemplate() {
		if (!view) return;
		templating = true;
		templateError = null;
		const id = uuidv7();
		try {
			const res = await fetch('/api/templates', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					id,
					name: view.name,
					sessionType: view.sessionType,
					folderId: null,
					notes: null,
					exercises: view.exercises.map((e) => ({
						exerciseId: e.exerciseId,
						restSec: e.restSec,
						notes: e.notes,
						supersetGroup: e.supersetGroup ?? null,
						sets: e.sets.map((s) => ({
							type: s.type,
							targetWeightKg: s.weightKg,
							targetReps: s.reps
						}))
					}))
				})
			});
			if (!res.ok) throw new Error();
			await goto(resolve('/(app)/templates/[id]', { id }));
		} catch {
			templateError = 'Could not create the template. Templates need signal.';
		} finally {
			templating = false;
		}
	}

	async function remove() {
		if (!view) return;
		const ok = await ask({
			title: `Delete “${view.name}”?`,
			message: 'This removes the workout and its sets from your history for good.',
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await deleteWorkout(view.id);
		await goto(resolve('/(app)/history'), { replace: true });
	}
</script>

<svelte:head><title>{view?.name ?? 'Workout'} · Dench</title></svelte:head>

{#if view}
	<header class="pt-safe pb-5">
		<div class="flex items-center justify-between pt-4 pb-4">
			{#if draft}
				<button class="text-sm font-semibold text-ink-2" onclick={cancelEdit}>Cancel</button>
				<button class="btn-primary !px-5 !py-2 text-sm" disabled={saving} onclick={save}
					>{saving ? 'Saving…' : 'Save'}</button
				>
			{:else}
				<a class="text-sm font-semibold text-ink-2" href={resolve('/(app)/history')}>‹ History</a>
				<button class="glass rounded-full px-4 py-1.5 text-xs font-semibold" onclick={startEdit}
					>Edit</button
				>
			{/if}
		</div>
		{#if draft}
			<label class="sr-only" for="w-name">Workout name</label>
			<input
				id="w-name"
				class="field font-display text-xl font-extrabold"
				bind:value={draft.name}
			/>
		{:else}
			<h1 class="font-display text-[2rem] leading-[1.05] font-extrabold tracking-tight">
				{view.name}
			</h1>
		{/if}
		<p class="mt-2 text-sm text-ink-2">{when}</p>
		{#if view.pending}
			<p class="mt-1 flex items-center gap-2 text-xs text-ember">
				<span class="size-1.5 rounded-full bg-ember"></span> Waiting to sync
			</p>
		{/if}
	</header>

	{#if !draft}
		<dl class="mb-4 grid grid-cols-3 gap-3">
			<div class="glass p-4">
				<dt class="eyebrow">Time</dt>
				<dd class="mt-1 num text-xl font-bold">{minutes}m</dd>
			</div>
			<div class="glass p-4">
				<dt class="eyebrow">Volume</dt>
				<dd class="mt-1 num text-xl font-bold">{units.volume(volumeOf(sets))}</dd>
			</div>
			<div class="glass p-4">
				<dt class="eyebrow">Sets</dt>
				<dd class="mt-1 num text-xl font-bold">{sets.length}</dd>
			</div>
		</dl>

		<div class="flex flex-col gap-3">
			{#each view.exercises as ex (ex.id)}
				<section class="glass p-4">
					<a
						class="mb-3 block truncate font-semibold"
						href={resolve('/(app)/exercises/[id]', { id: ex.exerciseId })}
						>{view.exerciseNames[ex.exerciseId] ?? 'Exercise'} <span class="text-ink-3">›</span></a
					>
					<ul class="flex flex-col gap-1.5">
						{#each ex.sets as s, j (s.id)}
							{@const pr = prFor(s.id)}
							<li class="flex items-center gap-3 num text-sm">
								<span
									class={[
										'w-5 text-center font-bold',
										s.type === 'WARMUP' ? 'text-ember' : 'text-ink-3'
									]}>{setLabel(ex.sets, j)}</span
								>
								<span class="flex-1">
									{#if s.weightKg !== null}{units.show(s.weightKg)}
										<span class="text-ink-3">{units.label} × </span>
									{/if}{s.reps ?? 0}
									{#if s.weightKg === null}<span class="text-ink-3">reps</span>{/if}
								</span>
								{#if pr}
									<span
										class="rounded-full bg-ember/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-ember"
										>★ {pr}</span
									>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>

		<section class="glass mt-3 p-4">
			<p class="mb-3 eyebrow">Muscles worked</p>
			<MuscleMap {load} />
		</section>

		<button class="btn-glass mt-6 w-full" onclick={saveAsTemplate} disabled={templating}
			>{templating ? 'Creating template…' : 'Save as template'}</button
		>
		{#if templateError}<p class="mt-2 text-sm text-ember">{templateError}</p>{/if}
		<button class="btn-glass mt-3 w-full text-ember" onclick={remove}>Delete workout</button>
	{:else}
		<div class="flex flex-col gap-3">
			{#each draft.exercises as ex, i (ex.id)}
				<section class="glass p-4">
					<div class="mb-3 flex items-center justify-between gap-3">
						<p class="truncate font-semibold">{view.exerciseNames[ex.exerciseId] ?? 'Exercise'}</p>
						<button
							class="shrink-0 text-xs font-semibold text-ember"
							onclick={() => draft!.exercises.splice(i, 1)}>Remove</button
						>
					</div>
					<div
						class="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2 text-center"
					>
						<span class="eyebrow">Set</span><span class="eyebrow">{units.label}</span><span
							class="eyebrow">Reps</span
						><span></span>
						{#each ex.sets as s, j (s.id)}
							<span
								class={['num text-sm font-bold', s.type === 'WARMUP' ? 'text-ember' : 'text-ink-2']}
								>{setLabel(ex.sets, j)}</span
							>
							<input
								class="h-10 w-full min-w-0 rounded-xl bg-white/[0.06] text-center num focus:bg-white/10 focus:outline-none"
								inputmode="decimal"
								placeholder="—"
								aria-label="{units.label}, set {j + 1}"
								value={units.show(s.weightKg) ?? ''}
								onchange={(e) => (s.weightKg = units.toKg(parse(e.currentTarget.value)))}
							/>
							<input
								class="h-10 w-full min-w-0 rounded-xl bg-white/[0.06] text-center num focus:bg-white/10 focus:outline-none"
								inputmode="numeric"
								placeholder="—"
								aria-label="Reps, set {j + 1}"
								value={s.reps ?? ''}
								onchange={(e) => {
									const n = parse(e.currentTarget.value);
									s.reps = n === null ? null : Math.round(n);
								}}
							/>
							<button
								class="grid h-10 place-items-center text-ink-3"
								aria-label="Remove set {j + 1}"
								onclick={() => ex.sets.splice(j, 1)}>×</button
							>
						{/each}
					</div>
					<button
						class="mt-3 w-full rounded-xl bg-white/[0.05] py-2.5 text-sm font-semibold text-ink-2"
						onclick={() => addSet(i)}>+ Add set</button
					>
				</section>
			{/each}
		</div>
	{/if}
{:else if checkedLocal}
	<div class="pt-16 pt-safe text-center">
		<p class="mb-4 text-ink-2">This workout isn't here any more.</p>
		<a class="btn-glass" href={resolve('/(app)/history')}>Back to history</a>
	</div>
{/if}
