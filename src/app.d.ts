// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Session } from '#lib/server/auth.ts';

declare global {
	namespace App {
		interface Locals {
			user: Session['user'] | null;
			session: Session['session'] | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
