<script lang="ts">
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';

	const tabs = [
		{
			href: '/',
			route: '/(app)',
			label: 'Home',
			icon: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'
		},
		{
			href: '/history',
			route: '/(app)/history',
			label: 'History',
			icon: 'M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4'
		},
		{
			href: '/exercises',
			route: '/(app)/exercises',
			label: 'Exercises',
			icon: 'M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11'
		},
		{
			href: '/profile',
			route: '/(app)/profile',
			label: 'Profile',
			icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 9a7.5 7.5 0 0 1 15 0'
		}
	] as const;

	// Follow where we're heading, so the highlight moves on tap, not after the load.
	const path = $derived(navigating.to?.url.pathname ?? page.url.pathname);
	const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
	const activeIndex = $derived(tabs.findIndex((t) => isActive(t.href)));
</script>

<nav class="fixed inset-x-0 bottom-0 z-40 px-4 pb-safe" aria-label="Main">
	<ul
		class="glass relative mx-auto flex max-w-md items-stretch justify-around rounded-[1.75rem] p-1.5 glass-bar [view-transition-name:tabbar]"
	>
		<!-- One highlight that glides to the active tab (a little spring at the end). -->
		{#if activeIndex >= 0}
			<span
				class="pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 w-[calc((100%-0.75rem)/4)] rounded-[1.25rem] bg-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] transition-transform duration-[460ms] ease-[cubic-bezier(0.34,1.36,0.5,1)]"
				style:transform="translateX({activeIndex * 100}%)"
				aria-hidden="true"
			></span>
		{/if}
		{#each tabs as tab (tab.href)}
			{@const active = isActive(tab.href)}
			<li class="flex-1">
				<a
					href={resolve(tab.route)}
					aria-current={active ? 'page' : undefined}
					class={[
						'relative flex flex-col items-center gap-1 rounded-[1.25rem] py-2 text-[0.6875rem] font-medium transition-colors duration-300',
						active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
					]}
				>
					<svg
						viewBox="0 0 24 24"
						class={[
							'size-6 transition-transform duration-300',
							active && 'scale-110 drop-shadow-[0_0_8px_rgb(62_230_255/0.55)]'
						]}
						fill="none"
						stroke={active ? 'url(#tab-grad)' : 'currentColor'}
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d={tab.icon} />
					</svg>
					{tab.label}
				</a>
			</li>
		{/each}
	</ul>
	<svg width="0" height="0" class="absolute" aria-hidden="true">
		<defs>
			<linearGradient id="tab-grad" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#7C5CFF" />
				<stop offset="1" stop-color="#3EE6FF" />
			</linearGradient>
		</defs>
	</svg>
</nav>
