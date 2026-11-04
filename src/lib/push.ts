/**
 * Rest-over notifications (browser side).
 *
 * iOS only allows web push for an installed (home screen) app, on 16.4+, and
 * only asks for permission after a tap, so `enablePush` must run from a click.
 */
import { browser } from '$app/env';
import { VAPID_PUBLIC_KEY } from '$app/env/public';

export const pushAvailable = () =>
	browser &&
	!!VAPID_PUBLIC_KEY &&
	'serviceWorker' in navigator &&
	'PushManager' in window &&
	'Notification' in window;

export const isStandalone = () =>
	browser &&
	(matchMedia('(display-mode: standalone)').matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true);

export const isIos = () => browser && /iP(hone|ad|od)/.test(navigator.userAgent);

/** Base64url VAPID key → bytes for pushManager.subscribe. */
function keyBytes(base64: string) {
	const pad = '='.repeat((4 - (base64.length % 4)) % 4);
	const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
	return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function pushEnabled(): Promise<boolean> {
	if (!pushAvailable() || Notification.permission !== 'granted') return false;
	const reg = await navigator.serviceWorker.ready;
	return !!(await reg.pushManager.getSubscription());
}

/** Ask permission and register this device. Returns whether alerts are now on. */
export async function enablePush(): Promise<boolean> {
	if (!pushAvailable()) return false;
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return false;
	const reg = await navigator.serviceWorker.ready;
	const sub =
		(await reg.pushManager.getSubscription()) ??
		(await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: keyBytes(VAPID_PUBLIC_KEY!)
		}));
	const res = await fetch('/api/push/subscription', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(sub.toJSON())
	});
	return res.ok;
}

export async function disablePush() {
	if (!pushAvailable()) return;
	const reg = await navigator.serviceWorker.ready;
	const sub = await reg.pushManager.getSubscription();
	if (!sub) return;
	await fetch('/api/push/subscription', {
		method: 'DELETE',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ endpoint: sub.endpoint })
	}).catch(() => {});
	await sub.unsubscribe();
}

/**
 * Tell the server when the current rest ends (or that it was cleared), so it
 * can push "Rest over" while the phone is locked. Best effort: offline or
 * without permission, the in-app chime still covers it.
 */
export function scheduleRestAlert(rest: { endsAt: number; exercise: string; next: string } | null) {
	if (!pushAvailable() || Notification.permission !== 'granted' || !navigator.onLine) return;
	void fetch('/api/push/rest', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		keepalive: true,
		body: JSON.stringify(
			rest
				? { endsAt: rest.endsAt, title: 'Rest over', body: `${rest.exercise} · ${rest.next}` }
				: { endsAt: null }
		)
	}).catch(() => {});
}
