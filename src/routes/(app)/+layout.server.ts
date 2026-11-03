import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	// hooks.server.ts already guards these routes; this narrows the type.
	if (!locals.user) redirect(303, `/sign-in?next=${encodeURIComponent(url.pathname)}`);
	return { user: { id: locals.user.id, name: locals.user.name, email: locals.user.email } };
};
