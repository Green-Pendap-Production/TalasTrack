<script lang="ts">
	import { pb, pbError } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { CheckCircle2, Clock, AlertTriangle, ListChecks } from 'lucide-svelte';

	let tasks = $state<any[]>([]);
	let users = $state<any[]>([]);
	let departments = $state<any[]>([]);
	let polls = $state<any[]>([]);
	let votes = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');

	let user = pb.authStore.model;
	let isDirector = $derived(user?.role === 'director');

	const startOfToday = new Date(new Date().toDateString());
	const isOverdue = (t: any) =>
		t.due_date && t.status !== 'done' && new Date(t.due_date) < startOfToday;
	const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

	let done = $derived(tasks.filter((t) => t.status === 'done'));
	let inProgress = $derived(tasks.filter((t) => t.status === 'in_progress'));
	let overdue = $derived(tasks.filter(isOverdue));

	// Completion by department, busiest first.
	let byDepartment = $derived(
		[...departments, { id: '', name: 'No department' }]
			.map((d) => {
				const owned = tasks.filter((t) => (t.department || '') === d.id);
				return {
					name: d.name,
					total: owned.length,
					done: owned.filter((t) => t.status === 'done').length,
					overdue: owned.filter(isOverdue).length
				};
			})
			.filter((d) => d.total > 0)
			.sort((a, b) => b.total - a.total)
	);

	// Workload per member. Counts and an overdue flag - no score, no ranking.
	let byMember = $derived(
		users
			.map((u) => {
				const assigned = tasks.filter((t) => (t.assignees ?? []).includes(u.id));
				return {
					name: u.name || u.email,
					total: assigned.length,
					done: assigned.filter((t) => t.status === 'done').length,
					open: assigned.filter((t) => t.status !== 'done').length,
					overdue: assigned.filter(isOverdue).length
				};
			})
			.filter((m) => m.total > 0)
			.sort((a, b) => b.open - a.open || b.total - a.total)
	);

	// Turnout per poll, against everyone who could have voted.
	let byPoll = $derived(
		polls
			.map((p) => {
				const cast = votes.filter((v) => v.poll === p.id).length;
				return { title: p.title, open: p.is_open, cast, of: users.length };
			})
			.sort((a, b) => Number(b.open) - Number(a.open))
	);

	onMount(async () => {
		try {
			tasks = await pb
				.collection('tasks')
				.getFullList({ fields: 'id,status,due_date,department,assignees' });
			departments = await pb.collection('departments').getFullList({ sort: 'name' });
			users = await pb.collection('users').getFullList();
			polls = await pb.collection('polls').getFullList({ sort: '-created' });
			try {
				votes = await pb.collection('votes').getFullList({ fields: 'id,poll,user' });
			} catch {
				votes = []; // votes not readable: turnout section stays empty
			}
		} catch (e: any) {
			error = pbError(e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Performance | TalasTrack</title>
</svelte:head>

{#snippet meter(label: string, value: number, total: number, note: string, tone = 'bg-brand-gold')}
	<div>
		<div class="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
			<span class="min-w-0 truncate font-medium text-brand-dark">{label}</span>
			<span class="shrink-0 text-xs text-gray-500">{note}</span>
		</div>
		<div class="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
			<div
				class={`h-full rounded-full transition-all duration-500 ${tone}`}
				style={`width:${pct(value, total)}%`}
			></div>
		</div>
	</div>
{/snippet}

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-brand-dark">Performance</h1>
		<p class="mt-0.5 text-sm text-gray-500">How work and voting are tracking across the company.</p>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
	{/if}

	{#if !isDirector}
		<div class="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500 shadow-sm">
			Only directors can see company performance.
		</div>
	{:else if loading}
		<div class="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500 shadow-sm">
			Loading figures...
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			{#each [{ label: 'All tasks', value: tasks.length, note: 'tracked', icon: ListChecks, tone: 'bg-gray-50 text-gray-500' }, { label: 'Completed', value: done.length, note: `${pct(done.length, tasks.length)}% of all tasks`, icon: CheckCircle2, tone: 'bg-green-50 text-green-600' }, { label: 'In progress', value: inProgress.length, note: `${pct(inProgress.length, tasks.length)}% of all tasks`, icon: Clock, tone: 'bg-brand-light text-brand-gold-800' }, { label: 'Overdue', value: overdue.length, note: overdue.length ? 'needs attention' : 'all on schedule', icon: AlertTriangle, tone: overdue.length ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400' }] as tile}
				<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
					<div class="flex items-start justify-between gap-2">
						<p class="text-sm font-medium text-gray-500">{tile.label}</p>
						<div
							class={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tile.tone}`}
						>
							<tile.icon class="h-[18px] w-[18px]" />
						</div>
					</div>
					<p class="mt-2 text-3xl font-bold text-brand-dark">{tile.value}</p>
					<p class="mt-1 text-xs text-gray-500">{tile.note}</p>
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<div class="rounded-2xl border border-gray-100 bg-white shadow-sm">
				<h2 class="border-b border-gray-100 px-5 py-4 font-semibold text-brand-dark">
					Completion by department
				</h2>
				<div class="space-y-4 p-5">
					{#if byDepartment.length === 0}
						<p class="text-sm text-gray-500">No tasks assigned to a department yet.</p>
					{:else}
						{#each byDepartment as d}
							{@render meter(
								d.name,
								d.done,
								d.total,
								`${d.done}/${d.total} done${d.overdue ? ` · ${d.overdue} overdue` : ''}`,
								d.overdue ? 'bg-red-400' : 'bg-brand-gold'
							)}
						{/each}
					{/if}
				</div>
			</div>

			<div class="rounded-2xl border border-gray-100 bg-white shadow-sm">
				<h2 class="border-b border-gray-100 px-5 py-4 font-semibold text-brand-dark">
					Voting turnout
				</h2>
				<div class="space-y-4 p-5">
					{#if byPoll.length === 0}
						<p class="text-sm text-gray-500">No polls yet.</p>
					{:else}
						{#each byPoll.slice(0, 8) as p}
							{@render meter(
								p.title,
								p.cast,
								p.of,
								`${p.cast}/${p.of} voted${p.open ? '' : ' · closed'}`,
								p.open ? 'bg-brand-gold' : 'bg-brand-dark/40'
							)}
						{/each}
					{/if}
				</div>
			</div>
		</div>

		<div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
			<h2 class="border-b border-gray-100 px-5 py-4 font-semibold text-brand-dark">
				Workload by member
			</h2>
			{#if byMember.length === 0}
				<p class="p-5 text-sm text-gray-500">No tasks are assigned to anyone yet.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="bg-gray-50/60 text-xs tracking-wider text-gray-500 uppercase">
							<tr>
								<th class="px-5 py-3 text-left font-medium">Member</th>
								<th class="px-5 py-3 text-right font-medium">Assigned</th>
								<th class="px-5 py-3 text-right font-medium">Open</th>
								<th class="px-5 py-3 text-right font-medium">Done</th>
								<th class="px-5 py-3 text-right font-medium">Overdue</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-50">
							{#each byMember as m}
								<tr class="hover:bg-brand-light-100/60">
									<td class="px-5 py-3 font-medium text-brand-dark">{m.name}</td>
									<td class="px-5 py-3 text-right text-gray-600">{m.total}</td>
									<td class="px-5 py-3 text-right text-gray-600">{m.open}</td>
									<td class="px-5 py-3 text-right text-gray-600">{m.done}</td>
									<td
										class={`px-5 py-3 text-right ${m.overdue ? 'font-medium text-red-600' : 'text-gray-400'}`}
									>
										{m.overdue}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<p class="text-xs text-gray-400">
			Counts are live from tasks, polls and votes. Cycle time and on-time completion are not shown:
			nothing records when a task was completed, only when it was last edited.
		</p>
	{/if}
</div>
