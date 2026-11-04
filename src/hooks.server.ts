import { redirect } from '@sveltejs/kit';
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';

/** Routes reachable without a session. */
// /api/push/fire is server-to-server and checks its own HMAC signature.
const PUBLIC = ['/welcome', '/sign-in', '/sign-up', '/api/auth', '/offline', '/api/push/fire'];
const isPublic = (path: string) => PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

const authHandle: Handle = async ({ event, resolve }) => {
	if (!building) {
		const session = await auth.api.getSession({ headers: event.request.headers });
		event.locals.user = session?.user ?? null;
		event.locals.session = session?.session ?? null;
	}
	return svelteKitHandler({ event, resolve, auth, building });
};

const guard: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (!event.locals.user && !isPublic(path)) {
		if (path.startsWith('/api/')) return new Response('Unauthorized', { status: 401 });
		// First-time visitors to the root get the landing page, not a bare form.
		if (path === '/') redirect(303, '/welcome');
		redirect(303, `/sign-in?next=${encodeURIComponent(path + event.url.search)}`);
	}
	if (event.locals.user && (path === '/sign-in' || path === '/sign-up')) redirect(303, '/');
	return resolve(event);
};

export const handle = sequence(authHandle, guard);
