<script lang="ts">
	import Sheet from './Sheet.svelte';
	import NewExerciseForm from './NewExerciseForm.svelte';
	import { db } from '#lib/local/db.ts';
	import { bootstrap } from '#lib/local/sync.ts';
	import { MUSCLES, label, type LibraryExercise } from '#lib/types.ts';

	let {
		open = $bindable(false),
		onpick
	}: { open?: boolean; onpick: (list: LibraryExercise[]) => void } = $props();

	let library = $state<LibraryExercise[]>([]);
	let query = $state('');
	let muscle = $state<string | null>(null);
	let selected = $state<LibraryExercise[]>([]);
	let creating = $state(false);
	let limit = $state(80);

	$effect(() => {
		if (!open) return;
		selected = [];
		query = '';
		creating = false;
		void (async () => {
			if ((await db.exercises.count()) === 0) await bootstrap();
			library = await db.exercises.orderBy('name').toArray();
		})();
	});

	const filtered = $derived.by(() => {
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		return library.filter(
			(e) =>
				(!muscle || e.primaryMuscle === muscle) &&
				terms.every((t) => e.name.toLowerCase().includes(t))
		);
	});

	const isSelected = (id: string) => selected.some((s) => s.id === id);
	function toggle(ex: LibraryExercise) {
		selected = isSelected(ex.id) ? selected.filter((s) => s.id !== ex.id) : [...selected, ex];
	}

	function confirm() {
		onpick(selected);
		open = false;
	}
</script>

<Sheet bind:open title={creating ? 'New exercise' : 'Add exercises'} tall>
	{#if creating}
		<NewExerciseForm
			initialName={query}
			oncancel={() => (creating = false)}
			oncreated={(ex) => {
				library = [...library, ex].sort((a, b) => a.name.localeCompare(b.name));
				selected = [...selected, ex];
				creating = false;
			}}
		/>
	{:else}
		<div class="sticky top-0 z-10 -mx-5 bg-night/80 px-5 pb-3 backdrop-blur-xl">
			<div class="flex gap-2">
				<input
					class="field"
					type="search"
					placeholder="Search {library.length} exercises"
					aria-label="Search exercises"
					bind:value={query}
					oninput={() => (limit = 80)}
				/>
				<button class="btn-glass shrink-0 px-4" onclick={() => (creating = true)}>New</button>
			</div>
			<div class="-mx-5 mt-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5">
				{#each [null, ...MUSCLES] as m (m ?? 'all')}
					<button
						class={[
							'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
							muscle === m ? 'text-night bg-primary-gradient' : 'glass'
						]}
						onclick={() => ((muscle = m), (limit = 80))}>{m ? label(m) : 'All'}</button
					>
				{/each}
			</div>
		</div>

		<ul class="flex flex-col">
			{#each filtered.slice(0, limit) as ex (ex.id)}
				{@const on = isSelected(ex.id)}
				<li>
					<button
						class="flex w-full items-center gap-3 border-b border-white/[0.06] py-3 text-left"
						aria-pressed={on}
						onclick={() => toggle(ex)}
					>
						<span
							class={[
								'grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold transition',
								on ? 'border-transparent text-night bg-primary-gradient' : 'border-white/25'
							]}>{on ? '✓' : ''}</span
						>
						<span class="min-w-0 flex-1 truncate">{ex.name}</span>
						<span class="shrink-0 eyebrow">{ex.custom ? 'Custom' : label(ex.primaryMuscle)}</span>
					</button>
				</li>
			{/each}
		</ul>
		{#if filtered.length > limit}
			<button class="btn-glass mt-3 w-full" onclick={() => (limit += 150)}>Show more</button>
		{:else if filtered.length === 0 && library.length > 0}
			<div class="py-8 text-center text-sm text-ink-2">
				<p>Nothing matches “{query}”.</p>
				<button class="mt-3 font-semibold text-cyan" onclick={() => (creating = true)}
					>Create it as a custom exercise</button
				>
			</div>
		{/if}
	{/if}

	{#snippet footer()}
		{#if !creating}
			<button class="btn-primary mb-1 w-full" disabled={selected.length === 0} onclick={confirm}>
				{selected.length
					? `Add ${selected.length} exercise${selected.length > 1 ? 's' : ''}`
					: 'Select exercises'}
			</button>
		{/if}
	{/snippet}
</Sheet>
