<script lang="ts">
	/**
	 * Front and back body figures with each muscle group shaded by how hard it
	 * was worked. Shapes are drawn for one side and mirrored for the other.
	 */
	import {
		LEVEL_LABEL,
		levelOf,
		SESSION_SCALE,
		type Scale,
		type Level,
		type MapMuscle,
		type MuscleLoad
	} from '#lib/muscles.ts';
	import { label } from '#lib/types.ts';

	let {
		load,
		/** Exercise view: "Primary / Secondary" instead of set-based levels. */
		exercise = false,
		showList = true,
		scale = SESSION_SCALE
	}: { load: MuscleLoad; exercise?: boolean; showList?: boolean; scale?: Scale } = $props();

	const uid = $props.id();

	// One side of each figure (viewBox 200 × 380, centre line x = 100), mirrored for the other.
	const FRONT: Partial<Record<MapMuscle, string[]>> = {
		TRAPS: ['M92 52 C88 58 80 61 72 63 C80 64 88 64 95 62 Z'],
		SHOULDERS: [
			'M70 64 C58 64 48 72 46 88 C46 94 48 98 50 100 C54 92 60 86 68 84 C71 78 72 70 70 64 Z'
		],
		CHEST: ['M98 66 C90 64 80 65 73 68 C69 76 68 88 70 98 C78 104 90 105 98 100 Z'],
		BICEPS: [
			'M49 104 C45 114 44 126 46 136 C50 138 54 134 57 126 C60 116 60 106 58 98 C54 98 51 100 49 104 Z'
		],
		FOREARMS: [
			'M44 142 C40 154 37 168 35 182 C38 184 41 184 43 182 C47 170 52 156 55 144 C52 140 47 139 44 142 Z'
		],
		ABS: [
			'M88 106 C93 105 97 106 99 106 L99 166 C94 168 90 166 87 162 C85 146 85 122 88 106 Z',
			'M71 106 C76 108 81 108 85 108 C83 126 83 146 85 162 C78 156 73 146 71 134 C70 124 70 114 71 106 Z'
		],
		QUADS: [
			'M70 186 C66 206 67 232 72 256 C78 262 88 262 93 254 C96 234 98 208 97 188 C90 182 78 181 70 186 Z'
		],
		CALVES: [
			'M73 278 C70 296 71 316 74 336 C78 340 84 340 87 336 C90 316 92 296 91 278 C85 273 78 273 73 278 Z'
		]
	};
	const BACK: Partial<Record<MapMuscle, string[]>> = {
		TRAPS: ['M100 50 C94 54 86 58 74 63 C82 68 90 78 100 104 Z'],
		SHOULDERS: FRONT.SHOULDERS,
		BACK: [
			'M98 108 L96 76 C88 70 80 68 73 70 C69 86 70 104 75 120 C81 134 90 142 98 146 Z',
			'M86 149 C90 151 95 152 99 152 L99 170 C93 171 88 170 84 168 C84 160 85 154 86 149 Z'
		],
		TRICEPS: [
			'M48 102 C44 114 44 126 46 136 C50 138 55 132 58 122 C60 112 60 104 59 98 C55 97 51 99 48 102 Z'
		],
		FOREARMS: FRONT.FOREARMS,
		GLUTES: ['M99 174 C90 172 80 174 73 180 C68 192 69 206 76 214 C85 218 94 216 99 210 Z'],
		HAMSTRINGS: [
			'M74 220 C69 236 70 252 74 264 C80 268 90 268 94 262 C97 248 98 232 96 220 C88 216 80 216 74 220 Z'
		],
		CALVES: [
			'M73 276 C68 292 70 312 76 330 C81 334 86 334 89 328 C92 312 92 294 90 278 C85 272 78 272 73 276 Z'
		]
	};

	/** Half the body outline (mirrored), so the figure reads as one continuous form. */
	const SILHOUETTE =
		'M100 4 C88 4 81 13 81 26 C81 38 87 46 93 49 L92 56 C84 60 74 61 66 63 C54 66 46 74 44 88 L41 110 C39 124 37 136 35 150 L31 182 C30 190 31 198 34 202 C37 204 40 202 41 198 L44 186 C48 170 52 154 55 140 L60 112 L64 100 C66 118 68 134 69 150 C69 160 67 168 66 178 C64 196 66 224 70 252 L72 266 C70 286 70 306 73 330 L74 350 C73 358 70 366 72 372 L88 372 C90 366 89 358 88 350 L89 330 C92 306 94 286 93 268 L95 250 C97 230 98 210 99 192 L100 190 Z';

	/** Fine detail lines on the front (ab segments), drawn over the fill. */
	const AB_LINES = ['M88 124 L99 124', 'M87 142 L99 142'];

	function levelFor(m: MapMuscle): Level {
		const v = load[m];
		if (!exercise) return levelOf(v, scale);
		if (!v) return 'none';
		return v >= 1 ? 'high' : 'mid';
	}

	const FILL: Record<Level, string> = {
		high: `url(#${uid}-hi)`,
		mid: `url(#${uid}-mid)`,
		low: 'rgb(124 92 255 / 0.38)',
		none: 'rgb(255 255 255 / 0.06)'
	};

	const worked = $derived(
		(Object.entries(load) as [MapMuscle, number][])
			.filter(([, v]) => v > 0)
			.sort((a, b) => b[1] - a[1])
	);
	const fmtSets = (n: number) => `${+n.toFixed(1)} ${scale.unit}`;
</script>

{#snippet figure(shapes: Partial<Record<MapMuscle, string[]>>, caption: string, front: boolean)}
	<figure class="flex min-w-0 flex-1 flex-col items-center">
		<svg viewBox="0 0 200 380" class="h-auto w-full max-w-[9.5rem]" aria-hidden="true">
			{#each [false, true] as mirror (mirror)}
				<g transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}>
					<path d={SILHOUETTE} fill="rgb(255 255 255 / 0.045)" />
					{#each Object.entries(shapes) as [m, paths] (m)}
						{@const lvl = levelFor(m as MapMuscle)}
						{#each paths as d, k (k)}
							<path
								{d}
								fill={FILL[lvl]}
								stroke="rgb(7 7 13 / 0.55)"
								stroke-width="1"
								filter={lvl === 'high' ? `url(#${uid}-glow)` : undefined}
							/>
						{/each}
					{/each}
					{#if front}
						{#each AB_LINES as d, k (k)}
							<path {d} stroke="rgb(7 7 13 / 0.45)" stroke-width="1" />
						{/each}
					{/if}
				</g>
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
			<filter id="{uid}-glow" x="-40%" y="-40%" width="180%" height="180%">
				<feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
				<feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
			</filter>
			<linearGradient id="{uid}-mid" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="var(--color-cyan)" stop-opacity="0.55" />
				<stop offset="1" stop-color="var(--color-violet)" stop-opacity="0.55" />
			</linearGradient>
		</defs>
	</svg>

	<div class="flex gap-2">
		{@render figure(FRONT, 'Front', true)}
		{@render figure(BACK, 'Back', false)}
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
				{@const lvl = levelOf(v, scale)}
				<li class="flex items-baseline justify-between gap-2">
					<span class="truncate">{label(m)}</span>
					<span
						class={[
							'shrink-0 text-xs',
							lvl === 'high' ? 'text-cyan' : lvl === 'mid' ? 'text-ink-2' : 'text-ink-3'
						]}
						>{LEVEL_LABEL[lvl as Exclude<Level, 'none'>]}
						<span class="num text-ink-3">{+v.toFixed(1)}</span></span
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
							: `${label(m)}: ${LEVEL_LABEL[levelOf(v, scale) as Exclude<Level, 'none'>]}, ${fmtSets(v)}`
					)
					.join('; ')
			: 'No muscles worked yet.'}
	</p>
</div>
