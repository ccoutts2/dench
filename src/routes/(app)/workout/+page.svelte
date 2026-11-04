<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ExercisePicker from '#lib/components/ExercisePicker.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import PlateSheet from '#lib/components/PlateSheet.svelte';
	import { live } from '#lib/local/live.svelte.ts';
	import { db, type LiveExercise } from '#lib/local/db.ts';
	import { unlockAudio } from '#lib/chime.ts';
	import { ask } from '#lib/confirm.svelte.ts';
	import { SESSION_TYPES, SET_TYPES, formatDuration, hueFor, label } from '#lib/types.ts';
	import { units } from '#lib/units.svelte.ts';

	let now = $state(Date.now());
	let pickerOpen = $state(false);
	let menuFor = $state<number | null>(null);
	let menuOpen = $state(false);
	let finishOpen = $state(false);
	/** Set whose type menu is open. */
	let setMenu = $state<{ i: number; j: number } | null>(null);
	let setMenuOpen = $state(false);
	let platesOpen = $state(false);
	let platesKg = $state<number | null>(null);
	let noteDraft = $state('');
	let finishing = $state(false);

	const w = $derived(live.workout);
	const elapsed = $derived(w ? now - new Date(w.startedAt).getTime() : 0);
	const restLeft = $derived(w?.rest ? Math.max(0, w.rest.endsAt - now) : 0);
	const restProgress = $derived(w?.rest ? restLeft / (w.rest.totalSec * 1000) : 0);
	const unticked = $derived(
		w?.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.completedAt).length, 0) ?? 0
	);
	const ticked = $derived(
		w?.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completedAt).length, 0) ?? 0
	);

	// No workout in progress (e.g. opened /workout directly): go home.
	$effect(() => {
		if (live.loaded && !live.workout && !finishing)
			void goto(resolve('/(app)'), { replaceState: true });
	});

	$effect(() => {
		const hue = w ? hueFor(w.sessionType) : null;
		if (hue) document.documentElement.dataset.session = hue;
		else delete document.documentElement.dataset.session;
		return () => {
			delete document.documentElement.dataset.session;
		};
	});

	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 250);

		// Keep the screen on mid-set (Safari 18.4+). The lock drops when the app is
		// backgrounded, so take it again on return.
		let lock: WakeLockSentinel | null = null;
		const acquire = async () => {
			try {
				if (document.visibilityState === 'visible')
					lock = await navigator.wakeLock?.request('screen');
			} catch {
				// unsupported or denied: fine
			}
		};
		void acquire();
		document.addEventListener('visibilitychange', acquire);

		return () => {
			clearInterval(id);
			document.removeEventListener('visibilitychange', acquire);
			void lock?.release();
		};
	});

	/** "1, 2, 3" for working sets; W, D, F for warm-up, drop and failure sets. */
	function setLabel(ex: LiveExercise, j: number) {
		const t = ex.sets[j].type;
		if (t === 'WARMUP') return 'W';
		if (t === 'DROP') return 'D';
		if (t === 'FAILURE') return 'F';
		return String(ex.sets.slice(0, j + 1).filter((s) => s.type === 'NORMAL').length);
	}

	const SET_TYPE_LABEL = {
		NORMAL: 'Working set',
		WARMUP: 'Warm-up',
		DROP: 'Drop set',
		FAILURE: 'To failure'
	} as const;

	/** Superset letters (A, B, …) for exercises that are joined to a neighbour. */
	const supersets = $derived.by(() => {
		const out: { letter: string | null; first: boolean; last: boolean }[] = [];
		let n = 0;
		w?.exercises.forEach((_, k) => {
			const withPrev = k > 0 && live.linkedToNext(k - 1);
			const withNext = live.linkedToNext(k);
			if (!withPrev && withNext) n++;
			out.push({
				letter: withPrev || withNext ? String.fromCharCode(64 + n) : null,
				first: !withPrev && withNext,
				last: withPrev && !withNext
			});
		});
		return out;
	});

	// Plates only make sense for bar exercises. Equipment comes from the cached
	// library; the "(Barbell)" style name suffix covers anything not cached.
	const BAR_EQUIPMENT = new Set(['BARBELL', 'SMITH_MACHINE', 'EZ_BAR', 'TRAP_BAR']);
	let equipment = $state<Record<string, string>>({});
	$effect(() => {
		const ids = w?.exercises.map((e) => e.exerciseId) ?? [];
		void db.exercises.bulkGet(ids).then((rows) => {
			equipment = Object.fromEntries(rows.flatMap((r) => (r ? [[r.id, r.equipment]] : [])));
		});
	});
	const usesPlates = (ex: LiveExercise) =>
		BAR_EQUIPMENT.has(equipment[ex.exerciseId]) ||
		/\((Barbell|Smith Machine|EZ Bar|Trap Bar)\)$/.test(ex.name);

	/** Weight to open the plate calculator with: the next set to do. */
	function openPlates(ex: LiveExercise) {
		const s = ex.sets.find((x) => !x.completedAt) ?? ex.sets.at(-1);
		const j = s ? ex.sets.indexOf(s) : 0;
		platesKg = s?.weightKg ?? s?.targetWeightKg ?? live.previousFor(ex, j)?.weightKg ?? null;
		platesOpen = true;
	}

	function prevText(ex: LiveExercise, j: number) {
		const p = live.previousFor(ex, j);
		if (!p || (p.weightKg === null && p.reps === null)) return '—';
		return p.weightKg !== null ? `${units.show(p.weightKg)} × ${p.reps ?? 0}` : `${p.reps} reps`;
	}

	function placeholder(ex: LiveExercise, j: number, field: 'weightKg' | 'reps') {
		const set = ex.sets[j];
		const target = field === 'weightKg' ? set.targetWeightKg : set.targetReps;
		const v = target ?? live.previousFor(ex, j)?.[field] ?? null;
		if (v === null) return '';
		return String(field === 'weightKg' ? units.show(v) : v);
	}

	function parse(value: string) {
		const n = Number(value.replace(',', '.'));
		return value.trim() === '' || Number.isNaN(n) ? null : n;
	}

	function tick(i: number, j: number) {
		unlockAudio();
		void live.toggleSet(i, j);
	}

	async function finish() {
		finishing = true;
		const id = await live.finish();
		finishOpen = false;
		if (id) await goto(resolve('/(app)/workout/done/[id]', { id }), { replaceState: true });
		else finishing = false;
	}

	async function discard() {
		finishOpen = false;
		const ok = await ask({
			title: 'Discard workout?',
			message: 'Nothing from this session will be saved.',
			confirmLabel: 'Discard',
			danger: true
		});
		if (!ok) return;
		finishing = true; // stops the "no workout" redirect racing this one
		await live.discard();
		await goto(resolve('/(app)'), { replaceState: true });
	}
</script>

<svelte:head><title>{w?.name ?? 'Workout'} · Dench</title></svelte:head>

{#if w}
	<header class="sticky top-0 z-20 -mx-4 mb-4 bg-night/40 px-4 pt-safe pb-3 backdrop-blur-xl">
		<div class="flex items-center justify-between gap-3">
			<a
				class="glass grid size-10 place-items-center !rounded-full text-ink"
				href={resolve('/(app)')}
				aria-label="Minimise workout"
				><svg
					class="size-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
				></a
			>
			{#if w.rest}
				<!-- Rest countdown sits in the header so it never covers a button. -->
				<button
					class="glass flex items-center gap-2 rounded-full py-1 pr-3 pl-1 glass-strong"
					aria-label="Expand rest timer"
					onclick={() => (live.restExpanded = true)}
				>
					<span
						class="size-7 rounded-full"
						style="background: conic-gradient(from -90deg, var(--color-violet), var(--color-cyan) {restProgress *
							360}deg, rgb(255 255 255 / 0.1) 0); mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px)); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));"
					></span>
					<span class="num font-bold text-cyan">{formatDuration(restLeft + 999)}</span>
				</button>
			{:else}
				<p class="num text-lg font-bold">{formatDuration(elapsed)}</p>
			{/if}
			<button class="btn-primary h-9 rounded-xl px-4 text-sm" onclick={() => (finishOpen = true)}
				>Finish</button
			>
		</div>
	</header>

	<input
		class="w-full bg-transparent font-display text-[1.75rem] leading-tight font-extrabold tracking-tight focus:outline-none"
		aria-label="Workout name"
		value={w.name}
		onchange={(e) => live.rename(e.currentTarget.value)}
	/>
	<select
		class="mt-1 mb-5 bg-transparent text-sm font-medium text-ink-2 focus:outline-none"
		aria-label="Session type"
		value={w.sessionType}
		onchange={(e) => live.setSessionType(e.currentTarget.value as (typeof SESSION_TYPES)[number])}
	>
		{#each SESSION_TYPES as s (s)}<option value={s}>{label(s)} session</option>{/each}
	</select>

	<ul class="flex flex-col gap-4">
		{#each w.exercises as ex, i (ex.id)}
			{@const ss = supersets[i]}
			<li
				class={[
					'glass p-4',
					ss?.letter && 'border-l-2 !border-l-magenta',
					ss?.letter && !ss.first && '-mt-2.5 !rounded-t-md',
					ss?.letter && !ss.last && '!rounded-b-md'
				]}
			>
				{#if ss?.first}
					<p class="mb-2 eyebrow !text-magenta">Superset {ss.letter}</p>
				{/if}
				<div class="mb-3 flex items-start justify-between gap-2">
					<h2 class="min-w-0 text-gradient font-semibold">{ex.name}</h2>
					<div class="-mt-1 -mr-1 flex shrink-0 items-center gap-1">
						{#if usesPlates(ex)}
							<button
								class="h-8 rounded-full bg-white/[0.06] px-3 text-xs font-semibold text-ink-2"
								aria-label="Plate calculator"
								onclick={() => openPlates(ex)}>Plates</button
							>
						{/if}
						<button
							class="grid size-8 place-items-center rounded-lg text-ink-2"
							aria-label="Exercise options"
							onclick={() => ((menuFor = i), (noteDraft = ex.notes ?? ''), (menuOpen = true))}
							>⋯</button
						>
					</div>
				</div>
				{#if ex.notes}
					<p class="-mt-2 mb-3 text-sm text-ink-2 italic">{ex.notes}</p>
				{/if}

				<div
					class="grid grid-cols-[2rem_minmax(0,1fr)_4.25rem_3.5rem_2.75rem] items-center gap-x-2 gap-y-2 text-center"
				>
					<span class="eyebrow">Set</span>
					<span class="eyebrow">Previous</span>
					<span class="eyebrow">{units.label}</span>
					<span class="eyebrow">Reps</span>
					<span class="eyebrow">✓</span>

					{#each ex.sets as set, j (set.id)}
						{@const done = !!set.completedAt}
						<button
							class={[
								'h-10 rounded-lg num text-sm font-bold',
								set.type === 'WARMUP'
									? 'text-ember'
									: set.type === 'NORMAL'
										? 'text-ink-2'
										: 'text-cyan'
							]}
							aria-label="Set {j + 1} options"
							onclick={() => ((setMenu = { i, j }), (setMenuOpen = true))}>{setLabel(ex, j)}</button
						>
						<span class="truncate num text-xs text-ink-3">{prevText(ex, j)}</span>
						<input
							class={[
								'h-10 w-full min-w-0 rounded-xl text-center num focus:outline-none',
								done ? 'bg-transparent font-bold' : 'bg-white/[0.06] focus:bg-white/10'
							]}
							inputmode="decimal"
							aria-label="{units.label}, set {j + 1}"
							placeholder={placeholder(ex, j, 'weightKg')}
							value={units.show(set.weightKg) ?? ''}
							onchange={(e) =>
								live.updateSet(i, j, { weightKg: units.toKg(parse(e.currentTarget.value)) })}
						/>
						<input
							class={[
								'h-10 w-full min-w-0 rounded-xl text-center num focus:outline-none',
								done ? 'bg-transparent font-bold' : 'bg-white/[0.06] focus:bg-white/10'
							]}
							inputmode="numeric"
							aria-label="Reps, set {j + 1}"
							placeholder={placeholder(ex, j, 'reps')}
							value={set.reps ?? ''}
							onchange={(e) => live.updateSet(i, j, { reps: parse(e.currentTarget.value) })}
						/>
						<button
							class={[
								'tick relative h-10 rounded-xl text-sm font-bold transition',
								done ? 'is-done text-night bg-primary-gradient' : 'bg-white/[0.08] text-ink-3'
							]}
							aria-label={done ? `Untick set ${j + 1}` : `Tick set ${j + 1}`}
							aria-pressed={done}
							onclick={() => tick(i, j)}>✓</button
						>
					{/each}
				</div>

				<button
					class="mt-3 w-full rounded-xl bg-white/[0.05] py-2.5 text-sm font-semibold text-ink-2"
					onclick={() => live.addSet(i)}>+ Add set</button
				>
			</li>
		{/each}
	</ul>

	<button class="btn-glass mt-4 w-full" onclick={() => (pickerOpen = true)}>+ Add exercises</button>
	<button class="mt-6 w-full py-3 text-sm text-ember" onclick={discard}>Discard workout</button>

	<ExercisePicker bind:open={pickerOpen} onpick={(list) => live.addExercises(list)} />

	<Sheet bind:open={menuOpen} title={menuFor !== null ? w.exercises[menuFor]?.name : ''}>
		{#if menuFor !== null && w.exercises[menuFor]}
			{@const i = menuFor}
			{@const ex = w.exercises[i]}
			<label class="mb-4 flex items-center justify-between gap-3">
				<span>Rest timer</span>
				<select
					class="field w-auto appearance-none"
					value={ex.restSec ?? ''}
					onchange={(e) =>
						live.setRest(i, e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
				>
					<option value="">Default</option>
					<option value="0">Off</option>
					{#each [30, 60, 90, 120, 150, 180, 240, 300] as s (s)}
						<option value={s}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</option>
					{/each}
				</select>
			</label>
			<label class="mb-4 flex flex-col gap-1.5">
				<span class="eyebrow">Note</span>
				<textarea
					class="field min-h-16 resize-none"
					placeholder="Seat height 4, grip width…"
					bind:value={noteDraft}
					onblur={() => live.setNote(i, noteDraft)}></textarea>
			</label>
			{#if i < w.exercises.length - 1}
				<button
					class="btn-glass mb-3 w-full"
					onclick={() => ((menuOpen = false), live.toggleSuperset(i))}
					>{live.linkedToNext(i)
						? `Unlink from ${w.exercises[i + 1].name}`
						: `Superset with ${w.exercises[i + 1].name}`}</button
				>
			{/if}
			<div class="grid grid-cols-2 gap-3">
				<button
					class="btn-glass"
					disabled={i === 0}
					onclick={() => ((menuOpen = false), live.moveExercise(i, -1))}>Move up</button
				>
				<button
					class="btn-glass"
					disabled={i === w.exercises.length - 1}
					onclick={() => ((menuOpen = false), live.moveExercise(i, 1))}>Move down</button
				>
			</div>
			<button
				class="btn-glass mt-3 w-full text-ember"
				onclick={() => ((menuOpen = false), live.removeExercise(i))}>Remove exercise</button
			>
		{/if}
	</Sheet>

	<Sheet bind:open={setMenuOpen} title={setMenu ? `Set ${setMenu.j + 1}` : ''}>
		{#if setMenu && w.exercises[setMenu.i]?.sets[setMenu.j]}
			{@const { i, j } = setMenu}
			{@const current = w.exercises[i].sets[j].type}
			<div class="grid grid-cols-2 gap-2 pt-1">
				{#each SET_TYPES as t (t)}
					<button
						class={[
							'rounded-2xl px-4 py-3 text-left text-sm font-semibold',
							current === t ? 'bg-white/15' : 'bg-white/[0.05] text-ink-2'
						]}
						aria-pressed={current === t}
						onclick={() => ((setMenuOpen = false), live.setSetType(i, j, t))}
					>
						<span class="mr-1.5 num">{t === 'NORMAL' ? '1' : t[0]}</span>{SET_TYPE_LABEL[t]}
					</button>
				{/each}
			</div>
			<button
				class="btn-glass mt-3 w-full text-ember"
				onclick={() => ((setMenuOpen = false), live.removeSet(i, j))}>Delete set</button
			>
		{/if}
	</Sheet>

	<PlateSheet bind:open={platesOpen} initialKg={platesKg} />

	<Sheet bind:open={finishOpen} title="Finish workout?">
		{#if ticked === 0}
			<p class="text-sm text-ink-2">No sets are ticked yet, so there's nothing to save.</p>
		{:else if unticked > 0}
			<p class="text-sm text-ink-2">
				{unticked} unticked set{unticked > 1 ? 's' : ''} will be left out. {ticked} ticked set{ticked >
				1
					? 's'
					: ''} will be saved.
			</p>
		{:else}
			<p class="text-sm text-ink-2">All {ticked} sets will be saved.</p>
		{/if}
		{#snippet footer()}
			<div class="mb-1 grid grid-cols-2 gap-3">
				<button class="btn-glass" onclick={() => (finishOpen = false)}>Keep going</button>
				<button class="btn-primary" disabled={ticked === 0 || finishing} onclick={finish}
					>Finish</button
				>
			</div>
			<button class="mb-1 w-full py-3 text-sm text-ember" onclick={discard}>Discard workout</button>
		{/snippet}
	</Sheet>
{/if}

<style>
	/* Ticked sets fill with the gradient and bloom outward. */
	.tick.is-done::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow: 0 0 0 0 rgb(62 230 255 / 0.6);
		animation: bloom 0.6s ease-out;
	}
	@keyframes bloom {
		to {
			box-shadow: 0 0 0 14px rgb(62 230 255 / 0);
		}
	}
</style>
