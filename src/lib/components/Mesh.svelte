<!--
	Drifting gradient light behind every screen. Colours come from the
	--mesh-* custom properties, which change with [data-session] on <html>.
-->
<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night" aria-hidden="true">
	<div
		class="absolute -top-[20vh] -left-[25vw] size-[85vw] max-h-[720px] max-w-[720px] animate-drift-a rounded-full opacity-55 blur-[90px] transition-colors duration-1000"
		style="background: radial-gradient(circle, var(--mesh-1), transparent 68%)"
	></div>
	<div
		class="absolute top-[30vh] -right-[30vw] size-[90vw] max-h-[760px] max-w-[760px] animate-drift-b rounded-full opacity-45 blur-[100px] transition-colors duration-1000"
		style="background: radial-gradient(circle, var(--mesh-2), transparent 68%)"
	></div>
	<div
		class="absolute -bottom-[25vh] left-[5vw] size-[80vw] max-h-[680px] max-w-[680px] animate-drift-c rounded-full opacity-35 blur-[110px] transition-colors duration-1000"
		style="background: radial-gradient(circle, var(--mesh-3), transparent 68%)"
	></div>
	<!-- grain-free vignette keeps text legible over the light -->
	<div
		class="absolute inset-0"
		style="background: radial-gradient(120% 80% at 50% 0%, transparent 40%, rgb(7 7 13 / 0.75))"
	></div>
</div>
