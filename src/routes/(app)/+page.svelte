<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Sheet from '#lib/components/Sheet.svelte';
	import { ask } from '#lib/confirm.svelte.ts';
	import { live } from '#lib/local/live.svelte.ts';
	import { hueFor, label } from '#lib/types.ts';
	import { units } from '#lib/units.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Template = (typeof data.templates)[number];

	const today = new Date();
	const todayIdx = (today.getDay() + 6) % 7;
	const firstName = $derived(data.user.name.split(' ')[0]);
	const dateLabel = today.toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'short'
	});

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

	const groups = $derived(
		[
			...data.folders.map((f) => ({
				id: f.id,
				name: f.name,
				templates: data.templates.filter((t) => t.folderId === f.id)
			})),
			{ id: null, name: null, templates: data.templates.filter((t) => !t.folderId) }
		].filter((g) => g.templates.length > 0)
	);

	let preview = $state<Template | null>(null);
	let previewOpen = $state(false);

	function open(t: Template) {
		preview = t;
		previewOpen = true;
	}

	// Tint the background with the previewed session's colour.
	$effect(() => {
		const hue = previewOpen && preview ? hueFor(preview.sessionType) : null;
		if (hue) document.documentElement.dataset.session = hue;
		return () => {
			delete document.documentElement.dataset.session;
		};
	});

	async function canReplaceLive() {
		return (
			!live.workout ||
			(await ask({
				title: 'Workout in progress',
				message: `Discard “${live.workout.name}” and start a new one?`,
				confirmLabel: 'Discard',
				danger: true
			}))
		);
	}

	async function startTemplate(t: Template) {
		if (!(await canReplaceLive())) return;
		await live.startFromTemplate(t);
		previewOpen = false;
		await goto(resolve('/(app)/workout'));
	}

	async function startEmpty() {
		if (!(await canReplaceLive())) return;
		await live.startEmpty();
		await goto(resolve('/(app)/workout'));
	}

	function ago(iso: string | null) {
		if (!iso) return 'Never used';
		const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
		if (days <= 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 14) return `${days} days ago`;
		return `${Math.floor(days / 7)} weeks ago`;
	}
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
<section class="mb-6">
	{#if live.workout}
		<a class="btn-primary w-full" href={resolve('/(app)/workout')}>Resume {live.workout.name}</a>
	{:else}
		<button class="btn-primary w-full" onclick={startEmpty}>
			<svg viewBox="0 0 24 24" class="size-5" fill="currentColor" aria-hidden="true"
				><path d="M7 4.5v15l12-7.5z" /></svg
			>
			Start an empty workout
		</button>
	{/if}
</section>

{#if data.lastWorkout}
	<section class="glass mb-8 p-4">
		<div class="mb-3 flex items-baseline justify-between">
			<p class="eyebrow">Last workout</p>
			<p class="text-xs text-ink-3">
				{new Date(data.lastWorkout.startedAt).toLocaleDateString('en-GB', {
					weekday: 'short',
					day: 'numeric',
					month: 'short'
				})}
			</p>
		</div>
		<p class="mb-3 font-semibold">{data.lastWorkout.name}</p>
		<dl class="grid grid-cols-3 gap-2">
			<div>
				<dt class="eyebrow">Time</dt>
				<dd class="num text-lg font-bold">{Math.round(data.lastWorkout.durationMs / 60000)}m</dd>
			</div>
			<div>
				<dt class="eyebrow">Volume</dt>
				<dd class="num text-lg font-bold">{units.volume(data.lastWorkout.volumeKg)}</dd>
			</div>
			<div>
				<dt class="eyebrow">Sets</dt>
				<dd class="num text-lg font-bold">{data.lastWorkout.sets}</dd>
			</div>
		</dl>
	</section>
{/if}

<!-- Templates -->
<section>
	<div class="mb-3 flex items-center justify-between">
		<h2 class="font-display text-lg font-extrabold">Templates</h2>
		<a
			class="glass rounded-full px-3 py-1.5 text-xs font-semibold"
			href={resolve('/(app)/templates/[id]', { id: 'new' })}>+ New</a
		>
	</div>

	{#if data.templates.length === 0}
		<div class="glass flex flex-col items-center gap-2 px-6 py-10 text-center">
			<p class="font-semibold">No templates yet</p>
			<p class="max-w-[16rem] text-sm text-ink-2">
				Build routines like Push A or Legs and start them in one tap.
			</p>
			<a class="btn-primary mt-3" href={resolve('/(app)/templates/[id]', { id: 'new' })}
				>Create a template</a
			>
		</div>
	{:else}
		{#each groups as group (group.id ?? 'none')}
			{#if group.name}<p class="mt-5 mb-2 eyebrow">Folder · {group.name}</p>{/if}
			<ul class="flex flex-col gap-3">
				{#each group.templates as t (t.id)}
					<li>
						<button class="glass w-full p-4 text-left active:scale-[0.99]" onclick={() => open(t)}>
							<div class="flex items-baseline justify-between gap-3">
								<h3 class="truncate font-semibold">{t.name}</h3>
								<span class="shrink-0 text-xs text-ink-3">{ago(t.lastUsedAt)}</span>
							</div>
							<p class="mt-1 line-clamp-2 text-sm text-ink-2">
								{t.exercises.map((e) => e.name.replace(/ \(.*\)$/, '')).join(' · ') ||
									'No exercises yet'}
							</p>
						</button>
					</li>
				{/each}
			</ul>
		{/each}
	{/if}
</section>

<Sheet bind:open={previewOpen} title={preview?.name}>
	{#if preview}
		<p class="mb-3 eyebrow">{label(preview.sessionType)} · {preview.exercises.length} exercises</p>
		<ul class="mb-2 flex flex-col">
			{#each preview.exercises as e, i (i)}
				<li class="flex justify-between gap-3 border-b border-white/[0.06] py-2.5 text-sm">
					<span class="truncate">{e.name}</span>
					<span class="shrink-0 num text-ink-2"
						>{e.sets.length} × {e.sets[0]?.targetReps ?? '—'}</span
					>
				</li>
			{/each}
		</ul>
	{/if}
	{#snippet footer()}
		{#if preview}
			<div class="mb-1 grid grid-cols-[auto_1fr] gap-3">
				<a class="btn-glass" href={resolve('/(app)/templates/[id]', { id: preview.id })}>Edit</a>
				<button class="btn-primary" onclick={() => preview && startTemplate(preview)}
					>Start workout</button
				>
			</div>
		{/if}
	{/snippet}
</Sheet>
