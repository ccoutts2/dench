<script lang="ts">
	/**
	 * Single-series progress line: one point per session over real time.
	 * Tap or drag anywhere to read a point; the latest value is labelled directly.
	 */
	let {
		points,
		format,
		title
	}: {
		points: { x: string; y: number }[];
		format: (y: number) => string;
		/** Names the series (no legend for a single line). Used for screen readers. */
		title: string;
	} = $props();

	let width = $state(320);
	const height = 172;
	const m = { top: 14, right: 14, bottom: 24, left: 40 };
	const uid = $props.id();

	const times = $derived(points.map((p) => new Date(p.x).getTime()));

	/** "Nice" y ticks around the data, with breathing room so the line isn't pinned to an edge. */
	const ticks = $derived.by(() => {
		const ys = points.map((p) => p.y);
		let lo = Math.min(...ys);
		let hi = Math.max(...ys);
		if (lo === hi) {
			lo -= Math.max(1, lo * 0.1);
			hi += Math.max(1, hi * 0.1);
		}
		const raw = (hi - lo) / 3;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw)!;
		const start = Math.floor(lo / step) * step;
		const out: number[] = [];
		for (let v = Math.max(0, start); v <= hi + step * 0.999; v += step) out.push(+v.toFixed(6));
		return out;
	});

	const yMin = $derived(ticks[0]);
	const yMax = $derived(ticks.at(-1)!);
	const tMin = $derived(Math.min(...times));
	const tMax = $derived(Math.max(...times));

	const px = (t: number) =>
		tMax === tMin
			? m.left + (width - m.left - m.right) / 2
			: m.left + ((t - tMin) / (tMax - tMin)) * (width - m.left - m.right);
	const py = (y: number) =>
		m.top + (1 - (y - yMin) / (yMax - yMin || 1)) * (height - m.top - m.bottom);

	const coords = $derived(points.map((p, i) => ({ x: px(times[i]), y: py(p.y), p })));
	const path = $derived(coords.map((c, i) => `${i ? 'L' : 'M'}${c.x},${c.y}`).join(''));
	const area = $derived(
		coords.length > 1
			? `${path}L${coords.at(-1)!.x},${height - m.bottom}L${coords[0].x},${height - m.bottom}Z`
			: ''
	);

	let active = $state<number | null>(null);

	function pick(e: PointerEvent) {
		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		const x = e.clientX - rect.left;
		let best = 0;
		for (let i = 1; i < coords.length; i++) {
			if (Math.abs(coords[i].x - x) < Math.abs(coords[best].x - x)) best = i;
		}
		active = best;
	}

	const shortDate = (iso: string, withYear = false) =>
		new Date(iso).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			...(withYear ? { year: 'numeric' } : {})
		});

	const tip = $derived(active === null ? null : coords[active]);
	const last = $derived(coords.at(-1));
</script>

<div class="relative" bind:clientWidth={width}>
	<svg
		{width}
		{height}
		role="img"
		aria-labelledby="{uid}-t"
		class="block touch-pan-y select-none"
		onpointerdown={pick}
		onpointermove={pick}
		onpointerleave={(e) => {
			if (e.pointerType === 'mouse') active = null;
		}}
	>
		<title id="{uid}-t">{title}</title>
		<defs>
			<linearGradient id="{uid}-line" x1="0" x2="1" y1="0" y2="0">
				<stop offset="0" stop-color="var(--color-violet)" />
				<stop offset="1" stop-color="var(--color-cyan)" />
			</linearGradient>
			<linearGradient id="{uid}-fill" x1="0" x2="0" y1="0" y2="1">
				<stop offset="0" stop-color="var(--color-cyan)" stop-opacity="0.16" />
				<stop offset="1" stop-color="var(--color-cyan)" stop-opacity="0" />
			</linearGradient>
		</defs>

		{#each ticks as t (t)}
			<line
				x1={m.left}
				x2={width - m.right}
				y1={py(t)}
				y2={py(t)}
				stroke="white"
				stroke-opacity={t === yMin ? 0.14 : 0.06}
			/>
			<text
				x={m.left - 8}
				y={py(t)}
				dy="0.32em"
				text-anchor="end"
				class="fill-ink-3 num text-[10px]">{+t.toFixed(1)}</text
			>
		{/each}

		{#if points.length}
			<text x={m.left} y={height - 6} class="fill-ink-3 text-[10px]">{shortDate(points[0].x)}</text>
			{#if points.length > 1}
				<text x={width - m.right} y={height - 6} text-anchor="end" class="fill-ink-3 text-[10px]"
					>{shortDate(points.at(-1)!.x)}</text
				>
			{/if}
		{/if}

		{#if area}<path d={area} fill="url(#{uid}-fill)" />{/if}
		{#if coords.length > 1}
			<path
				d={path}
				fill="none"
				stroke="url(#{uid}-line)"
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		{/if}

		{#if tip}
			<line
				x1={tip.x}
				x2={tip.x}
				y1={m.top}
				y2={height - m.bottom}
				stroke="white"
				stroke-opacity="0.25"
				stroke-dasharray="2 3"
			/>
		{/if}

		{#if coords.length <= 40}
			{#each coords as c, i (i)}
				<circle
					cx={c.x}
					cy={c.y}
					r={active === i ? 5 : 4}
					fill="var(--color-cyan)"
					stroke="var(--color-night)"
					stroke-width="2"
				/>
			{/each}
		{:else if tip}
			<circle
				cx={tip.x}
				cy={tip.y}
				r="5"
				fill="var(--color-cyan)"
				stroke="var(--color-night)"
				stroke-width="2"
			/>
		{/if}

		{#if last && active === null}
			<!-- Latest value, set off to the left of its point so it never runs off the edge. -->
			<text
				x={coords.length > 1 ? last.x - 10 : last.x}
				y={last.y - 12}
				text-anchor={coords.length > 1 ? 'end' : 'middle'}
				class="fill-ink num text-[11px] font-semibold"
				paint-order="stroke"
				stroke="var(--color-night)"
				stroke-width="4"
				stroke-linejoin="round">{format(last.p.y)}</text
			>
		{/if}
	</svg>

	{#if tip}
		<div
			class="pointer-events-none absolute z-10 rounded-xl border border-white/10 bg-night/90 px-3 py-2 text-xs whitespace-nowrap backdrop-blur"
			style:left="{Math.min(Math.max(tip.x, 64), width - 64)}px"
			style:top="{tip.y > 64 ? tip.y - 60 : tip.y + 14}px"
			style:transform="translateX(-50%)"
		>
			<p class="num font-semibold">{format(tip.p.y)}</p>
			<p class="text-ink-3">{shortDate(tip.p.x, true)}</p>
		</div>
	{/if}

	<table class="sr-only">
		<caption>{title}</caption>
		<thead><tr><th>Date</th><th>Value</th></tr></thead>
		<tbody>
			{#each points as p, i (i)}
				<tr><td>{shortDate(p.x, true)}</td><td>{format(p.y)}</td></tr>
			{/each}
		</tbody>
	</table>
</div>
