import PocketBase from 'pocketbase';

// Ideally, this should be an environment variable (e.g. PUBLIC_POCKETBASE_URL),
// but for this project we hardcode it as requested.
export const pb = new PocketBase('https://api-track.greenpendap.space/');

// PocketBase keeps the useful part of a 400 in response.data as per-field errors;
// e.message on its own is just "Failed to create record."
export function pbError(e: any): string {
	const fields = e?.response?.data ?? e?.data ?? {};
	const details = Object.entries(fields)
		.map(([field, err]: [string, any]) => `${field}: ${err?.message ?? err}`)
		.join('; ');
	if (details) return details;
	if (e?.status === 403) return 'Not allowed by this collection’s API rules.';
	return e?.message || 'Something went wrong.';
}
