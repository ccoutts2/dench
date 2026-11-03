import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { count } = await db.template.deleteMany({
		where: { id: params.id, userId: locals.user!.id }
	});
	if (count === 0) error(404, 'Template not found');
	// Drop folders the delete left empty.
	await db.folder.deleteMany({ where: { userId: locals.user!.id, templates: { none: {} } } });
	return new Response(null, { status: 204 });
};
