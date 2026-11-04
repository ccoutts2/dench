/**
 * In-app confirmation dialog. Replaces window.confirm(), which is unreliable in
 * iOS home-screen apps. Usage: `if (await ask({ title, confirmLabel })) ...`
 */
type Request = {
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
	resolve: (ok: boolean) => void;
};

class ConfirmState {
	current = $state<Request | null>(null);

	settle(ok: boolean) {
		this.current?.resolve(ok);
		this.current = null;
	}
}

export const confirmState = new ConfirmState();

export function ask(opts: Omit<Request, 'resolve'>): Promise<boolean> {
	confirmState.settle(false); // only one at a time
	return new Promise((resolve) => (confirmState.current = { ...opts, resolve }));
}
