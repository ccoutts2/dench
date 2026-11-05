import { createHmac, timingSafeEqual } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import webpush from 'web-push';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL, VAPID_PRIVATE_KEY } from '$app/env/private';
import { VAPID_PUBLIC_KEY } from '$app/env/public';
import { db } from './db.ts';

export const pushConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

let vapidSet = false;
function setVapid() {
	if (vapidSet) return;
	// The subject lets push services contact the sender. It must be https: or
	// mailto:, so local http origins fall back to a placeholder.
	const subject = BETTER_AUTH_URL?.startsWith('https:') ? BETTER_AUTH_URL : 'https://dench.app';
	webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
	vapidSet = true;
}

/** Send to every device the user enabled. Dead subscriptions are removed. */
export async function sendToUser(
	userId: string,
	payload: { title: string; body: string; tag: string; endsAt?: number }
) {
	if (!pushConfigured) return;
	setVapid();
	const subs = await db.pushSubscription.findMany({ where: { userId } });
	await Promise.all(
		subs.map(async (s) => {
			try {
				await webpush.sendNotification(
					{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
					JSON.stringify(payload),
					// A rest alert is useless late: let the push service drop it after 10 s
					// rather than deliver it when the phone next has signal.
					{ TTL: 10, urgency: 'high' }
				);
			} catch (err) {
				const status = (err as { statusCode?: number }).statusCode;
				if (status === 404 || status === 410) {
					await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
				} else {
					console.warn('[push] send failed', status);
				}
			}
		})
	);
}

// ─── Scheduled "rest over" alerts ───────────────────────────────────────────
//
// Vercel has no timers, so the request that starts a rest keeps running in the
// background (waitUntil) until the rest ends, then sends the push. A function
// may only live ~5 minutes, so longer rests hand over to a fresh invocation.
// Every change to the rest writes a new token; a sleeper whose token is no
// longer current exits quietly, which is how "skip" and "+15s" cancel it.

/** Stay well inside the 300 s function limit. */
const MAX_SLEEP_MS = 240_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

export function sign(userId: string, token: string) {
	return createHmac('sha256', BETTER_AUTH_SECRET).update(`${userId}:${token}`).digest('hex');
}

export function verify(userId: string, token: string, sig: string) {
	const expected = Buffer.from(sign(userId, token));
	const given = Buffer.from(sig);
	return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Keep this invocation alive until the alert is due (or handed over). */
export function runAlert(origin: string, userId: string, token: string) {
	waitUntil(
		(async () => {
			let alert = await db.restAlert.findUnique({ where: { userId } });
			if (!alert || alert.token !== token) return;

			const wait = alert.endsAt.getTime() - Date.now();
			if (wait > MAX_SLEEP_MS) {
				await sleep(MAX_SLEEP_MS);
				const still = await db.restAlert.findUnique({ where: { userId }, select: { token: true } });
				if (still?.token !== token) return;
				await fetch(`${origin}/api/push/fire`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ userId, token, sig: sign(userId, token) })
				}).catch((err) => console.warn('[push] hand-over failed', err));
				return;
			}

			await sleep(wait);
			alert = await db.restAlert.findUnique({ where: { userId } });
			if (!alert || alert.token !== token) return; // skipped or changed meanwhile
			await db.restAlert.delete({ where: { userId } }).catch(() => {});
			await sendToUser(userId, {
				title: alert.title,
				body: alert.body,
				tag: 'rest',
				endsAt: alert.endsAt.getTime()
			});
		})()
	);
}
