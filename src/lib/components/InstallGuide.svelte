<script lang="ts">
	import { onMount } from 'svelte';
	import Sheet from './Sheet.svelte';
	import { isIos, isStandalone } from '#lib/push.ts';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	type InstallPrompt = Event & { prompt: () => Promise<void> };
	let deferred = $state<InstallPrompt | null>(null);
	const ios = isIos();

	onMount(() => {
		// Chrome/Android offers a real install prompt; keep it for the button below.
		const keep = (e: Event) => {
			e.preventDefault();
			deferred = e as InstallPrompt;
		};
		addEventListener('beforeinstallprompt', keep);
		return () => removeEventListener('beforeinstallprompt', keep);
	});

	async function install() {
		await deferred?.prompt();
		deferred = null;
		open = false;
	}

	const steps = ios
		? [
				{ text: 'Tap the Share button in Safari’s toolbar', icon: 'share' },
				{ text: 'Scroll down and choose “Add to Home Screen”', icon: 'add' },
				{ text: 'Tap “Add”. Open Dench from your home screen from now on', icon: 'done' }
			]
		: [
				{ text: 'Open your browser menu (⋮)', icon: 'menu' },
				{ text: 'Choose “Install app” or “Add to Home screen”', icon: 'add' },
				{ text: 'Open Dench from your home screen from now on', icon: 'done' }
			];
</script>

<Sheet bind:open title="Add to Home Screen">
	{#if isStandalone()}
		<p class="pt-1 text-sm text-ink-2">Dench is already installed on this device. You’re set.</p>
	{:else}
		<p class="pt-1 text-sm text-ink-2">
			Installed, Dench opens full screen, works with no signal and can alert you when rest is over.
		</p>
		<ol class="mt-5 flex flex-col gap-3">
			{#each steps as step, k (k)}
				<li class="flex items-center gap-4 rounded-2xl bg-white/[0.05] p-3">
					<span
						class="grid size-10 shrink-0 place-items-center rounded-xl font-display font-extrabold text-night bg-primary-gradient"
						>{k + 1}</span
					>
					<span class="flex-1 text-[0.9375rem]">{step.text}</span>
					{#if step.icon === 'share'}
						<svg
							class="size-6 shrink-0 text-cyan"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
							><path d="M12 3v12M8 7l4-4 4 4" /><path
								d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"
							/></svg
						>
					{:else if step.icon === 'add'}
						<svg
							class="size-6 shrink-0 text-cyan"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							aria-hidden="true"
							><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></svg
						>
					{/if}
				</li>
			{/each}
		</ol>
		{#if deferred}
			<button class="btn-primary mt-5 w-full" onclick={install}>Install Dench</button>
		{/if}
	{/if}
</Sheet>
