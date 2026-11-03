import { db } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Monday-start week, for the streak strip.
	const now = new Date();
	const weekStart = new Date(now);
	weekStart.setHours(0, 0, 0, 0);
	weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

	const [workoutsThisWeek, templateCount] = await Promise.all([
		db.workout.findMany({
			where: { userId, startedAt: { gte: weekStart }, finishedAt: { not: null } },
			select: { startedAt: true }
		}),
		db.template.count({ where: { userId } })
	]);

	return {
		weekStart: weekStart.toISOString(),
		trainedDays: workoutsThisWeek.map((w) => (w.startedAt.getDay() + 6) % 7),
		templateCount
	};
};
