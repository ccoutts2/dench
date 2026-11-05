import { db } from './db.ts';
import type { MeasurementDTO, MeasurementKind } from '#lib/types.ts';

export async function measurementsFor(userId: string): Promise<MeasurementDTO[]> {
	const rows = await db.measurement.findMany({
		where: { userId },
		orderBy: [{ measuredAt: 'asc' }, { createdAt: 'asc' }],
		select: { id: true, kind: true, value: true, measuredAt: true }
	});
	return rows.map((r) => ({
		id: r.id,
		kind: r.kind as MeasurementKind,
		value: r.value.toNumber(),
		measuredAt: r.measuredAt.toISOString()
	}));
}

/** Keep the profile's bodyweight equal to the latest bodyweight entry. */
export async function syncProfileBodyweight(userId: string) {
	const latest = await db.measurement.findFirst({
		where: { userId, kind: 'BODYWEIGHT' },
		orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
		select: { value: true }
	});
	await db.profile.updateMany({ where: { userId }, data: { bodyweightKg: latest?.value ?? null } });
}
