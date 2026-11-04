import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Don't read `url` here: that would re-run this load on every navigation, so
// moving between screens offline (e.g. finishing a workout) would need the server.
// hooks.server.ts already redirects signed-out visitors with ?next=.
export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/sign-in');
	return { user: { id: locals.user.id, name: locals.user.name, email: locals.user.email } };
};
