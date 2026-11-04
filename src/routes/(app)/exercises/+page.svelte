<script lang="ts">
	import { resolve } from '$app/paths';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import NewExerciseForm from '#lib/components/NewExerciseForm.svelte';
	import { db } from '#lib/local/db.ts';
	import { MUSCLES, label } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Row = { id: string; name: string; primaryMuscle: string; custom: boolean };

	// Server list first; customs created on this phone (maybe not synced yet) are merged in.
	let exercises = $state<Row[]>([]);
	$effect(() => {
		const server: Row[] = data.exercises.map((e) => ({ ...e, custom: e.userId !== null }));
		exercises = server;
		void db.exercises
			.filter((e) => e.custom)
			.toArray()
			.then((local) => {
				const known = new Set(server.map((e) => e.id));
				const extra = local.filter((e) => !known.has(e.id));
				if (extra.length) exercises = sortByName([...server, ...extra]);
			});
	});

	const sortByName = (list: Row[]) => list.sort((a, b) => a.name.localeCompare(b.name));

	let query = $state('');
	let muscle = $state<string | null>(null);
	let creating = $state(false);
	// Render in pages so 850 rows don't all hit the DOM at once.
	let limit = $state(60);

	const filtered = $derived.by(() => {
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		return exercises.filter(
			(e) =>
				(!muscle || e.primaryMuscle === muscle) &&
				terms.every((t) => e.name.toLowerCase().includes(t))
		);
	});
</script>

<ScreenHeader title="Exercises" eyebrow="{exercises.length} in library">
	{#snippet actions()}
		<button
			class="glass mb-1 rounded-full px-3 py-1.5 text-xs font-semibold"
			onclick={() => (creating = true)}>+ New</button
		>
	{/snippet}
</ScreenHeader>

<div class="sticky top-0 z-10 -mx-4 mb-3 bg-night/40 px-4 pt-safe pb-3 backdrop-blur-xl">
	<label class="sr-only" for="ex-search">Search exercises</label>
	<input
		id="ex-search"
		class="field"
		type="search"
		placeholder="Search, e.g. incline db"
		autocomplete="off"
		bind:value={query}
		oninput={() => (limit = 60)}
	/>
	<div class="-mx-4 mt-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
		{#each [null, ...MUSCLES] as m (m ?? 'all')}
			<button
				class={[
					'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
					muscle === m ? 'text-night bg-primary-gradient' : 'glass'
				]}
				onclick={() => ((muscle = muscle === m ? null : m), (limit = 60))}
				>{m ? label(m) : 'All'}</button
			>
		{/each}
	</div>
</div>

{#if filtered.length === 0}
	<div class="py-10 text-center text-sm text-ink-2">
		<p>No exercises match “{query}”.</p>
		<button class="mt-3 font-semibold text-cyan" onclick={() => (creating = true)}
			>Create it as a custom exercise</button
		>
	</div>
{:else}
	<ul class="glass divide-y divide-white/[0.07] overflow-hidden">
		{#each filtered.slice(0, limit) as ex (ex.id)}
			<li>
				<a
					class="flex items-center justify-between gap-3 px-4 py-3"
					href={resolve('/(app)/exercises/[id]', { id: ex.id })}
				>
					<span class="truncate text-[0.9375rem]">{ex.name}</span>
					<span class="shrink-0 text-xs text-ink-3"
						>{ex.custom ? 'Custom' : label(ex.primaryMuscle)}</span
					>
				</a>
			</li>
		{/each}
	</ul>
	{#if filtered.length > limit}
		<button class="btn-glass mt-3 w-full" onclick={() => (limit += 120)}>
			Show more <span class="num text-ink-3">({filtered.length - limit})</span>
		</button>
	{/if}
{/if}

<Sheet bind:open={creating} title="New exercise">
	<NewExerciseForm
		initialName={query}
		oncancel={() => (creating = false)}
		oncreated={(ex) => {
			exercises = sortByName([...exercises, ex]);
			creating = false;
		}}
	/>
</Sheet>
