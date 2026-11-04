import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import type { LayoutServerLoad } from './$types';

// Don't read `url` here: that would re-run this load on every navigation, so
// moving between screens offline (e.g. finishing a workout) would need the server.
// hooks.server.ts already redirects signed-out visitors with ?next=.
export const load: LayoutServerLoad = async ({ locals, depends }) => {
	if (!locals.user) redirect(303, '/sign-in');
	depends('app:profile');
	const profile = await db.profile.findUnique({
		where: { userId: locals.user.id },
		select: { units: true }
	});
	return {
		user: { id: locals.user.id, name: locals.user.name, email: locals.user.email },
		units: profile?.units ?? ('KG' as const)
	};
};
