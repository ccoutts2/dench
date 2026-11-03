import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import {
	APPLE_APP_BUNDLE_IDENTIFIER,
	APPLE_CLIENT_ID,
	APPLE_CLIENT_SECRET,
	BETTER_AUTH_SECRET,
	BETTER_AUTH_URL,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET
} from '$app/env/private';
import { db } from './db.ts';

/** Google and Apple are enabled only when their credentials are configured. */
const socialProviders: BetterAuthOptions['socialProviders'] = {};
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
	socialProviders.google = { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET };
}
if (APPLE_CLIENT_ID && APPLE_CLIENT_SECRET) {
	socialProviders.apple = {
		clientId: APPLE_CLIENT_ID,
		clientSecret: APPLE_CLIENT_SECRET,
		appBundleIdentifier: APPLE_APP_BUNDLE_IDENTIFIER
	};
}

export const enabledProviders = {
	google: 'google' in socialProviders,
	apple: 'apple' in socialProviders
};

export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	baseURL: BETTER_AUTH_URL,
	database: prismaAdapter(db, { provider: 'postgresql' }),
	emailAndPassword: { enabled: true, minPasswordLength: 8 },
	socialProviders,
	trustedOrigins: enabledProviders.apple ? ['https://appleid.apple.com'] : [],
	session: {
		// Lifters open the app a few times a week; keep them signed in.
		expiresIn: 60 * 60 * 24 * 60,
		updateAge: 60 * 60 * 24,
		cookieCache: { enabled: true, maxAge: 5 * 60 }
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await db.profile.create({ data: { userId: user.id, liftingSince: new Date() } });
				}
			}
		}
	},
	// Must be last so Set-Cookie from server-side auth calls reaches the browser.
	plugins: [sveltekitCookies(getRequestEvent)]
});

export type Session = typeof auth.$Infer.Session;
