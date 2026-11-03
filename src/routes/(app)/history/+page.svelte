<script lang="ts">
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';

	const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
</script>

<ScreenHeader title="History" eyebrow={month} />

<div class="glass flex flex-col items-center gap-2 px-6 py-12 text-center">
	<p class="font-semibold">No workouts yet</p>
	<p class="max-w-[17rem] text-sm text-ink-2">
		Finished sessions land here with time, volume and PRs. The calendar view arrives in phase 3.
	</p>
</div>
