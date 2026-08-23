<script lang="ts">
	import { page } from '$app/stores';
	import { pb, pbError } from '$lib/pocketbase';
	import TaskForm from '$lib/TaskForm.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		ArrowLeft,
		Clock,
		User,
		Building,
		CheckCircle2,
		Circle,
		Pencil,
		Trash2
	} from 'lucide-svelte';

	let taskId = $page.params.id!;
	let task = $state<any>(null);
	let loading = $state(true);
	let editing = $state(false);
	let error = $state('');

	let done = $derived(task?.subtasks?.filter((s: any) => s.is_done).length ?? 0);
	let overdue = $derived(
		!!task?.due_date &&
			task.status !== 'done' &&
			new Date(task.due_date) < new Date(new Date().toDateString())
	);

	onMount(load);

	async function load() {
		try {
			task = await pb
				.collection('tasks')
				.getOne(taskId, { expand: 'assignees,department,created_by' });
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function updateStatus(newStatus: string) {
		if (!task) return;
		const previous = task.status;
		task.status = newStatus;
		try {
			await pb.collection('tasks').update(taskId, { status: newStatus });
		} catch (e: any) {
			task.status = previous; // put the UI back rather than lie about a save that failed
			error = pbError(e);
		}
	}

	async function toggleSubtask(index: number) {
		if (!task) return;
		task.subtasks[index].is_done = !task.subtasks[index].is_done;
		try {
			await pb.collection('tasks').update(taskId, { subtasks: task.subtasks });
		} catch (e: any) {
			task.subtasks[index].is_done = !task.subtasks[index].is_done;
			error = pbError(e);
		}
	}

	async function remove() {
		if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
		try {
			await pb.collection('tasks').delete(taskId);
			goto('/tasks');
		} catch (e: any) {
			error = pbError(e);
		}
	}
</script>

<svelte:head>
	<title>{task?.title || 'Task Details'} | TalasTrack</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<div class="flex items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<a
				href="/tasks"
				class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
				aria-label="Back to tasks"
			>
				<ArrowLeft class="h-5 w-5" />
			</a>
			<h1 class="text-2xl font-bold text-brand-dark">Task Details</h1>
		</div>

		{#if task && !editing}
			<div class="flex items-center gap-2">
				<button
					onclick={() => (editing = true)}
					class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
				>
					<Pencil class="h-4 w-4" /> Edit
				</button>
				<button
					onclick={remove}
					class="inline-flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
				>
					<Trash2 class="h-4 w-4" /> Delete
				</button>
			</div>
		{/if}
	</div>

	{#if error}
		<div class="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
	{/if}

	{#if loading}
		<div
			class="rounded-xl border border-gray-100 bg-white p-12 text-center text-gray-500 shadow-sm"
		>
			Loading task information...
		</div>
	{:else if task && editing}
		<TaskForm
			{task}
			oncancel={() => (editing = false)}
			onsaved={async () => {
				editing = false;
				await load();
			}}
		/>
	{:else if task}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			<!-- Main Content -->
			<div class="space-y-6 md:col-span-2">
				<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
					<div class="mb-6 flex items-start justify-between gap-4">
						<h1 class="text-3xl font-bold text-brand-dark">{task.title}</h1>
						<span
							class={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
              ${
								task.status === 'done'
									? 'bg-green-100 text-green-800'
									: task.status === 'in_progress'
										? 'bg-brand-light text-brand-gold-800'
										: 'bg-gray-100 text-gray-800'
							}`}
						>
							{task.status === 'done'
								? 'Completed'
								: task.status === 'in_progress'
									? 'In Progress'
									: 'To Do'}
						</span>
					</div>

					<div class="prose max-w-none text-gray-700">
						<p>{task.description || 'No description provided.'}</p>
					</div>

					{#if task.subtasks && task.subtasks.length > 0}
						<div class="mt-8 border-t border-gray-100 pt-6">
							<div class="mb-4 flex items-center justify-between">
								<h3 class="text-lg font-semibold text-brand-dark">Subtasks</h3>
								<span class="text-sm text-gray-500">{done} of {task.subtasks.length} done</span>
							</div>
							<div class="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
								<div
									class="h-full rounded-full bg-brand-gold-700 transition-all duration-300"
									style={`width: ${Math.round((done / task.subtasks.length) * 100)}%`}
								></div>
							</div>
							<div class="space-y-3">
								{#each task.subtasks as subtask, i}
									<button
										onclick={() => toggleSubtask(i)}
										class="flex w-full items-center gap-3 rounded-lg border border-gray-100 p-3 text-left transition-colors hover:border-brand-gold/30 hover:bg-gray-50"
									>
										<div
											class={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${subtask.is_done ? 'border-brand-gold bg-brand-gold-700 text-white' : 'border-gray-300'}`}
										>
											{#if subtask.is_done}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="14"
													height="14"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="3"
													stroke-linecap="round"
													stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg
												>
											{/if}
										</div>
										<span
											class={`font-medium ${subtask.is_done ? 'text-gray-400 line-through' : 'text-brand-dark'}`}
										>
											{subtask.title}
										</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Status Updates / Actions -->
				<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-semibold text-brand-dark">Update Status</h3>
					<div class="flex gap-4">
						<button
							onclick={() => updateStatus('todo')}
							class={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-all ${task.status === 'todo' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}
						>
							<Circle class="h-5 w-5 text-gray-400" />
							To Do
						</button>
						<button
							onclick={() => updateStatus('in_progress')}
							class={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-all ${task.status === 'in_progress' ? 'border-brand-gold bg-brand-light-100' : 'border-gray-200 hover:bg-gray-50'}`}
						>
							<Clock class="h-5 w-5 text-brand-gold-700" />
							In Progress
						</button>
						<button
							onclick={() => updateStatus('done')}
							class={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-all ${task.status === 'done' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}
						>
							<CheckCircle2 class="h-5 w-5 text-green-500" />
							Done
						</button>
					</div>
				</div>
			</div>

			<!-- Sidebar Info -->
			<div class="space-y-6">
				<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-sm font-semibold tracking-wider text-gray-500 uppercase">Details</h3>

					<ul class="space-y-4">
						<li class="flex items-start gap-3">
							<User class="mt-0.5 h-5 w-5 text-gray-400" />
							<div>
								<p class="text-sm font-medium text-gray-500">Assignees</p>
								<div class="mt-1 flex flex-wrap gap-2">
									{#if task.expand?.assignees && task.expand.assignees.length > 0}
										{#each task.expand.assignees as assignee}
											<span
												class="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
											>
												{assignee.name}
											</span>
										{/each}
									{:else}
										<p class="font-medium text-brand-dark">Unassigned</p>
									{/if}
								</div>
							</div>
						</li>

						<li class="flex items-start gap-3">
							<Building class="mt-0.5 h-5 w-5 text-gray-400" />
							<div>
								<p class="text-sm font-medium text-gray-500">Department</p>
								<p class="font-medium text-brand-dark">{task.expand?.department?.name || 'None'}</p>
							</div>
						</li>

						<li class="flex items-start gap-3">
							<Clock class={`mt-0.5 h-5 w-5 ${overdue ? 'text-red-500' : 'text-gray-400'}`} />
							<div>
								<p class="text-sm font-medium text-gray-500">Due Date</p>
								<p class={`font-medium ${overdue ? 'text-red-600' : 'text-brand-dark'}`}>
									{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
									{overdue ? ' (overdue)' : ''}
								</p>
							</div>
						</li>
					</ul>
				</div>

				<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
					<p class="text-center text-xs text-gray-500">
						Created by {task.expand?.created_by?.name || 'Unknown'} on {new Date(
							task.created
						).toLocaleDateString()}
					</p>
				</div>
			</div>
		</div>
	{:else}
		<div class="rounded-xl border border-gray-100 bg-white p-12 text-center text-red-500 shadow-sm">
			Task not found.
		</div>
	{/if}
</div>
