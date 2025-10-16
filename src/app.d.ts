import type { User } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
		}
	}

	interface Window {
		dataLayer: Record<string, unknown>[];
	}
}

export {};
