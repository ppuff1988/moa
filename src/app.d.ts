import type { User, Session } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
	}

	interface Window {
		dataLayer: Record<string, unknown>[];
	}
}

export {};
