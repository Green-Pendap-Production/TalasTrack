<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { Plus, Vote, CheckCircle2, Check } from 'lucide-svelte';

	let polls = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');
	let filter = $state('open');
	let user = pb.authStore.model;

	onMount(async () => {
		loading = true;
		try {
			const records = await pb
				.collection('polls')
				.getFullList({ sort: '-created', expand: 'created_by' });
			// One request for every vote, counted here, instead of one request per poll.
			// ponytail: fine while the whole org's vote history fits in a page load.
			let votes: any[] = [];
			try {
				votes = await pb.collection('votes').getFullList();
			} catch {
				votes = []; // votes not readable: cards just show no tallies
			}
			polls = records.map((r) => {
				const mine = votes.filter((v) => v.poll === r.id);
				return {
					...r,
					total_votes: mine.length,
					voted: mine.some((v) => v.user === user?.id)
				};
			});
		} catch (e: any) {
			// A refused request is not an empty list - say which one it was.
			error =
				e?.status === 403
					? 'Not allowed to read polls. Check the polls API rules in PocketBase.'
					: e.message;
		} finally {
			loading = false;
		}
	});

	let shown = $derived(
		polls.filter((p) => (filter === 'all' ? true : filter === 'open' ? p.is_open : !p.is_open))
	);
</script>

<svelte:head>
	<title>Voting | TalasTrack</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold text-brand-dark">Voting</h1>
			<p class="mt-1 text-gray-500">Participate in open polls or review closed ones.</p>
		</div>

		{#if user?.role === 'director'}
			<a
				href="/voting/new"
				class="inline-flex items-center gap-2 rounded-lg bg-brand-gold-700 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-brand-gold-800"
			>
				<Plus class="h-4 w-4" />
				New Poll
			</a>
		{/if}
	</div>

	{#if error}
		<div class="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
	{/if}

	<div class="inline-flex rounded-lg border border-gray-200 bg-white p-1">
		{#each [['open', 'Open'], ['closed', 'Closed'], ['all', 'All']] as [value, label]}
			<button
				onclick={() => (filter = value)}
				class={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
					filter === value ? 'bg-brand-dark text-white' : 'text-gray-600 hover:bg-gray-50'
				}`}
			>
				{label}
			</button>
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#if loading}
			<div class="col-span-full p-8 text-center text-gray-500">Loading polls...</div>
		{:else if shown.length === 0}
			<div
				class="col-span-full rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500"
			>
				No polls here right now.
			</div>
		{:else}
			{#each shown as poll}
				<div
					class="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
				>
					<div class="mb-4 flex items-start justify-between gap-4">
						<h3 class="text-lg font-bold text-brand-dark">{poll.title}</h3>
						{#if poll.is_open}
							<span
								class="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
							>
								Active
							</span>
						{:else}
							<span
								class="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
							>
								Closed
							</span>
						{/if}
					</div>

					<div class="mb-6 flex-1 space-y-2 text-sm text-gray-500">
						<p>Created by {poll.expand?.created_by?.name || 'Unknown'}</p>
						<p>{poll.total_votes || 0} total votes</p>
						{#if poll.voted}
							<p class="inline-flex items-center gap-1 font-medium text-green-700">
								<Check class="h-4 w-4" /> You voted
							</p>
						{/if}
					</div>

					<a
						href={`/voting/${poll.id}`}
						class={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-colors ${
							poll.is_open && !poll.voted
								? 'bg-brand-dark text-white hover:bg-brand-dark-900'
								: 'bg-gray-100 text-brand-dark hover:bg-gray-200'
						}`}
					>
						{#if poll.is_open && !poll.voted}
							<Vote class="h-4 w-4" />
							Vote Now
						{:else}
							<CheckCircle2 class="h-4 w-4" />
							View Results
						{/if}
					</a>
				</div>
			{/each}
		{/if}
	</div>
</div>
