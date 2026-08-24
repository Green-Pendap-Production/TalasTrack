<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { CheckSquare, Vote, Clock, AlertTriangle } from 'lucide-svelte';
	import { projectScope, projectName } from '$lib/projects.svelte';
	import { inScope, ALL_PROJECTS, NO_PROJECT } from '$lib/projects';

	let user = pb.authStore.model;

	let myTasks = $state<any[]>([]);
	let openPolls = $state<any[]>([]);
	let myVotedPollIds = $state<string[]>([]);
	let loading = $state(true);
	let error = $state('');

	const startOfToday = new Date(new Date().toDateString());
	const inSevenDays = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

	// One fetch of my open work, then every number on this page is counted from it.
	// The sidebar switcher narrows that set - counting the unscoped list would
	// contradict the project you are looking at.
	let scopedTasks = $derived(
		projectScope.available ? myTasks.filter((t) => inScope(t, projectScope.id)) : myTasks
	);
	let scopeLabel = $derived(
		!projectScope.available || projectScope.id === ALL_PROJECTS
			? ''
			: projectScope.id === NO_PROJECT
				? ' outside any project'
				: ` in ${projectName(projectScope.id)}`
	);
	let overdue = $derived(
		scopedTasks.filter((t) => t.due_date && new Date(t.due_date) < startOfToday)
	);
	let dueSoon = $derived(
		scopedTasks.filter(
			(t) =>
				t.due_date && new Date(t.due_date) >= startOfToday && new Date(t.due_date) <= inSevenDays
		)
	);
	let needsMyVote = $derived(openPolls.filter((p) => !myVotedPollIds.includes(p.id)));
	let upcoming = $derived(
		[...overdue, ...dueSoon]
			.sort((a, b) => +new Date(a.due_date) - +new Date(b.due_date))
			.slice(0, 5)
	);

	onMount(async () => {
		if (!user) return;
		try {
			myTasks = await pb.collection('tasks').getFullList({
				filter: `assignees ~ "${user.id}" && status != "done"`,
				sort: 'due_date',
				expand: 'department,project'
			});
			openPolls = await pb
				.collection('polls')
				.getFullList({ filter: 'is_open = true', sort: '-created' });
			try {
				const mine = await pb.collection('votes').getFullList({ filter: `user = "${user.id}"` });
				myVotedPollIds = mine.map((v) => v.poll);
			} catch {
				myVotedPollIds = []; // votes not readable: every open poll just shows as pending
			}
		} catch (e: any) {
			// A refused request is not an empty dashboard - say so.
			error =
				e?.status === 403
					? 'Not allowed to read tasks or polls. Check your PocketBase API rules.'
					: e.message;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Dashboard | TalasTrack</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-brand-dark">Welcome back, {user?.name || user?.email}!</h1>
		<p class="mt-2 text-gray-500">Here's an overview of what's happening today.</p>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<div
			class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="mb-1 text-sm font-medium text-gray-500">My Active Tasks{scopeLabel}</p>
					<h3 class="text-3xl font-bold text-brand-dark">{scopedTasks.length}</h3>
				</div>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600"
				>
					<CheckSquare class="h-6 w-6" />
				</div>
			</div>
			<div class="mt-4 flex items-center text-sm font-medium text-blue-600">
				<a href="/tasks" class="hover:underline">View all tasks &rarr;</a>
			</div>
		</div>

		<div
			class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="mb-1 text-sm font-medium text-gray-500">Polls Awaiting My Vote</p>
					<h3 class="text-3xl font-bold text-brand-dark">{needsMyVote.length}</h3>
				</div>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-gold-800"
				>
					<Vote class="h-6 w-6" />
				</div>
			</div>
			<div class="mt-4 flex items-center text-sm font-medium text-brand-gold-700">
				<a href="/voting" class="hover:underline">{openPolls.length} open in total &rarr;</a>
			</div>
		</div>

		<div
			class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="mb-1 text-sm font-medium text-gray-500">Due This Week</p>
					<h3 class="text-3xl font-bold text-brand-dark">{dueSoon.length}</h3>
				</div>
				<div
					class={`flex h-12 w-12 items-center justify-center rounded-full ${overdue.length ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}
				>
					<Clock class="h-6 w-6" />
				</div>
			</div>
			<div class="mt-4 flex items-center text-sm">
				{#if overdue.length}
					<span class="inline-flex items-center gap-1 font-medium text-red-600">
						<AlertTriangle class="h-4 w-4" />
						{overdue.length} overdue
					</span>
				{:else}
					<span class="text-gray-500">Nothing overdue</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
			<h2 class="border-b border-gray-100 px-6 py-4 font-semibold text-brand-dark">
				Next deadlines
			</h2>
			{#if loading}
				<p class="p-6 text-sm text-gray-500">Loading...</p>
			{:else if upcoming.length === 0}
				<p class="p-6 text-sm text-gray-500">No tasks due in the next seven days.</p>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each upcoming as task}
						{@const late = new Date(task.due_date) < startOfToday}
						<li>
							<a
								href={`/tasks/${task.id}`}
								class="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-brand-light-100/50"
							>
								<div>
									<p class="font-medium text-brand-dark">{task.title}</p>
									<p class="mt-0.5 text-xs text-gray-500">
										{task.expand?.department?.name || 'No department'}
									</p>
								</div>
								<span
									class={`text-xs whitespace-nowrap ${late ? 'font-medium text-red-600' : 'text-gray-500'}`}
								>
									{new Date(task.due_date).toLocaleDateString()}{late ? ' (overdue)' : ''}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
			<h2 class="border-b border-gray-100 px-6 py-4 font-semibold text-brand-dark">
				Waiting on your vote
			</h2>
			{#if loading}
				<p class="p-6 text-sm text-gray-500">Loading...</p>
			{:else if needsMyVote.length === 0}
				<p class="p-6 text-sm text-gray-500">You're all caught up.</p>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each needsMyVote.slice(0, 5) as poll}
						<li>
							<a
								href={`/voting/${poll.id}`}
								class="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-brand-light-100/50"
							>
								<p class="font-medium text-brand-dark">{poll.title}</p>
								<span class="text-xs font-medium whitespace-nowrap text-brand-gold-700"
									>Vote &rarr;</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>
