import { fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '#lib/server/db.ts';
import { MEASUREMENT_KINDS } from '#lib/types.ts';
import { uuidv7 } from '#lib/uuid.ts';
import type { Actions, PageServerLoad } from './$types';

const KG_PER_LB = 0.45359237;

export const load: PageServerLoad = async ({ locals }) => {
	const rows = await db.measurement.findMany({
		where: { userId: locals.user!.id },
		orderBy: [{ measuredAt: 'asc' }, { createdAt: 'asc' }],
		select: { id: true, kind: true, value: true, measuredAt: true }
	});
	return {
		measurements: rows.map((r) => ({
			id: r.id,
			kind: r.kind,
			value: r.value.toNumber(),
			measuredAt: r.measuredAt.toISOString()
		}))
	};
};

/** Keep the profile's bodyweight equal to the latest bodyweight entry. */
async function syncProfileBodyweight(userId: string) {
	const latest = await db.measurement.findFirst({
		where: { userId, kind: 'BODYWEIGHT' },
		orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
		select: { value: true }
	});
	await db.profile.updateMany({
		where: { userId },
		data: { bodyweightKg: latest?.value ?? null }
	});
}

const AddForm = v.object({
	kind: v.picklist(MEASUREMENT_KINDS),
	value: v.pipe(
		v.string(),
		v.transform((s) => Number(s.replace(',', '.'))),
		v.number('Enter a number'),
		v.minValue(0.1, 'Enter a number'),
		v.maxValue(1000)
	),
	date: v.pipe(v.string(), v.isoDate('Pick a date'))
});

export const actions: Actions = {
	add: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const parsed = v.safeParse(AddForm, Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.issues[0].message });
		const { kind, date } = parsed.output;
		let value = parsed.output.value;
		if (kind === 'BODY_FAT' && value > 75) return fail(400, { error: 'Body fat is a percentage' });

		if (kind === 'BODYWEIGHT') {
			const profile = await db.profile.findUnique({ where: { userId }, select: { units: true } });
			if (profile?.units === 'LB') value *= KG_PER_LB;
		}

		// Noon on the chosen day: stays on that date in any timezone.
		const measuredAt = new Date(`${date}T12:00:00Z`);
		await db.measurement.create({
			data: { id: uuidv7(), userId, kind, value: Math.round(value * 100) / 100, measuredAt }
		});
		if (kind === 'BODYWEIGHT') await syncProfileBodyweight(userId);
		return { added: kind };
	},

	delete: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const id = String((await request.formData()).get('id') ?? '');
		const gone = await db.measurement.findFirst({ where: { id, userId }, select: { kind: true } });
		if (!gone) return { deleted: true };
		await db.measurement.delete({ where: { id } });
		if (gone.kind === 'BODYWEIGHT') await syncProfileBodyweight(userId);
		return { deleted: true };
	}
};
