/// <reference lib="webworker" />
/**
 * Dench service worker.
 *
 *  - App shell (built JS/CSS + static files + /offline) is precached on install.
 *  - Pages and SvelteKit data requests: network first, cached copy when offline.
 *  - Exercise library (/api/exercises): stale-while-revalidate.
 *  - Google Fonts: cache first.
 *  - Auth endpoints and non-GET requests are never touched.
 */
import { self } from '$app/service-worker';
import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';

const SHELL = `shell-${version}`;
const PAGES = `pages-${version}`;
const DATA = 'data-v1';
const FONTS = 'fonts-v1';
const KEEP = new Set([SHELL, PAGES, DATA, FONTS]);

const PRECACHE = [...immutable, ...assets, ...prerendered].map((f) => f.path);
const PRECACHED = new Set(PRECACHE.map((p) => new URL(p, self.location.href).pathname));

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(SHELL)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) if (!KEEP.has(key)) await caches.delete(key);
			await self.clients.claim();
		})()
	);
});

async function cacheFirst(request: Request, cacheName: string) {
	const cache = await caches.open(cacheName);
	const hit = await cache.match(request);
	if (hit) return hit;
	const res = await fetch(request);
	if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
	return res;
}

async function networkFirst(
	request: Request,
	cacheName: string,
	fallback?: string,
	ignoreSearch = false
) {
	const cache = await caches.open(cacheName);
	try {
		const res = await fetch(request);
		// Don't cache redirects (e.g. to /sign-in) as if they were the page.
		if (res.ok && !res.redirected) cache.put(stripSearch(request, ignoreSearch), res.clone());
		return res;
	} catch (err) {
		const hit = await cache.match(request, { ignoreSearch });
		if (hit) return hit;
		if (fallback) {
			const page = await caches.match(fallback);
			if (page) return page;
		}
		throw err;
	}
}

async function staleWhileRevalidate(request: Request, cacheName: string) {
	const cache = await caches.open(cacheName);
	const hit = await cache.match(request);
	const refresh = fetch(request)
		.then((res) => {
			if (res.ok) cache.put(request, res.clone());
			return res;
		})
		.catch(() => undefined);
	return hit ?? (await refresh) ?? Response.error();
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
		event.respondWith(cacheFirst(request, FONTS));
		return;
	}
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith('/api/auth')) return;

	if (PRECACHED.has(url.pathname)) {
		event.respondWith(cacheFirst(request, SHELL));
		return;
	}
	if (url.pathname === '/api/exercises') {
		event.respondWith(staleWhileRevalidate(request, DATA));
		return;
	}
	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request, PAGES, '/offline'));
		return;
	}
	if (url.pathname.endsWith('/__data.json')) {
		event.respondWith(networkFirst(request, PAGES, undefined, true));
	}
});

/** SvelteKit data URLs carry a changing query string; cache them under the bare path. */
function stripSearch(request: Request, strip: boolean) {
	if (!strip) return request;
	const url = new URL(request.url);
	url.search = '';
	return url.toString();
}

self.addEventListener('message', (event) => {
	// Sent on sign-out so the next person on this device doesn't see cached pages.
	if (event.data?.type === 'clear-user-cache') {
		event.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(DATA)]));
	}
	// Sent by the app shell after sign-in: pre-cache the core screens for offline use.
	if (event.data?.type === 'warm' && Array.isArray(event.data.urls)) {
		event.waitUntil(
			(async () => {
				const cache = await caches.open(PAGES);
				await Promise.all(
					(event.data.urls as string[]).map(async (path) => {
						try {
							const res = await fetch(path, { credentials: 'same-origin' });
							if (res.ok && !res.redirected) await cache.put(path, res);
						} catch {
							// offline or signed out: skip
						}
					})
				);
			})()
		);
	}
});
