<svelte:head><title>Offline · Dench</title></svelte:head>

<main
	class="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-6 text-center"
>
	<p class="font-display text-3xl font-extrabold">No signal<span class="text-gradient">.</span></p>
	<p class="text-sm text-ink-2">
		This screen isn't cached yet. Pages you've opened before still work offline. Reconnect to load
		the rest.
	</p>
	<button class="btn-glass mt-4" onclick={() => location.reload()}>Try again</button>
</main>
