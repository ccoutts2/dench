<script lang="ts">
	/**
	 * Front and back body figures with each muscle group shaded by how hard it
	 * was worked. Shapes are drawn for one side and mirrored for the other.
	 */
	import {
		LEVEL_LABEL,
		levelOf,
		type Level,
		type MapMuscle,
		type MuscleLoad
	} from '#lib/muscles.ts';
	import { label } from '#lib/types.ts';

	let {
		load,
		/** Exercise view: "Primary / Secondary" instead of set-based levels. */
		exercise = false,
		showList = true
	}: { load: MuscleLoad; exercise?: boolean; showList?: boolean } = $props();

	const uid = $props.id();

	// One side of each figure (viewBox 200 × 400, centre line x = 100).
	const FRONT: Partial<Record<MapMuscle, string[]>> = {
		TRAPS: ['M91 49 C88 56 82 61 72 64 L92 62 Z'],
		SHOULDERS: ['M71 64 C57 62 46 72 45 92 C52 87 60 85 67 87 C69 79 70 71 71 64 Z'],
		CHEST: ['M98 67 L76 66 C70 76 68 88 70 100 C80 106 91 106 98 102 Z'],
		BICEPS: ['M45 97 C41 109 41 122 45 134 C51 132 57 124 59 111 C59 101 55 95 49 93 Z'],
		FOREARMS: [
			'M43 140 C37 156 35 172 37 186 L45 187 C51 171 55 155 55 139 C51 136 47 136 43 140 Z'
		],
		ABS: [
			'M86 108 L98 108 L98 166 L88 164 C84 148 84 126 86 108 Z',
			'M72 106 C70 124 72 146 83 162 C81 140 81 122 83 108 Z'
		],
		QUADS: [
			'M74 178 C68 202 68 230 74 256 C80 262 88 262 94 256 C98 232 98 206 96 184 C90 180 82 178 74 178 Z'
		],
		CALVES: ['M75 278 C71 298 73 320 78 342 L86 342 C90 320 92 298 90 280 C84 276 79 276 75 278 Z']
	};
	const BACK: Partial<Record<MapMuscle, string[]>> = {
		TRAPS: ['M100 48 L86 58 L72 65 L88 70 L100 100 Z'],
		SHOULDERS: ['M71 65 C57 62 46 72 45 92 C52 87 60 85 67 87 C69 79 70 71 71 65 Z'],
		BACK: [
			'M98 102 L88 72 L74 70 C69 88 71 110 79 128 C87 136 93 140 98 142 Z',
			'M87 145 L98 147 L98 168 L85 166 Z'
		],
		TRICEPS: ['M45 97 C41 110 43 124 47 134 C53 130 59 120 59 106 C57 98 53 94 47 92 Z'],
		FOREARMS: [
			'M43 140 C37 156 35 172 37 186 L45 187 C51 171 55 155 55 139 C51 136 47 136 43 140 Z'
		],
		GLUTES: ['M98 172 L78 172 C70 184 70 200 78 210 C86 214 94 212 98 206 Z'],
		HAMSTRINGS: ['M76 216 C70 234 72 252 76 266 L94 266 C98 250 98 232 96 216 Z'],
		CALVES: ['M74 276 C68 292 70 312 78 330 C84 334 88 330 90 320 C92 300 92 288 90 278 Z']
	};

	/** Non-muscle parts, drawn faintly so the figure reads as a body. */
	const FRAME = [
		'M92 44 L108 44 L110 62 L90 62 Z',
		'M74 63 C86 59 114 59 126 63 C132 80 132 100 129 120 C128 140 130 158 131 174 L69 174 C70 158 72 140 71 120 C68 100 68 80 74 63 Z',
		'M100 6 C88 6 82 16 82 28 C82 42 90 50 100 50 C110 50 118 42 118 28 C118 16 112 6 100 6 Z',
		'M38 188 C34 196 34 206 40 210 C46 206 48 196 46 188 Z',
		'M162 188 C166 196 166 206 160 210 C154 206 152 196 154 188 Z',
		'M76 344 L86 344 L88 372 L70 374 Z',
		'M124 344 L114 344 L112 372 L130 374 Z',
		'M74 262 C80 268 90 268 94 262 L92 276 C86 274 80 274 76 276 Z',
		'M126 262 C120 268 110 268 106 262 L108 276 C114 274 120 274 124 276 Z',
		'M70 164 C74 172 86 176 100 176 C114 176 126 172 130 164 L128 182 C118 178 82 178 72 182 Z'
	];

	function levelFor(m: MapMuscle): Level {
		const v = load[m];
		if (!exercise) return levelOf(v);
		if (!v) return 'none';
		return v >= 1 ? 'high' : 'mid';
	}

	const FILL: Record<Level, string> = {
		high: `url(#${uid}-hi)`,
		mid: `url(#${uid}-mid)`,
		low: 'rgb(124 92 255 / 0.38)',
		none: 'rgb(255 255 255 / 0.07)'
	};

	const worked = $derived(
		(Object.entries(load) as [MapMuscle, number][])
			.filter(([, v]) => v > 0)
			.sort((a, b) => b[1] - a[1])
	);
	const fmtSets = (n: number) => `${+n.toFixed(1)} set${n === 1 ? '' : 's'}`;
</script>

{#snippet figure(shapes: Partial<Record<MapMuscle, string[]>>, caption: string)}
	<figure class="flex min-w-0 flex-1 flex-col items-center">
		<svg viewBox="0 0 200 380" class="h-auto w-full max-w-[9.5rem]" aria-hidden="true">
			{#each FRAME as d, k (k)}<path {d} fill="rgb(255 255 255 / 0.05)" />{/each}
			{#each Object.entries(shapes) as [m, paths] (m)}
				{@const fill = FILL[levelFor(m as MapMuscle)]}
				{#each paths as d, k (k)}
					<path {d} {fill} stroke="rgb(7 7 13 / 0.9)" stroke-width="1.5" />
					<path
						{d}
						{fill}
						stroke="rgb(7 7 13 / 0.9)"
						stroke-width="1.5"
						transform="translate(200 0) scale(-1 1)"
					/>
				{/each}
			{/each}
		</svg>
		<figcaption class="mt-1 eyebrow">{caption}</figcaption>
	</figure>
{/snippet}

<div>
	<svg width="0" height="0" class="absolute" aria-hidden="true">
		<defs>
			<linearGradient id="{uid}-hi" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="var(--color-cyan)" />
				<stop offset="1" stop-color="var(--color-violet)" />
			</linearGradient>
			<linearGradient id="{uid}-mid" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="var(--color-cyan)" stop-opacity="0.55" />
				<stop offset="1" stop-color="var(--color-violet)" stop-opacity="0.55" />
			</linearGradient>
		</defs>
	</svg>

	<div class="flex gap-2">
		{@render figure(FRONT, 'Front')}
		{@render figure(BACK, 'Back')}
	</div>

	<div class="mt-3 flex justify-center gap-4 text-[0.6875rem] text-ink-2">
		{#if exercise}
			<span class="flex items-center gap-1.5"
				><span
					class="size-2.5 rounded-sm"
					style:background-image="linear-gradient(var(--color-cyan), var(--color-violet))"
				></span>Primary</span
			>
			<span class="flex items-center gap-1.5"
				><span
					class="size-2.5 rounded-sm opacity-55"
					style:background-image="linear-gradient(var(--color-cyan), var(--color-violet))"
				></span>Secondary</span
			>
		{:else}
			<span class="flex items-center gap-1.5"
				><span
					class="size-2.5 rounded-sm"
					style:background-image="linear-gradient(var(--color-cyan), var(--color-violet))"
				></span>High</span
			>
			<span class="flex items-center gap-1.5"
				><span
					class="size-2.5 rounded-sm opacity-55"
					style:background-image="linear-gradient(var(--color-cyan), var(--color-violet))"
				></span>Moderate</span
			>
			<span class="flex items-center gap-1.5"
				><span class="size-2.5 rounded-sm bg-violet/40"></span>Low</span
			>
			<span class="flex items-center gap-1.5"
				><span class="size-2.5 rounded-sm bg-white/10"></span>Not worked</span
			>
		{/if}
	</div>

	{#if showList && !exercise && worked.length}
		<ul class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
			{#each worked as [m, v] (m)}
				{@const lvl = levelOf(v)}
				<li class="flex items-baseline justify-between gap-2">
					<span class="truncate">{label(m)}</span>
					<span
						class={[
							'shrink-0 num text-xs',
							lvl === 'high' ? 'text-cyan' : lvl === 'mid' ? 'text-ink-2' : 'text-ink-3'
						]}
						title={fmtSets(v)}>{LEVEL_LABEL[lvl as Exclude<Level, 'none'>]}</span
					>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="sr-only">
		{worked.length
			? worked
					.map(([m, v]) =>
						exercise
							? `${label(m)}: ${v >= 1 ? 'primary' : 'secondary'}`
							: `${label(m)}: ${LEVEL_LABEL[levelOf(v) as Exclude<Level, 'none'>]}, ${fmtSets(v)}`
					)
					.join('; ')
			: 'No muscles worked yet.'}
	</p>
</div>
