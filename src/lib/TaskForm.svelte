<script lang="ts">
	import { pb, pbError } from '$lib/pocketbase';
	import { Loader2, Save, Plus, Trash2 } from 'lucide-svelte';
	import { onMount, untrack } from 'svelte';

	// task = null -> create, otherwise edit that record.
	let {
		task = null,
		onsaved,
		oncancel
	}: { task?: any; onsaved: (r: any) => void; oncancel?: () => void } = $props();

	// Seed the fields once. The form owns its values from here; it is not a live
	// mirror of the record, so a snapshot is exactly what we want.
	const seed: any = untrack(() => $state.snapshot(task)) ?? {};

	let title = $state(seed.title ?? '');
	let description = $state(seed.description ?? '');
	let status = $state(seed.status ?? 'todo');
	let departmentId = $state(seed.department ?? '');
	let assigneeIds = $state<string[]>(seed.assignees ?? []);
	// PocketBase dates come back as "2026-08-23 10:00:00.000Z"; <input type="date"> wants just the day.
	let dueDate = $state(seed.due_date ? String(seed.due_date).slice(0, 10) : '');
	let subtasks = $state<{ title: string; is_done: boolean }[]>(
		seed.subtasks?.length ? seed.subtasks : [{ title: '', is_done: false }]
	);

	let loading = $state(false);
	let error = $state('');

	let departments = $state<any[]>([]);
	let users = $state<any[]>([]);

	onMount(async () => {
		try {
			departments = await pb.collection('departments').getFullList();
			users = await pb.collection('users').getFullList();
		} catch (e) {
			console.error('Error loading dropdown data:', e);
		}
	});

	function addSubtask() {
		subtasks = [...subtasks, { title: '', is_done: false }];
	}

	function removeSubtask(index: number) {
		subtasks = subtasks.filter((_, i) => i !== index);
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!title.trim()) {
			error = 'A task needs a title.';
			return;
		}
		loading = true;
		error = '';

		const data = {
			title,
			description,
			status,
			department: departmentId || null,
			assignees: assigneeIds,
			subtasks: subtasks.filter((s) => s.title.trim() !== ''),
			due_date: dueDate || null
		};

		try {
			const saved = task
				? await pb.collection('tasks').update(task.id, data)
				: await pb.collection('tasks').create({ ...data, created_by: pb.authStore.model?.id });
			onsaved(saved);
		} catch (e: any) {
			error = pbError(e);
		} finally {
			loading = false;
		}
	}
</script>

{#if error}
	<div class="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
		{error}
	</div>
{/if}

<form
	onsubmit={handleSubmit}
	class="space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8"
>
	<div>
		<label for="title" class="mb-2 block text-sm font-medium text-brand-dark-900">Task Title</label>
		<input
			id="title"
			type="text"
			bind:value={title}
			required
			class="block w-full rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
			placeholder="E.g., Design Q4 Marketing Assets"
		/>
	</div>

	<div>
		<label for="description" class="mb-2 block text-sm font-medium text-brand-dark-900"
			>Description</label
		>
		<textarea
			id="description"
			bind:value={description}
			rows="4"
			class="block w-full resize-y rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
			placeholder="Provide details about the task..."></textarea>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<div>
			<label for="department" class="mb-2 block text-sm font-medium text-brand-dark-900"
				>Department</label
			>
			<select
				id="department"
				bind:value={departmentId}
				class="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
			>
				<option value="">Select Department...</option>
				{#each departments as dept}
					<option value={dept.id}>{dept.name}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="assignees" class="mb-2 block text-sm font-medium text-brand-dark-900"
				>Assignees</label
			>
			<select
				id="assignees"
				multiple
				bind:value={assigneeIds}
				class="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
			>
				{#each users as u}
					<option value={u.id}>{u.name}</option>
				{/each}
			</select>
			<p class="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
		</div>

		<div>
			<label for="status" class="mb-2 block text-sm font-medium text-brand-dark-900">Status</label>
			<select
				id="status"
				bind:value={status}
				class="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
			>
				<option value="todo">To Do</option>
				<option value="in_progress">In Progress</option>
				<option value="done">Completed</option>
			</select>
		</div>

		<div>
			<label for="dueDate" class="mb-2 block text-sm font-medium text-brand-dark-900"
				>Due Date</label
			>
			<input
				id="dueDate"
				type="date"
				bind:value={dueDate}
				class="block w-full rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
			/>
		</div>
	</div>

	<div class="border-t border-gray-100 pt-4">
		<span class="mb-4 block text-sm font-medium text-brand-dark-900">Subtasks (Optional)</span>
		<div class="space-y-3">
			{#each subtasks as subtask, i}
				<div class="flex items-center gap-3">
					<input
						type="checkbox"
						bind:checked={subtask.is_done}
						aria-label={`Mark subtask ${i + 1} done`}
						class="h-5 w-5 shrink-0 rounded border-gray-300 text-brand-gold-700 focus:ring-brand-gold-700"
					/>
					<input
						type="text"
						bind:value={subtask.title}
						class="block w-full rounded-lg border border-gray-200 px-4 py-2 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
						placeholder={`Subtask ${i + 1}`}
					/>
					<button
						type="button"
						onclick={() => removeSubtask(i)}
						aria-label={`Remove subtask ${i + 1}`}
						class="rounded-lg border border-transparent p-2 text-gray-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500"
					>
						<Trash2 class="h-5 w-5" />
					</button>
				</div>
			{/each}
		</div>

		<button
			type="button"
			onclick={addSubtask}
			class="mt-4 flex items-center gap-2 text-sm font-medium text-brand-gold-700 transition-colors hover:text-brand-gold-800"
		>
			<Plus class="h-4 w-4" />
			Add subtask
		</button>
	</div>

	<div class="flex justify-end gap-4 border-t border-gray-100 pt-6">
		{#if oncancel}
			<button
				type="button"
				onclick={oncancel}
				class="rounded-lg border border-gray-200 px-6 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50"
			>
				Cancel
			</button>
		{:else}
			<a
				href="/tasks"
				class="rounded-lg border border-gray-200 px-6 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50"
			>
				Cancel
			</a>
		{/if}
		<button
			type="submit"
			disabled={loading}
			class="inline-flex items-center justify-center rounded-lg border border-transparent bg-brand-gold-700 px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-brand-gold-800 focus:ring-2 focus:ring-brand-gold-700 focus:ring-offset-2 focus:outline-none disabled:opacity-70"
		>
			{#if loading}
				<Loader2 class="mr-2 h-5 w-5 animate-spin" />
				Saving...
			{:else}
				<Save class="mr-2 h-5 w-5" />
				{task ? 'Save Changes' : 'Create Task'}
			{/if}
		</button>
	</div>
</form>
