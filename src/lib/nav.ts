/** The four tab roots. Moving between them is a "tab switch", not going deeper. */
export const TAB_ROOTS = ['/', '/history', '/exercises', '/profile'];

export const isTabSwitch = (from?: string, to?: string) =>
	!!from && !!to && from !== to && TAB_ROOTS.includes(from) && TAB_ROOTS.includes(to);
