/**
 * "What's new" notes shown once to existing users after an update.
 *
 * To announce a release, add an entry at the TOP with a new id (the date is
 * fine). Write for lifters, not developers: what they can now do, in a line.
 * Anyone who signed up before `date` sees it once, the next time they open the app.
 */
export type Release = {
	id: string;
	/** ISO date the release went out; accounts created after it don't see it. */
	date: string;
	title: string;
	items: { title: string; text: string }[];
};

export const RELEASES: Release[] = [
	{
		id: '2026-11-05',
		date: '2026-11-05T12:00:00Z',
		title: 'Fresh in Dench',
		items: [
			{
				title: 'See what you trained',
				text: 'Every workout and template now has a body map. Muscles light up by how much work they got, so you can spot what you skipped.'
			},
			{
				title: 'Your week at a glance',
				text: 'Profile shows your whole body over the last week or month, and tells you if, say, your back is falling behind your chest.'
			},
			{
				title: 'Measurements without signal',
				text: 'Log your weight or waist in a basement gym. It saves on your phone and syncs when you’re back online.'
			},
			{
				title: 'No more surprise rest alerts',
				text: 'If your phone loses signal, old “rest over” alerts are dropped instead of buzzing you minutes later.'
			}
		]
	}
];
