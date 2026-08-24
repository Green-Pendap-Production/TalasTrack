<script lang="ts">
	import { pb } from '$lib/pocketbase';

	// Falls back to the initial whenever there is no picture - which covers both
	// "this person has not uploaded one" and "this schema has no avatar field".
	let {
		user,
		size = 'md',
		class: klass = 'bg-brand-light text-brand-gold-800'
	}: {
		user: any;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
	} = $props();

	const SIZES = {
		xs: 'h-6 w-6 text-[11px]',
		sm: 'h-7 w-7 text-xs',
		md: 'h-9 w-9 text-sm',
		lg: 'h-10 w-10 text-sm',
		xl: 'h-16 w-16 text-2xl'
	};

	// A 200px thumb keeps a 4MB upload from being shipped down for a 36px circle.
	let src = $derived(user?.avatar ? pb.files.getURL(user, user.avatar, { thumb: '200x200' }) : '');
	let initial = $derived((user?.name || user?.email || '?').charAt(0).toUpperCase());
</script>

{#if src}
	<img
		{src}
		alt=""
		class={`${SIZES[size]} shrink-0 rounded-full object-cover`}
		loading="lazy"
		decoding="async"
	/>
{:else}
	<span
		aria-hidden="true"
		class={`${SIZES[size]} ${klass} flex shrink-0 items-center justify-center rounded-full font-bold`}
	>
		{initial}
	</span>
{/if}
