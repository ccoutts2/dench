import { enabledProviders } from '#lib/server/auth.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({ providers: enabledProviders });
