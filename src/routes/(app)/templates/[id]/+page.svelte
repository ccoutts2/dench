<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ExercisePicker from '#lib/components/ExercisePicker.svelte';
	import { ask } from '#lib/confirm.svelte.ts';
	import { SESSION_TYPES, hueFor, label, type Muscle, type TemplateDTO } from '#lib/types.ts';
	import MuscleMap from '#lib/components/MuscleMap.svelte';
	import { muscleLoad } from '#lib/muscles.ts';
	import { uuidv7 } from '#lib/uuid.ts';
	import { units } from '#lib/units.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Row = TemplateDTO['exercises'][number] & {
		key: string;
		name: string;
		primaryMuscle: Muscle;
		secondaryMuscles?: Muscle[];
	};

	// Editable copy of the template; the page is keyed by id so this runs per template.
	// svelte-ignore state_referenced_locally
	const t = data.template;
	const id = t?.id ?? uuidv7();
	let name = $state(t?.name ?? '');
	let sessionType = $state<TemplateDTO['sessionType']>(t?.sessionType ?? 'OTHER');
	let folderChoice = $state<string>(t?.folderId ?? '');
	let newFolderName = $state('');
	let rows = $state<Row[]>(
		(t?.exercises ?? []).map((e) => ({ ...e, key: uuidv7(), sets: e.sets.map((s) => ({ ...s })) }))
	);

	let pickerOpen = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		const hue = hueFor(sessionType);
		if (hue) document.documentElement.dataset.session = hue;
		else delete document.documentElement.dataset.session;
		return () => {
			delete document.documentElement.dataset.session;
		};
	});

	function move(i: number, dir: -1 | 1) {
		if (i + dir < 0 || i + dir >= rows.length) return;
		[rows[i], rows[i + dir]] = [rows[i + dir], rows[i]];
	}

	const num = (v: string) => (v.trim() === '' ? null : Number(v));

	// ─── Supersets & set types ────────────────────────────────────────────────

	const linked = (i: number) =>
		!!rows[i]?.supersetGroup && rows[i + 1]?.supersetGroup === rows[i].supersetGroup;

	function toggleLink(i: number) {
		if (linked(i)) {
			const old = rows[i].supersetGroup;
			const fresh = uuidv7();
			for (let k = i + 1; k < rows.length && rows[k].supersetGroup === old; k++) {
				rows[k].supersetGroup = fresh;
			}
		} else {
			const g = rows[i].supersetGroup ?? uuidv7();
			const old = rows[i + 1].supersetGroup;
			rows[i].supersetGroup = rows[i + 1].supersetGroup = g;
			for (let k = i + 2; old && k < rows.length && rows[k].supersetGroup === old; k++) {
				rows[k].supersetGroup = g;
			}
		}
	}

	/** Groups that no longer join two neighbours (after moves/removals) are dropped. */
	function tidyGroups() {
		rows.forEach((r, k) => {
			if (r.supersetGroup && !linked(k) && !linked(k - 1)) r.supersetGroup = null;
		});
	}

	const TYPE_CYCLE = ['NORMAL', 'WARMUP', 'DROP', 'FAILURE'] as const;
	const typeLabel = (row: Row, j: number) => {
		const t = row.sets[j].type;
		if (t !== 'NORMAL') return t[0];
		return String(row.sets.slice(0, j + 1).filter((s) => s.type === 'NORMAL').length);
	};

	async function save() {
		error = null;
		if (!name.trim()) {
			error = 'Give the template a name.';
			return;
		}
		if (folderChoice === '__new' && !newFolderName.trim()) {
			error = 'Name the new folder.';
			return;
		}
		saving = true;
		tidyGroups();
		const body = {
			id,
			name: name.trim(),
			sessionType,
			folderId: folderChoice && folderChoice !== '__new' ? folderChoice : null,
			newFolderName: folderChoice === '__new' ? newFolderName.trim() : null,
			notes: null,
			exercises: rows.map(({ exerciseId, restSec, notes, supersetGroup, sets }) => ({
				exerciseId,
				restSec,
				notes,
				supersetGroup,
				sets
			}))
		};
		try {
			const res = await fetch('/api/templates', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				error = (await res.json().catch(() => null))?.message ?? 'Could not save. Try again.';
				return;
			}
			await invalidateAll();
			await goto(resolve('/(app)'));
		} catch {
			error = "You're offline. Templates save once you have signal.";
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (
			!t ||
			!(await ask({
				title: `Delete “${t.name}”?`,
				message: 'Past workouts from this template stay in your history.',
				confirmLabel: 'Delete',
				danger: true
			}))
		)
			return;
		const res = await fetch(`/api/templates/${t.id}`, { method: 'DELETE' }).catch(() => null);
		if (!res?.ok) {
			error = 'Could not delete. Check your connection.';
			return;
		}
		await invalidateAll();
		await goto(resolve('/(app)'));
	}
</script>

<svelte:head><title>{t ? 'Edit template' : 'New template'} · Dench</title></svelte:head>

<header class="flex items-center justify-between gap-3 pt-safe pb-4">
	<a class="text-sm text-ink-2" href={resolve('/(app)')}>Cancel</a>
	<p class="eyebrow">{t ? 'Edit template' : 'New template'}</p>
	<button
		class="text-sm font-semibold text-cyan disabled:opacity-50"
		onclick={save}
		disabled={saving}
	>
		{saving ? 'Saving…' : 'Save'}
	</button>
</header>

<input
	class="mb-4 w-full bg-transparent font-display text-[1.75rem] leading-tight font-extrabold tracking-tight placeholder:text-ink-3 focus:outline-none"
	placeholder="Template name"
	aria-label="Template name"
	bind:value={name}
/>

<div class="mb-4 grid grid-cols-2 gap-3">
	<label class="flex min-w-0 flex-col gap-1.5">
		<span class="eyebrow">Session</span>
		<select class="field appearance-none" bind:value={sessionType}>
			{#each SESSION_TYPES as s (s)}<option value={s}>{label(s)}</option>{/each}
		</select>
	</label>
	<label class="flex min-w-0 flex-col gap-1.5">
		<span class="eyebrow">Folder</span>
		<select class="field appearance-none" bind:value={folderChoice}>
			<option value="">None</option>
			{#each data.folders as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
			<option value="__new">+ New folder…</option>
		</select>
	</label>
</div>
{#if folderChoice === '__new'}
	<input class="field mb-4" placeholder="Folder name, e.g. PPL 6-day" bind:value={newFolderName} />
{/if}

{#if error}
	<p class="mb-4 rounded-xl bg-ember/15 px-3 py-2 text-sm text-ember" role="alert">{error}</p>
{/if}

<ul class="flex flex-col gap-3">
	{#each rows as row, i (row.key)}
		<li
			class={[
				'glass p-4',
				(linked(i) || linked(i - 1)) && 'border-l-2 !border-l-magenta',
				linked(i - 1) && '-mt-3 !rounded-t-md',
				linked(i) && '!rounded-b-md'
			]}
		>
			{#if linked(i) && !linked(i - 1)}
				<p class="mb-2 eyebrow !text-magenta">Superset</p>
			{/if}
			<div class="mb-3 flex items-start justify-between gap-2">
				<h3 class="min-w-0 text-gradient font-semibold break-words">{row.name}</h3>
				<div class="flex shrink-0 gap-1 text-ink-2">
					<button
						class="grid size-8 place-items-center rounded-lg bg-white/5 disabled:opacity-30"
						aria-label="Move up"
						disabled={i === 0}
						onclick={() => move(i, -1)}>↑</button
					>
					<button
						class="grid size-8 place-items-center rounded-lg bg-white/5 disabled:opacity-30"
						aria-label="Move down"
						disabled={i === rows.length - 1}
						onclick={() => move(i, 1)}>↓</button
					>
					<button
						class="grid size-8 place-items-center rounded-lg bg-white/5 text-ember"
						aria-label="Remove exercise"
						onclick={() => rows.splice(i, 1)}>✕</button
					>
				</div>
			</div>

			<div
				class="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2 text-center"
			>
				<span class="eyebrow">Set</span><span class="eyebrow">{units.label}</span><span
					class="eyebrow">Reps</span
				><span></span>
				{#each row.sets as set, j (j)}
					<button
						class={[
							'h-10 rounded-lg num text-sm font-bold',
							set.type === 'WARMUP'
								? 'text-ember'
								: set.type === 'NORMAL'
									? 'text-ink-2'
									: 'text-cyan'
						]}
						aria-label="Set {j + 1} type: {set.type.toLowerCase()}. Tap to change"
						onclick={() =>
							(set.type = TYPE_CYCLE[(TYPE_CYCLE.indexOf(set.type) + 1) % TYPE_CYCLE.length])}
						>{typeLabel(row, j)}</button
					>
					<input
						class="h-10 w-full min-w-0 rounded-xl bg-white/[0.06] text-center num focus:bg-white/10 focus:outline-none"
						inputmode="decimal"
						placeholder="—"
						aria-label="Target {units.label}, set {j + 1}"
						value={units.show(set.targetWeightKg) ?? ''}
						onchange={(e) => (set.targetWeightKg = units.toKg(num(e.currentTarget.value)))}
					/>
					<input
						class="h-10 w-full min-w-0 rounded-xl bg-white/[0.06] text-center num focus:bg-white/10 focus:outline-none"
						inputmode="numeric"
						placeholder="—"
						aria-label="Target reps, set {j + 1}"
						value={set.targetReps ?? ''}
						onchange={(e) => (set.targetReps = num(e.currentTarget.value))}
					/>
					<button
						class="grid h-10 place-items-center text-lg text-ink-3"
						aria-label="Remove set {j + 1}"
						onclick={() => row.sets.splice(j, 1)}>−</button
					>
				{/each}
			</div>
			<div class="mt-3 flex flex-wrap items-center justify-between gap-3">
				<button
					class="text-sm font-semibold text-cyan"
					onclick={() =>
						row.sets.push({
							...(row.sets.at(-1) ?? { type: 'NORMAL', targetWeightKg: null, targetReps: null })
						})}>+ Add set</button
				>
				<label class="flex items-center gap-2 text-xs text-ink-3">
					Rest
					<select
						class="rounded-lg bg-white/[0.06] px-2 py-1 text-ink"
						value={row.restSec ?? ''}
						onchange={(e) => (row.restSec = num(e.currentTarget.value))}
					>
						<option value="">Default</option>
						{#each [30, 60, 90, 120, 150, 180, 240, 300] as s (s)}
							<option value={s}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</option>
						{/each}
					</select>
				</label>
			</div>
		</li>
		{#if i < rows.length - 1}
			<li class="-my-1.5 flex justify-center">
				<button
					class={[
						'rounded-full px-3 py-1 text-xs font-semibold',
						linked(i) ? 'bg-magenta/20 text-magenta' : 'text-ink-3'
					]}
					aria-pressed={linked(i)}
					onclick={() => toggleLink(i)}>{linked(i) ? 'Superset ✓' : '+ Superset'}</button
				>
			</li>
		{/if}
	{/each}
</ul>
<p class="mt-2 px-1 text-xs text-ink-3">
	Tap a set number to make it a warm-up, drop or failure set.
</p>

<button class="btn-glass mt-4 w-full" onclick={() => (pickerOpen = true)}>+ Add exercises</button>

{#if rows.length}
	<section class="glass mt-4 p-4">
		<p class="mb-3 eyebrow">Muscles this template hits</p>
		<MuscleMap load={muscleLoad(rows)} />
	</section>
{/if}

{#if t}
	<button class="mt-8 w-full py-3 text-sm text-ember" onclick={remove}>Delete template</button>
{/if}

<ExercisePicker
	bind:open={pickerOpen}
	onpick={(list) => {
		for (const ex of list) {
			rows.push({
				key: uuidv7(),
				exerciseId: ex.id,
				name: ex.name,
				primaryMuscle: ex.primaryMuscle,
				secondaryMuscles: ex.secondaryMuscles ?? [],
				restSec: null,
				notes: null,
				supersetGroup: null,
				sets: Array.from({ length: 3 }, () => ({
					type: 'NORMAL' as const,
					targetWeightKg: null,
					targetReps: null
				}))
			});
		}
	}}
/>
