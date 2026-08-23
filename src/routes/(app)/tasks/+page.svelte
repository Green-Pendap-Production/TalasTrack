<script lang="ts">
	import { pb, pbError } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { timelineRange, spanPercent, ticks } from '$lib/timeline';
	import {
		Plus,
		Search,
		Clock,
		CheckCircle2,
		Circle,
		LayoutGrid,
		List,
		CalendarRange,
		AlertTriangle
	} from 'lucide-svelte';

	const COLUMNS = [
		{ id: 'todo', label: 'To Do' },
		{ id: 'in_progress', label: 'In Progress' },
		{ id: 'done', label: 'Completed' }
	];

	let tasks = $state<any[]>([]);
	let departments = $state<any[]>([]);
	let departmentFilter = $state('all');
	let loading = $state(true);
	let error = $state('');
	let searchQuery = $state('');
	let statusFilter = $state('all');
	let mineOnly = $state(false);
	let view = $state<'list' | 'board' | 'timeline'>('list');
	let draggingId = $state('');

	let user = pb.authStore.model;

	onMount(fetchTasks);

	async function fetchTasks() {
		loading = true;
		try {
			tasks = await pb
				.collection('tasks')
				.getFullList({ sort: '-created', expand: 'assignees,department' });
			departments = await pb.collection('departments').getFullList({ sort: 'name' });
		} catch (e: any) {
			// A refused request is not an empty list - say which one it was.
			error =
				e?.status === 403
					? 'Not allowed to read tasks. Check the tasks API rules in PocketBase.'
					: e.message;
		} finally {
			loading = false;
		}
	}

	let filteredTasks = $derived(
		tasks.filter((task) => {
			const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
			const matchesMine = !mineOnly || (task.assignees ?? []).includes(user?.id);
			const matchesDept =
				departmentFilter === 'all' ||
				(departmentFilter === 'none' ? !task.department : task.department === departmentFilter);
			return matchesSearch && matchesStatus && matchesMine && matchesDept;
		})
	);

	// Counts ignore the department filter itself, so every row keeps its own total.
	let scoped = $derived(
		tasks.filter((task) => {
			const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
			const matchesMine = !mineOnly || (task.assignees ?? []).includes(user?.id);
			return matchesSearch && matchesStatus && matchesMine;
		})
	);
	let deptCounts = $derived({
		all: scoped.length,
		none: scoped.filter((t) => !t.department).length,
		...Object.fromEntries(
			departments.map((d) => [d.id, scoped.filter((t) => t.department === d.id).length])
		)
	} as Record<string, number>);

	let range = $derived(timelineRange(filteredTasks));
	let todayPct = $derived(
		((Date.now() - range.start) / Math.max(range.end - range.start, 1)) * 100
	);
	// A task with no due date is shown running from creation to today.
	let bars = $derived(
		filteredTasks
			.map((task) => ({
				task,
				...spanPercent(task.created, task.due_date || Date.now(), range)
			}))
			.filter((b) => b.visible)
	);

	function isOverdue(task: any) {
		return (
			!!task.due_date &&
			task.status !== 'done' &&
			new Date(task.due_date) < new Date(new Date().toDateString())
		);
	}

	// Drag a card to another column to change its status. HTML5 DnD, no library.
	// ponytail: no manual ordering inside a column - add a `position` field if the team asks for it.
	async function drop(status: string) {
		const task = tasks.find((t) => t.id === draggingId);
		draggingId = '';
		if (!task || task.status === status) return;

		const previous = task.status;
		task.status = status;
		try {
			await pb.collection('tasks').update(task.id, { status });
		} catch (e: any) {
			task.status = previous; // snap the card back if the save failed
			error = pbError(e);
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'done':
				return CheckCircle2;
			case 'in_progress':
				return Clock;
			default:
				return Circle;
		}
	}

	// Ink only - the row icon sits on the row, not in a coloured chip.
	function getStatusInk(status: string) {
		switch (status) {
			case 'done':
				return 'text-green-600';
			case 'in_progress':
				return 'text-brand-gold-700';
			default:
				return 'text-gray-400';
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'done':
				return 'text-green-500 bg-green-50';
			case 'in_progress':
				return 'text-brand-gold-800 bg-brand-light';
			default:
				return 'text-gray-400 bg-gray-50';
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'done':
				return 'Completed';
			case 'in_progress':
				return 'In Progress';
			default:
				return 'To Do';
		}
	}
</script>

<svelte:head>
	<title>Tasks | TalasTrack</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-2xl font-bold text-brand-dark">Tasks</h1>
			<p class="mt-0.5 text-sm text-gray-500">Manage and track departmental tasks.</p>
		</div>
		<div class="flex items-center gap-3">
			<div class="inline-flex rounded-lg border border-gray-200 bg-white p-1">
				<button
					onclick={() => (view = 'list')}
					aria-label="List view"
					class={`rounded-md px-3 py-1.5 transition-colors ${view === 'list' ? 'bg-brand-dark text-white' : 'text-gray-500 hover:bg-gray-50'}`}
				>
					<List class="h-4 w-4" />
				</button>
				<button
					onclick={() => (view = 'board')}
					aria-label="Board view"
					class={`rounded-md px-3 py-1.5 transition-colors ${view === 'board' ? 'bg-brand-dark text-white' : 'text-gray-500 hover:bg-gray-50'}`}
				>
					<LayoutGrid class="h-4 w-4" />
				</button>
				<button
					onclick={() => (view = 'timeline')}
					aria-label="Timeline view"
					class={`rounded-md px-3 py-1.5 transition-colors ${view === 'timeline' ? 'bg-brand-dark text-white' : 'text-gray-500 hover:bg-gray-50'}`}
				>
					<CalendarRange class="h-4 w-4" />
				</button>
			</div>
			<a
				href="/tasks/new"
				class="inline-flex items-center gap-2 rounded-lg bg-brand-dark px-4 py-2 text-white shadow-sm transition-colors hover:bg-brand-dark-900"
			>
				<Plus class="h-4 w-4" />
				New Task
			</a>
		</div>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
	{/if}

	<div class="flex flex-col items-start gap-6 md:flex-row">
		<!-- Department picker. Same markup both ways: a scrolling row on phones,
         a sidebar from md up. -->
		<aside class="w-full shrink-0 rounded-xl border border-gray-100 bg-white p-2 shadow-sm md:w-56">
			<p
				class="hidden px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase md:block"
			>
				Departments
			</p>
			<div class="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
				{#each [{ id: 'all', name: 'All departments' }, ...departments, { id: 'none', name: 'No department' }] as dept}
					<button
						onclick={() => (departmentFilter = dept.id)}
						class={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors md:w-full ${
							departmentFilter === dept.id
								? 'bg-brand-light-100 font-medium text-brand-dark'
								: 'text-gray-600 hover:bg-gray-50'
						}`}
					>
						<span class="truncate">{dept.name}</span>
						<span class="shrink-0 text-xs text-gray-400">{deptCounts[dept.id] ?? 0}</span>
					</button>
				{/each}
			</div>
		</aside>

		<div class="min-w-0 flex-1 space-y-6">
			<div
				class="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-2 shadow-sm sm:flex-row sm:items-center"
			>
				<div class="relative flex-1">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<Search class="h-4 w-4 text-gray-400" />
					</div>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search tasks..."
						class="h-10 w-full rounded-lg border border-transparent bg-transparent pr-3 pl-10 text-sm transition-colors placeholder:text-gray-400 hover:border-gray-200 focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
					/>
				</div>

				<label
					class={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm whitespace-nowrap transition-colors ${
						mineOnly
							? 'border-brand-gold-700 bg-brand-light-100 font-medium text-brand-dark'
							: 'border-gray-200 text-gray-600 hover:bg-gray-50'
					}`}
				>
					<input
						type="checkbox"
						bind:checked={mineOnly}
						class="h-4 w-4 rounded border-gray-300 text-brand-gold-700 focus:ring-brand-gold-700"
					/>
					Assigned to me
				</label>

				{#if view !== 'board'}
					<select
						bind:value={statusFilter}
						aria-label="Filter by status"
						class="h-10 rounded-lg border border-gray-200 bg-white pr-8 pl-3 text-sm text-gray-600 focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
					>
						<option value="all">All status</option>
						<option value="todo">To Do</option>
						<option value="in_progress">In Progress</option>
						<option value="done">Completed</option>
					</select>
				{/if}
			</div>

			{#if loading}
				<div
					class="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500 shadow-sm"
				>
					Loading tasks...
				</div>
			{:else if view === 'timeline'}
				<div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
					{#if bars.length === 0}
						<p class="p-8 text-center text-gray-500">No tasks to place on the timeline.</p>
					{:else}
						<!-- Axis. Ticks are evenly spaced across the window, not per-day, so
						     the header stays readable whatever the range turns out to be. -->
						<div class="flex border-b border-gray-100 bg-gray-50/60 text-xs text-gray-500">
							<div class="w-44 shrink-0 px-4 py-2 font-medium">Task</div>
							<div class="relative flex-1 py-2">
								{#each ticks(range) as tick}
									<span
										class="absolute -translate-x-1/2 whitespace-nowrap"
										style={`left:${tick.pct}%`}
									>
										{tick.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
									</span>
								{/each}
							</div>
							<div class="w-4 shrink-0"></div>
						</div>

						<ul class="divide-y divide-gray-50">
							{#each bars as bar (bar.task.id)}
								<li>
									<a
										href={`/tasks/${bar.task.id}`}
										class="flex items-center transition-colors hover:bg-brand-light-100/60"
									>
										<div class="w-44 shrink-0 px-4 py-3">
											<p class="truncate text-sm font-medium text-brand-dark">{bar.task.title}</p>
											<p class="truncate text-xs text-gray-500">
												{bar.task.expand?.department?.name || 'No department'}
											</p>
										</div>

										<div class="relative flex-1 py-3">
											{#each ticks(range) as tick}
												<span
													class="absolute inset-y-0 w-px bg-gray-100"
													style={`left:${tick.pct}%`}
												></span>
											{/each}
											{#if todayPct >= 0 && todayPct <= 100}
												<span
													class="absolute inset-y-0 w-px bg-red-400/70"
													style={`left:${todayPct}%`}
												></span>
											{/if}
											<div
												title={`${bar.task.title} - due ${bar.task.due_date ? new Date(bar.task.due_date).toLocaleDateString() : 'not set'}`}
												class={`relative h-5 rounded-full ${
													bar.task.status === 'done'
														? 'bg-green-500/80'
														: isOverdue(bar.task)
															? 'bg-red-500/80'
															: bar.task.status === 'in_progress'
																? 'bg-brand-gold'
																: 'bg-brand-dark/40'
												}`}
												style={`margin-left:${bar.left}%;width:${bar.width}%`}
											></div>
										</div>
										<div class="w-4 shrink-0"></div>
									</a>
								</li>
							{/each}
						</ul>

						<div
							class="flex flex-wrap items-center gap-4 border-t border-gray-100 px-4 py-3 text-xs text-gray-500"
						>
							<span class="inline-flex items-center gap-1.5">
								<span class="h-2.5 w-2.5 rounded-full bg-brand-dark/40"></span> To do
							</span>
							<span class="inline-flex items-center gap-1.5">
								<span class="h-2.5 w-2.5 rounded-full bg-brand-gold"></span> In progress
							</span>
							<span class="inline-flex items-center gap-1.5">
								<span class="h-2.5 w-2.5 rounded-full bg-green-500/80"></span> Done
							</span>
							<span class="inline-flex items-center gap-1.5">
								<span class="h-2.5 w-2.5 rounded-full bg-red-500/80"></span> Overdue
							</span>
							<span class="inline-flex items-center gap-1.5">
								<span class="h-3 w-px bg-red-400/70"></span> Today
							</span>
						</div>
					{/if}
				</div>
			{:else if view === 'board'}
				<div class="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
					{#each COLUMNS as col}
						{@const items = filteredTasks.filter((t) => t.status === col.id)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							ondragover={(e) => e.preventDefault()}
							ondrop={() => drop(col.id)}
							class="min-h-40 rounded-xl border border-gray-100 bg-gray-50/70 p-3"
						>
							<div class="mb-2 flex items-center justify-between px-2 py-2">
								<h3 class="font-semibold text-brand-dark">{col.label}</h3>
								<span
									class="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-500"
								>
									{items.length}
								</span>
							</div>

							<div class="space-y-3">
								{#each items as task (task.id)}
									<a
										href={`/tasks/${task.id}`}
										draggable="true"
										ondragstart={() => (draggingId = task.id)}
										ondragend={() => (draggingId = '')}
										class={`block cursor-grab rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${draggingId === task.id ? 'opacity-40' : ''}`}
									>
										<p class="mb-2 font-medium text-brand-dark">{task.title}</p>
										<div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
											{#if task.expand?.department?.name}
												<span class="rounded bg-gray-100 px-2 py-0.5 text-gray-800"
													>{task.expand.department.name}</span
												>
											{/if}
											{#if task.due_date}
												<span
													class={`inline-flex items-center gap-1 ${isOverdue(task) ? 'font-medium text-red-600' : ''}`}
												>
													{#if isOverdue(task)}<AlertTriangle class="h-3 w-3" />{/if}
													{new Date(task.due_date).toLocaleDateString()}
												</span>
											{/if}
										</div>
										{#if task.expand?.assignees?.length}
											<div class="mt-3 flex -space-x-2">
												{#each task.expand.assignees.slice(0, 4) as a}
													<span
														title={a.name}
														class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-dark text-xs font-bold text-brand-gold-700"
													>
														{a.name?.charAt(0) || '?'}
													</span>
												{/each}
											</div>
										{/if}
									</a>
								{/each}

								{#if items.length === 0}
									<p class="py-6 text-center text-xs text-gray-400">Drop a task here</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
					{#if filteredTasks.length === 0}
						<div class="p-8 text-center text-gray-500">No tasks found.</div>
					{:else}
						<ul class="divide-y divide-gray-100">
							{#each filteredTasks as task}
								{@const StatusIcon = getStatusIcon(task.status)}
								<li>
									<a
										href={`/tasks/${task.id}`}
										class="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-light-100/60"
									>
										<StatusIcon class={`h-[18px] w-[18px] shrink-0 ${getStatusInk(task.status)}`} />

										<div class="min-w-0 flex-1">
											<p class="truncate text-[15px] font-semibold text-brand-dark">{task.title}</p>
											<div class="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-gray-500">
												{#if task.expand?.department?.name}
													<span
														class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600"
													>
														{task.expand.department.name}
													</span>
												{/if}
												<span class="truncate">
													{task.expand?.assignees?.length
														? task.expand.assignees.map((a: any) => a.name).join(', ')
														: 'Unassigned'}
												</span>
											</div>
										</div>

										<!-- Due date and status share one baseline instead of stacking
										     ragged against the right edge. -->
										{#if task.due_date}
											<span
												class={`hidden shrink-0 text-xs sm:block ${isOverdue(task) ? 'font-medium text-red-600' : 'text-gray-500'}`}
											>
												{new Date(task.due_date).toLocaleDateString()}
											</span>
										{/if}
										<span
											class={`w-24 shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-medium ${getStatusColor(task.status)}`}
										>
											{getStatusLabel(task.status)}
										</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
