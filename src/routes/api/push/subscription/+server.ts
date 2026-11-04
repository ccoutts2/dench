import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

const Subscription = v.object({
	endpoint: v.pipe(v.string(), v.url(), v.maxLength(1000)),
	keys: v.object({
		p256dh: v.pipe(v.string(), v.maxLength(200)),
		auth: v.pipe(v.string(), v.maxLength(100))
	})
});

/** Register this device for rest-over alerts. */
export const POST: RequestHandler = async ({ locals, request }) => {
	const parsed = v.safeParse(Subscription, await request.json().catch(() => null));
	if (!parsed.success) error(400, 'Invalid subscription');
	const { endpoint, keys } = parsed.output;
	const data = { userId: locals.user!.id, p256dh: keys.p256dh, auth: keys.auth };
	await db.pushSubscription.upsert({
		where: { endpoint },
		create: { endpoint, ...data },
		update: data
	});
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
	if (body?.endpoint) {
		await db.pushSubscription.deleteMany({
			where: { endpoint: body.endpoint, userId: locals.user!.id }
		});
	}
	return json({ ok: true });
};
