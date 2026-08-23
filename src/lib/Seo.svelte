<script lang="ts">
	import { page } from '$app/stores';

	// Head tags for one page. Anything behind the login gets noindex - an internal
	// task tracker has nothing to gain from being crawled, and plenty to lose.
	let {
		title,
		description = '',
		noindex = false,
		image = '/logo.svg',
		type = 'website'
	}: {
		title: string;
		description?: string;
		noindex?: boolean;
		image?: string;
		type?: string;
	} = $props();

	const SITE = 'TalasTrack';

	let fullTitle = $derived(title === SITE ? title : `${title} | ${SITE}`);
	// Canonical without the query string, so ?redirect= variants do not read as
	// separate pages.
	let canonical = $derived(new URL($page.url.pathname, $page.url.origin).href);
	let imageUrl = $derived(new URL(image, $page.url.origin).href);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}

	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<link rel="canonical" href={canonical} />
		<meta property="og:type" content={type} />
		<meta property="og:site_name" content={SITE} />
		<meta property="og:title" content={fullTitle} />
		{#if description}
			<meta property="og:description" content={description} />
		{/if}
		<meta property="og:url" content={canonical} />
		<meta property="og:image" content={imageUrl} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={fullTitle} />
		{#if description}
			<meta name="twitter:description" content={description} />
		{/if}
		<meta name="twitter:image" content={imageUrl} />
	{/if}
</svelte:head>
