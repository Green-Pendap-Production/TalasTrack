<script lang="ts">
	// Projector view: one poll, no chrome, type large enough to read from the back
	// of the room. Same data and the same realtime subscription as the vote page.
	import { page } from '$app/stores';
	import { pb } from '$lib/pocketbase';
	import { tally, seriesColor } from '$lib/polls';
	import TurnoutRing from '$lib/TurnoutRing.svelte';
	import { onMount } from 'svelte';
	import { Maximize, Minimize, Eye, EyeOff, Trophy } from 'lucide-svelte';

	let pollId = $page.params.id!;
	let poll = $state<any>(null);
	let votes = $state<any[]>([]);
	let members = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');
	let realtime = $state(true);
	let full = $state(false);
	// The vote page hides the tally until you have voted so an early lead cannot
	// anchor the room. A screen at the front would undo that, so it shows turnout
	// while the poll runs and the numbers once it closes - or when asked.
	let reveal = $state(false);

	let counts = $derived(tally(votes, poll?.options ?? []));
	let showTally = $derived(reveal || (poll ? !poll.is_open : false));
	let votedIds = $derived(votes.map((v) => v.user));
	let voteUrl = $derived(`${$page.url.host}/voting/${pollId}`);

	onMount(() => {
		load();
		let unsub: (() => void) | undefined;
		pb.collection('votes')
			.subscribe('*', (e) => {
				if (e.record.poll === pollId) refresh();
			})
			.then((fn) => (unsub = fn))
			.catch(() => (realtime = false));

		// A projector screen that blanks mid-vote is the whole failure mode here.
		let lock: any;
		navigator.wakeLock?.request('screen').then(
			(l) => (lock = l),
			() => {}
		);

		window.addEventListener('focus', refresh);
		const onFs = () => (full = !!document.fullscreenElement);
		document.addEventListener('fullscreenchange', onFs);

		return () => {
			unsub?.();
			lock?.release?.();
			window.removeEventListener('focus', refresh);
			document.removeEventListener('fullscreenchange', onFs);
		};
	});

	async function load() {
		try {
			poll = await pb.collection('polls').getOne(pollId);
			await refresh();
			try {
				members = await pb.collection('users').getFullList();
			} catch {
				members = []; // not readable: turnout falls back to a plain count
			}
		} catch {
			error = 'Poll not found.';
		} finally {
			loading = false;
		}
	}

	async function refresh() {
		try {
			votes = await pb.collection('votes').getFullList({ filter: `poll="${pollId}"` });
		} catch {
			error = pb.authStore.model
				? 'Votes are not readable with these API rules.'
				: 'Sign in on this device to display the tally.';
		}
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) document.exitFullscreen();
		else document.documentElement.requestFullscreen().catch(() => {});
	}
</script>

<svelte:head>
	<title>{poll?.title ?? 'Presenter'}</title>
</svelte:head>

<div class="flex min-h-dvh flex-col bg-brand-dark px-[4vw] py-[3vh] text-brand-light">
	<!-- Controls sit quiet in the corner; they are for the person driving, not the room. -->
	<div class="flex items-start justify-between gap-4">
		<img src="/logo.svg" alt="TrackMyPendap" class="h-[5vh] w-auto rounded bg-brand-light p-1.5" />
		<div class="flex items-center gap-2 opacity-40 transition-opacity hover:opacity-100">
			{#if poll?.is_open}
				<button
					onclick={() => (reveal = !reveal)}
					class="inline-flex items-center gap-2 rounded-lg border border-brand-light/30 px-3 py-2 text-sm hover:bg-white/10"
				>
					{#if reveal}<EyeOff class="h-4 w-4" /> Hide tally{:else}<Eye class="h-4 w-4" /> Reveal tally{/if}
				</button>
			{/if}
			<button
				onclick={toggleFullscreen}
				aria-label="Toggle fullscreen"
				class="rounded-lg border border-brand-light/30 p-2 hover:bg-white/10"
			>
				{#if full}<Minimize class="h-4 w-4" />{:else}<Maximize class="h-4 w-4" />{/if}
			</button>
		</div>
	</div>

	{#if loading}
		<p class="flex flex-1 items-center justify-center text-[3vh] text-brand-light/60">Loading…</p>
	{:else if !poll}
		<p class="flex flex-1 items-center justify-center text-[3vh] text-red-300">{error}</p>
	{:else}
		<div class="flex flex-1 flex-col justify-center gap-[3vh] py-[2vh]">
			<div class="text-center">
				<h1 class="text-[6vh] leading-tight font-bold text-balance">{poll.title}</h1>
				{#if poll.description}
					<p class="mx-auto mt-[1.5vh] max-w-[60ch] text-[2.4vh] text-balance text-brand-light/70">
						{poll.description}
					</p>
				{/if}
				{#if !poll.is_open && counts.winners.length}
					<p
						class="mt-[2vh] inline-flex items-center gap-3 rounded-full bg-brand-gold px-6 py-2 text-[2.6vh] font-semibold text-white"
					>
						<Trophy class="h-[3vh] w-[3vh]" />
						{counts.winners.length > 1 ? 'Tied: ' : 'Winner: '}{counts.winners
							.map((w) => w.option)
							.join(', ')}
					</p>
				{/if}
			</div>

			{#if error}
				<p class="text-center text-[2vh] text-red-300">{error}</p>
			{/if}

			{#if showTally}
				<div class="mx-auto w-full max-w-[70vw] space-y-[2vh]">
					{#each counts.results as r, i}
						<div>
							<div class="mb-[0.8vh] flex items-baseline justify-between gap-6 text-[2.8vh]">
								<span class="min-w-0 truncate font-semibold">{r.option}</span>
								<span class="whitespace-nowrap text-brand-light/70 tabular-nums">
									{r.count} &middot; {r.pct}%
								</span>
							</div>
							<div class="h-[3vh] w-full overflow-hidden rounded-full bg-white/10">
								<div
									class="h-full rounded-full transition-all duration-700"
									style={`width:${r.pct}%;background:${seriesColor(i)}`}
								></div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<!-- Poll still running: the options, not who is ahead. -->
				<div class="mx-auto flex max-w-[70vw] flex-wrap justify-center gap-[1.5vh]">
					{#each poll.options as option, i}
						<span
							class="inline-flex items-center gap-3 rounded-2xl border border-brand-light/20 bg-white/5 px-[2.5vw] py-[1.5vh] text-[2.8vh] font-semibold"
						>
							<span class="h-[1.6vh] w-[1.6vh] rounded-sm" style={`background:${seriesColor(i)}`}
							></span>
							{option}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex flex-wrap items-center justify-between gap-[2vh]">
			<div>
				<p class="text-[1.8vh] tracking-[0.2em] text-brand-light/50 uppercase">Vote at</p>
				<p class="text-[3vh] font-semibold text-brand-gold-300">{voteUrl}</p>
			</div>

			<div class="flex items-center gap-[3vw]">
				{#if members.length}
					<!-- Turnout is not the tally - safe on screen while voting is open. -->
					<div class="w-[22vh]">
						<TurnoutRing {members} {votedIds} big />
					</div>
				{:else}
					<div class="text-right">
						<p class="text-[7vh] leading-none font-bold tabular-nums">{counts.total}</p>
						<p class="text-[1.8vh] tracking-[0.2em] text-brand-light/50 uppercase">Votes cast</p>
					</div>
				{/if}
				<span
					class={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[1.8vh] font-medium ${poll.is_open ? 'bg-brand-gold/20 text-brand-gold-300' : 'bg-white/10 text-brand-light/60'}`}
				>
					<span
						class={`h-[1.2vh] w-[1.2vh] rounded-full ${poll.is_open && realtime ? 'animate-pulse bg-brand-gold-300' : 'bg-brand-light/40'}`}
					></span>
					{poll.is_open ? 'Voting open' : 'Closed'}
				</span>
			</div>
		</div>
	{/if}
</div>
