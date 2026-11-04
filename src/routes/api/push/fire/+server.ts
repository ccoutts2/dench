import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import { runAlert, verify } from '#lib/server/push.ts';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 300 };

/**
 * Internal hand-over for rests longer than one function lifetime. Called by
 * the server itself (no session), so it's authenticated with an HMAC instead.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const parsed = v.safeParse(
		v.object({ userId: v.string(), token: v.string(), sig: v.string() }),
		await request.json().catch(() => null)
	);
	if (!parsed.success) error(400, 'Bad request');
	const { userId, token, sig } = parsed.output;
	if (!verify(userId, token, sig)) error(403, 'Bad signature');
	runAlert(url.origin, userId, token);
	return json({ ok: true });
};
