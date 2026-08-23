<script lang="ts">
	import { page } from '$app/stores';
	import { pb, pbError } from '$lib/pocketbase';
	import { tally } from '$lib/polls';
	import Seo from '$lib/Seo.svelte';
	import PollResults from '$lib/PollResults.svelte';
	import TurnoutRing from '$lib/TurnoutRing.svelte';
	import { onMount } from 'svelte';
	import { Check, Vote, ArrowLeft, Lock, LockOpen, Trophy } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let pollId = $page.params.id!;
	let poll = $state<any>(null);
	let votes = $state<any[]>([]);
	let members = $state<any[]>([]);
	let loading = $state(true);
	let selectedOption = $state('');
	let submitting = $state(false);
	let error = $state('');
	let realtime = $state(true);

	let user = pb.authStore.model;

	let myVote = $derived(votes.find((v) => v.user === user?.id));
	// Directors only get the extra close/reopen control - they vote like everyone else.
	let isDirector = $derived(user?.role === 'director');
	// Results stay hidden until you've voted, so an early lead can't anchor later voters.
	let showResults = $derived(!!myVote || !poll?.is_open);
	let counts = $derived(tally(votes, poll?.options ?? []));
	let votedIds = $derived(votes.map((v) => v.user));

	onMount(() => {
		load();
		// Live results - pocketbase gives this for free, no polling loop to own.
		let unsub: (() => void) | undefined;
		pb.collection('votes')
			.subscribe('*', (e) => {
				if (e.record.poll === pollId) loadVotes();
			})
			.then((fn) => (unsub = fn))
			.catch(() => (realtime = false)); // API rules, or a proxy that eats SSE

		// Realtime rides on a long-lived SSE connection, which proxies and CDNs
		// like to buffer or time out. Refetching when the tab regains focus keeps
		// the tally honest wherever that connection does not survive.
		const refresh = () => loadVotes();
		window.addEventListener('focus', refresh);

		return () => {
			unsub?.();
			window.removeEventListener('focus', refresh);
		};
	});

	async function load() {
		loading = true;
		try {
			poll = await pb.collection('polls').getOne(pollId, { expand: 'created_by' });
			await loadVotes();
			try {
				members = await pb.collection('users').getFullList();
			} catch {
				members = []; // users not readable: the turnout ring just stays hidden
			}
		} catch {
			error = 'Failed to load poll. It might have been deleted.';
		} finally {
			loading = false;
		}
	}

	async function loadVotes() {
		if (!user) return; // share-link visitors see the question, not the tally
		try {
			votes = await pb.collection('votes').getFullList({ filter: `poll="${pollId}"` });
		} catch {
			votes = []; // votes hidden by API rules - the poll itself still renders
		}
	}

	async function handleVote() {
		if (!user) return goto(`/login?redirect=/voting/${pollId}`);
		if (!selectedOption) {
			error = 'Please select an option first.';
			return;
		}
		submitting = true;
		error = '';
		try {
			// The server needs a unique index on (poll, user) to make this airtight.
			// This check only stops the honest double-click.
			if (myVote) throw new Error('You have already voted in this poll.');
			await pb.collection('votes').create({ poll: pollId, user: user.id, option: selectedOption });
			await loadVotes();
		} catch (e: any) {
			error = pbError(e);
		} finally {
			submitting = false;
		}
	}

	async function togglePoll() {
		const is_open = !poll.is_open;
		poll.is_open = is_open;
		try {
			await pb.collection('polls').update(pollId, { is_open });
		} catch (e: any) {
			poll.is_open = !is_open;
			error = pbError(e);
		}
	}
</script>

<Seo
	title={poll?.title || 'Vote'}
	description={poll?.description || 'Cast your vote on this proposal.'}
	type="article"
/>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-brand-light-100 px-4 py-12 sm:px-6 lg:px-8"
>
	<div class="w-full max-w-2xl">
		<div class="mb-6 flex items-center justify-between">
			<a
				href="/voting"
				class="inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-brand-dark"
			>
				<ArrowLeft class="mr-1 h-4 w-4" />
				Back to Polls
			</a>

			{#if !user}
				<a
					href={`/login?redirect=/voting/${pollId}`}
					class="text-sm font-medium text-brand-gold-700 hover:underline"
				>
					Sign in to vote
				</a>
			{:else if isDirector && poll}
				<button
					onclick={togglePoll}
					class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-brand-dark"
				>
					{#if poll.is_open}
						<Lock class="h-4 w-4" /> Close poll
					{:else}
						<LockOpen class="h-4 w-4" /> Reopen poll
					{/if}
				</button>
			{/if}
		</div>

		{#if loading}
			<div class="rounded-2xl bg-white p-12 text-center text-gray-500 shadow-xl">
				Loading poll...
			</div>
		{:else if !poll}
			<div class="rounded-2xl bg-white p-12 text-center text-red-500 shadow-xl">
				Poll not found.
			</div>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
				<div class="bg-brand-dark p-8 text-center text-brand-light">
					<div
						class="mb-4 inline-flex items-center justify-center rounded-full bg-brand-dark-900 p-3"
					>
						<Vote class="h-8 w-8 text-brand-gold-700" />
					</div>
					<h1 class="text-3xl font-bold">{poll.title}</h1>
					{#if poll.description}
						<p class="mx-auto mt-4 max-w-lg text-brand-light/80">{poll.description}</p>
					{/if}
					{#if !poll.is_open}
						<span
							class="mt-4 inline-flex items-center rounded-full bg-brand-dark-900 px-3 py-1 text-xs font-medium text-brand-light/80"
						>
							Closed
						</span>
					{/if}
				</div>

				<div class="p-8">
					{#if error}
						<div
							class="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-center text-sm text-red-600"
						>
							{error}
						</div>
					{/if}

					{#if showResults}
						{#if myVote}
							<div
								class="mb-6 flex items-center justify-center gap-2 rounded-lg border border-green-100 bg-green-50 py-3 text-sm font-medium text-green-700"
							>
								<Check class="h-4 w-4" />
								You voted for "{myVote.option}"
							</div>
						{/if}

						{#if !poll.is_open && counts.winners.length}
							<p
								class="mb-6 flex items-center justify-center gap-2 text-sm font-medium text-brand-dark"
							>
								<Trophy class="h-4 w-4 text-brand-gold-700" />
								{counts.winners.length > 1 ? 'Tied: ' : 'Winner: '}{counts.winners
									.map((w) => w.option)
									.join(', ')}
							</p>
						{/if}

						<PollResults
							results={counts.results}
							total={counts.total}
							{members}
							{votedIds}
							myOption={myVote?.option ?? ''}
						/>

						{#if !realtime}
							<p class="mt-6 text-center text-xs text-gray-400">
								Live updates unavailable - figures refresh when you return to this tab.
							</p>
						{/if}
					{:else if !poll.is_open}
						<div class="py-8 text-center">
							<h3 class="mb-2 text-xl font-bold text-gray-900">This poll is closed</h3>
							<p class="text-gray-500">Voting is no longer active for this poll.</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each poll.options as option}
								<label
									class={`
                    relative flex cursor-pointer items-center rounded-xl border-2 p-4 transition-all duration-200
                    ${
											selectedOption === option
												? 'border-brand-gold bg-brand-light-100/50 shadow-sm'
												: 'border-gray-100 hover:border-brand-gold/30 hover:bg-gray-50'
										}
                  `}
								>
									<input
										type="radio"
										name="option"
										value={option}
										bind:group={selectedOption}
										class="sr-only"
									/>
									<div
										class={`
                    mr-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors
                    ${selectedOption === option ? 'border-brand-gold bg-brand-gold' : 'border-gray-300'}
                  `}
									>
										{#if selectedOption === option}
											<div class="h-2 w-2 rounded-full bg-white"></div>
										{/if}
									</div>
									<span
										class={`font-medium ${selectedOption === option ? 'text-brand-dark' : 'text-gray-700'}`}
									>
										{option}
									</span>
								</label>
							{/each}
						</div>

						{#if members.length}
							<!-- Turnout is not the tally: safe to watch before you have voted. -->
							<div class="mt-8 border-t border-gray-100 pt-6">
								<TurnoutRing {members} {votedIds} />
							</div>
						{/if}

						<div class="mt-8 border-t border-gray-100 pt-6">
							<button
								onclick={handleVote}
								disabled={submitting || !selectedOption}
								class="flex w-full items-center justify-center rounded-xl border border-transparent bg-brand-gold-700 px-4 py-4 text-lg font-medium text-white shadow-sm transition-all hover:bg-brand-gold-800 focus:ring-2 focus:ring-brand-gold-700 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if submitting}
									<div
										class="mr-2 h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"
									></div>
									Submitting...
								{:else}
									Submit Vote
								{/if}
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
