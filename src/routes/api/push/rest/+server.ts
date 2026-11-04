import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '#lib/server/db.ts';
import { pushConfigured, runAlert } from '#lib/server/push.ts';
import { uuidv7 } from '#lib/uuid.ts';
import type { RequestHandler } from './$types';

// The request lingers in the background until the rest ends (see push.ts).
export const config = { maxDuration: 300 };

const Input = v.object({
	/** Epoch ms when the rest ends, or null to cancel. */
	endsAt: v.nullable(v.number()),
	title: v.optional(v.pipe(v.string(), v.maxLength(120)), 'Rest over'),
	body: v.optional(v.pipe(v.string(), v.maxLength(200)), '')
});

/** Start, move or cancel the rest-over alert for the current rest. */
export const POST: RequestHandler = async ({ locals, request, url }) => {
	const userId = locals.user!.id;
	const parsed = v.safeParse(Input, await request.json().catch(() => null));
	if (!parsed.success) error(400, 'Invalid rest');
	const { endsAt, title, body } = parsed.output;

	if (endsAt === null || !pushConfigured) {
		await db.restAlert.deleteMany({ where: { userId } });
		return json({ scheduled: false });
	}
	// Ignore nonsense: already over, or more than an hour away.
	if (endsAt < Date.now() || endsAt > Date.now() + 3_600_000) {
		await db.restAlert.deleteMany({ where: { userId } });
		return json({ scheduled: false });
	}

	const token = uuidv7();
	const data = { token, endsAt: new Date(endsAt), title, body };
	await db.restAlert.upsert({ where: { userId }, create: { userId, ...data }, update: data });
	runAlert(url.origin, userId, token);
	return json({ scheduled: true });
};
