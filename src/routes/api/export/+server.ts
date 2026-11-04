import { db } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

const KG_PER_LB = 0.45359237;

/** Quote a CSV field when it needs it (commas, quotes, newlines). */
const cell = (v: string | number | null | undefined) => {
	if (v === null || v === undefined) return '';
	const s = String(v);
	return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** Every logged set, one row each, in the user's unit. Opens in any spreadsheet. */
export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.user!.id;
	const [profile, workouts] = await Promise.all([
		db.profile.findUnique({ where: { userId }, select: { units: true } }),
		db.workout.findMany({
			where: { userId, finishedAt: { not: null } },
			orderBy: { startedAt: 'asc' },
			include: {
				exercises: {
					orderBy: { position: 'asc' },
					include: {
						exercise: { select: { name: true } },
						sets: { orderBy: { position: 'asc' } }
					}
				}
			}
		})
	]);
	const lb = profile?.units === 'LB';
	const unit = lb ? 'lb' : 'kg';
	const weight = (kg: number | null) =>
		kg === null ? null : lb ? +(kg / KG_PER_LB).toFixed(1) : +kg.toFixed(2);

	const header = [
		'Date',
		'Workout',
		'Session',
		'Duration (min)',
		'Exercise',
		'Superset',
		'Set',
		'Set type',
		`Weight (${unit})`,
		'Reps',
		'Exercise notes',
		'Workout notes'
	];
	const lines = [header.join(',')];
	for (const w of workouts) {
		const minutes = Math.round((w.finishedAt!.getTime() - w.startedAt.getTime()) / 60000);
		const groups = new Map<string, string>();
		for (const e of w.exercises) {
			if (e.supersetGroup && !groups.has(e.supersetGroup)) {
				groups.set(e.supersetGroup, String.fromCharCode(65 + groups.size));
			}
			e.sets.forEach((s, i) => {
				lines.push(
					[
						w.startedAt.toISOString(),
						w.name,
						w.sessionType.toLowerCase(),
						minutes,
						e.exercise.name,
						e.supersetGroup ? groups.get(e.supersetGroup) : '',
						i + 1,
						s.type.toLowerCase(),
						weight(s.weightKg?.toNumber() ?? null),
						s.reps,
						e.notes,
						w.notes
					]
						.map(cell)
						.join(',')
				);
			});
		}
	}

	const date = new Date().toISOString().slice(0, 10);
	return new Response(lines.join('\r\n') + '\r\n', {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="dench-workouts-${date}.csv"`,
			'cache-control': 'private, no-store'
		}
	});
};
