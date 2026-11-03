<script lang="ts">
	import { db } from '#lib/local/db.ts';
	import { enqueue } from '#lib/local/sync.ts';
	import { EQUIPMENT, MUSCLES, label, type LibraryExercise } from '#lib/types.ts';
	import { uuidv7 } from '#lib/uuid.ts';

	let {
		initialName = '',
		oncreated,
		oncancel
	}: {
		initialName?: string;
		oncreated: (ex: LibraryExercise) => void;
		oncancel: () => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(initialName);
	let equipment = $state<LibraryExercise['equipment']>('BARBELL');
	let primaryMuscle = $state<LibraryExercise['primaryMuscle']>('CHEST');
	let error = $state<string | null>(null);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		const full = `${trimmed} (${label(equipment)})`;
		const clash = await db.exercises.where('name').equalsIgnoreCase(full).first();
		if (clash) {
			error = `“${full}” is already in your library.`;
			return;
		}
		const ex: LibraryExercise = {
			id: uuidv7(),
			name: full,
			equipment,
			primaryMuscle,
			kind: equipment === 'BODYWEIGHT' ? 'BODYWEIGHT_REPS' : 'WEIGHT_REPS',
			custom: true
		};
		await db.exercises.put(ex);
		await enqueue('exercise.upsert', {
			id: ex.id,
			name: ex.name,
			equipment: ex.equipment,
			primaryMuscle: ex.primaryMuscle,
			kind: ex.kind
		});
		oncreated(ex);
	}
</script>

<form class="flex flex-col gap-3" onsubmit={submit}>
	<label class="flex flex-col gap-1.5">
		<span class="eyebrow">Name</span>
		<!-- svelte-ignore a11y_autofocus -->
		<input class="field" placeholder="e.g. Pendlay Row" required bind:value={name} autofocus />
	</label>
	<label class="flex flex-col gap-1.5">
		<span class="eyebrow">Equipment</span>
		<select class="field appearance-none" bind:value={equipment}>
			{#each EQUIPMENT as eq (eq)}<option value={eq}>{label(eq)}</option>{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1.5">
		<span class="eyebrow">Main muscle</span>
		<select class="field appearance-none" bind:value={primaryMuscle}>
			{#each MUSCLES as m (m)}<option value={m}>{label(m)}</option>{/each}
		</select>
	</label>
	{#if error}<p class="text-sm text-ember" role="alert">{error}</p>{/if}
	<div class="mt-1 grid grid-cols-2 gap-3">
		<button type="button" class="btn-glass" onclick={oncancel}>Cancel</button>
		<button type="submit" class="btn-primary">Create</button>
	</div>
</form>
