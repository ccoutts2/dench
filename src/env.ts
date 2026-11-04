import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Pooled Neon Postgres connection string (used by the app at runtime).'
	},
	BETTER_AUTH_SECRET: {
		description: 'Random 32+ character secret used to sign Better Auth sessions.'
	},
	BETTER_AUTH_URL: {
		description: 'Public origin of the app, e.g. https://dench.vercel.app',
		schema: (value) => {
			if (!value) return undefined;
			// Accept a bare host like "dench.vercel.app" and assume https.
			const withProtocol = /^https?:\/\//.test(value) ? value : `https://${value}`;
			try {
				return new URL(withProtocol).origin;
			} catch {
				throw new Error(
					`BETTER_AUTH_URL must be a URL like https://dench.vercel.app (got "${value}")`
				);
			}
		}
	},
	GOOGLE_CLIENT_ID: { description: 'Google OAuth client id (optional).', schema: optional },
	GOOGLE_CLIENT_SECRET: { description: 'Google OAuth client secret (optional).', schema: optional },
	APPLE_CLIENT_ID: { description: 'Sign in with Apple Services ID (optional).', schema: optional },
	APPLE_CLIENT_SECRET: {
		description: 'Sign in with Apple client secret JWT (optional).',
		schema: optional
	},
	VAPID_PUBLIC_KEY: {
		description:
			'Web Push public key, shared with the browser (optional: no rest alerts without it).',
		public: true,
		schema: optional
	},
	VAPID_PRIVATE_KEY: { description: 'Web Push private key (optional).', schema: optional },
	APPLE_APP_BUNDLE_IDENTIFIER: {
		description: 'Apple app bundle identifier, if a native wrapper is added later (optional).',
		schema: optional
	}
});
