<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const today = new Date();
	const todayIdx = (today.getDay() + 6) % 7;
	const firstName = $derived(data.user.name.split(' ')[0]);

	const week = $derived.by(() => {
		const start = new Date(data.weekStart);
		return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, i) => {
			const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
			return {
				letter,
				date: d.getDate(),
				done: data.trainedDays.includes(i),
				today: i === todayIdx
			};
		});
	});

	const dateLabel = today.toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'short'
	});
</script>

<header class="pt-safe pb-6">
	<p class="mb-2 eyebrow">{dateLabel}</p>
	<h1 class="font-display text-[2.6rem] leading-[0.98] font-extrabold tracking-tight">
		Hey,<br /><span class="text-gradient">{firstName}.</span>
	</h1>
</header>

<!-- Week strip -->
<section class="glass mb-4 p-3" aria-label="This week">
	<ol class="grid grid-cols-7 gap-1.5">
		{#each week as day, i (i)}
			<li
				class={[
					'flex flex-col items-center gap-1 rounded-xl py-2 text-xs',
					day.done && 'text-night shadow-[0_0_18px_-4px_rgb(62_230_255/0.7)] bg-primary-gradient',
					!day.done && day.today && 'bg-white/10 ring-1 ring-white/25',
					!day.done && !day.today && 'text-ink-3'
				]}
			>
				<span class="font-medium">{day.letter}</span>
				<span class="num text-sm font-bold">{day.done ? '✓' : day.date}</span>
			</li>
		{/each}
	</ol>
</section>

<!-- Quick start -->
<section class="mb-8">
	<button class="btn-primary w-full" disabled title="Live logging arrives in phase 2">
		<svg viewBox="0 0 24 24" class="size-5" fill="currentColor" aria-hidden="true"
			><path d="M7 4.5v15l12-7.5z" /></svg
		>
		Start an empty workout
	</button>
	<p class="mt-2 text-center text-xs text-ink-3">Live logging arrives in the next build.</p>
</section>

<!-- Templates -->
<section>
	<div class="mb-3 flex items-baseline justify-between">
		<h2 class="font-display text-lg font-extrabold">Templates</h2>
		<span class="num text-xs text-ink-3">{data.templateCount}</span>
	</div>
	{#if data.templateCount === 0}
		<div class="glass flex flex-col items-center gap-2 px-6 py-10 text-center">
			<div class="mb-2 grid size-12 place-items-center rounded-2xl text-night bg-primary-gradient">
				<svg
					viewBox="0 0 24 24"
					class="size-6"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg
				>
			</div>
			<p class="font-semibold">No templates yet</p>
			<p class="max-w-[16rem] text-sm text-ink-2">
				Build routines like Push A or Legs and start them in one tap. The template builder is coming
				in phase 2.
			</p>
		</div>
	{/if}
</section>
