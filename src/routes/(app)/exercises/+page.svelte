<script lang="ts">
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const MUSCLES = [
		'CHEST',
		'BACK',
		'SHOULDERS',
		'BICEPS',
		'TRICEPS',
		'FOREARMS',
		'QUADS',
		'HAMSTRINGS',
		'GLUTES',
		'CALVES',
		'ABS',
		'TRAPS',
		'FULL_BODY',
		'CARDIO'
	] as const;
	const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ');

	let query = $state('');
	let muscle = $state<string | null>(null);

	const filtered = $derived.by(() => {
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		return data.exercises.filter(
			(e) =>
				(!muscle || e.primaryMuscle === muscle) &&
				terms.every((t) => e.name.toLowerCase().includes(t))
		);
	});

	// Render in pages so 850 rows don't all hit the DOM at once.
	let limit = $state(60);
	$effect(() => {
		void query;
		void muscle;
		limit = 60;
	});
</script>

<ScreenHeader title="Exercises" eyebrow="{data.exercises.length} in library" />

<div class="sticky top-0 z-10 -mx-4 mb-3 bg-night/40 px-4 pt-safe pb-3 backdrop-blur-xl">
	<label class="sr-only" for="ex-search">Search exercises</label>
	<input
		id="ex-search"
		class="field"
		type="search"
		placeholder="Search, e.g. incline db"
		autocomplete="off"
		bind:value={query}
	/>
	<div class="-mx-4 mt-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
		<button
			class={[
				'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
				!muscle ? 'text-night bg-primary-gradient' : 'glass rounded-full'
			]}
			onclick={() => (muscle = null)}>All</button
		>
		{#each MUSCLES as m (m)}
			<button
				class={[
					'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
					muscle === m ? 'text-night bg-primary-gradient' : 'glass rounded-full'
				]}
				onclick={() => (muscle = muscle === m ? null : m)}>{label(m)}</button
			>
		{/each}
	</div>
</div>

{#if filtered.length === 0}
	<p class="py-10 text-center text-sm text-ink-2">No exercises match “{query}”.</p>
{:else}
	<ul class="glass divide-y divide-white/[0.07] overflow-hidden">
		{#each filtered.slice(0, limit) as ex (ex.id)}
			<li class="flex items-center justify-between gap-3 px-4 py-3">
				<span class="truncate text-[0.9375rem]">{ex.name}</span>
				<span class="shrink-0 eyebrow !tracking-[0.08em]">{label(ex.primaryMuscle)}</span>
			</li>
		{/each}
	</ul>
	{#if filtered.length > limit}
		<button class="btn-glass mt-3 w-full" onclick={() => (limit += 120)}>
			Show more <span class="num text-ink-3">({filtered.length - limit})</span>
		</button>
	{/if}
{/if}
