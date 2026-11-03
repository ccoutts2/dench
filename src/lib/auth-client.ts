import { createAuthClient } from 'better-auth/svelte';
import { browser } from '$app/env';

// Pass the origin explicitly: without it Better Auth reads BETTER_AUTH_URL from
// process.env during SSR, bypassing the normalisation in src/env.ts. The client
// only makes requests in the browser, so the server-side value is a placeholder.
export const authClient = createAuthClient({
	baseURL: browser ? window.location.origin : 'http://localhost'
});
