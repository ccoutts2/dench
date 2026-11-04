<script lang="ts">
	import Sheet from './Sheet.svelte';
	import { confirmState } from '#lib/confirm.svelte.ts';

	const req = $derived(confirmState.current);

	// Closing the sheet any other way (backdrop, Escape) counts as cancel.
	let open = $derived(!!req);
	$effect(() => {
		if (!open && confirmState.current) confirmState.settle(false);
	});
</script>

<Sheet bind:open title={req?.title}>
	{#if req?.message}<p class="text-sm text-ink-2">{req.message}</p>{/if}
	{#snippet footer()}
		<div class="mb-1 grid grid-cols-2 gap-3">
			<button class="btn-glass" onclick={() => confirmState.settle(false)}
				>{req?.cancelLabel ?? 'Cancel'}</button
			>
			<button
				class={req?.danger
					? 'btn-glass border-ember/40 bg-ember/20 font-semibold text-ember'
					: 'btn-primary'}
				onclick={() => confirmState.settle(true)}>{req?.confirmLabel ?? 'OK'}</button
			>
		</div>
	{/snippet}
</Sheet>
