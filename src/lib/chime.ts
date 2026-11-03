/**
 * Rest-over chime. iOS has no vibration API for web apps, so we play a short
 * two-note tone. Audio must be unlocked by a user gesture first, which
 * happens when a set is ticked.
 */
let ctx: AudioContext | null = null;

export function unlockAudio() {
	try {
		ctx ??= new AudioContext();
		if (ctx.state === 'suspended') void ctx.resume();
	} catch {
		ctx = null;
	}
}

export function chime() {
	if (!ctx) return;
	const now = ctx.currentTime;
	for (const [i, freq] of [880, 1318.5].entries()) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.value = freq;
		const t = now + i * 0.16;
		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
		osc.connect(gain).connect(ctx.destination);
		osc.start(t);
		osc.stop(t + 0.55);
	}
}
