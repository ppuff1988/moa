import { env } from '$env/dynamic/public';
import { HOME_DESCRIPTION, HOME_TITLE } from '$lib/content/site';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
	return {
		...data,
		gtmId: env.PUBLIC_GTM_ID || '',
		title: HOME_TITLE,
		description: HOME_DESCRIPTION
	};
};
