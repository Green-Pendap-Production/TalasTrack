<script lang="ts">
	import { pb, pbError } from '$lib/pocketbase';
	import { Loader2, Save, Plus, Trash2, Check, Circle, Clock, CheckCircle2 } from 'lucide-svelte';
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

	const STATUSES = [
		{ id: 'todo', label: 'To Do', icon: Circle },
		{ id: 'in_progress', label: 'In Progress', icon: Clock },
		{ id: 'done', label: 'Completed', icon: CheckCircle2 }
	];

	const FIELD =
		'h-11 w-full rounded-lg border border-gray-200 px-3 text-sm transition-colors focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none';

	onMount(async () => {
		try {
			departments = await pb.collection('departments').getFullList({ sort: 'name' });
			users = await pb.collection('users').getFullList({ sort: 'name' });
		} catch (e) {
			console.error('Error loading dropdown data:', e);
		}
	});

	function toggleAssignee(id: string) {
		assigneeIds = assigneeIds.includes(id)
			? assigneeIds.filter((x) => x !== id)
			: [...assigneeIds, id];
	}

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

<form onsubmit={handleSubmit} class="space-y-4">
	<!-- What the task is -->
	<section class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
		<div class="space-y-4">
			<div>
				<label for="title" class="mb-1.5 block text-sm font-medium text-brand-dark-900">Title</label
				>
				<input
					id="title"
					type="text"
					bind:value={title}
					required
					placeholder="E.g., Design Q4 marketing assets"
					class="{FIELD} text-[15px] font-medium"
				/>
			</div>

			<div>
				<label for="description" class="mb-1.5 block text-sm font-medium text-brand-dark-900">
					Description
				</label>
				<textarea
					id="description"
					bind:value={description}
					rows="4"
					placeholder="Anything the assignees need to know."
					class="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
				></textarea>
			</div>
		</div>
	</section>

	<!-- Where it sits and when it is due -->
	<section class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">Scheduling</h2>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<label for="department" class="mb-1.5 block text-sm font-medium text-brand-dark-900">
					Department
				</label>
				<select id="department" bind:value={departmentId} class="{FIELD} bg-white">
					<option value="">No department</option>
					{#each departments as dept}
						<option value={dept.id}>{dept.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="dueDate" class="mb-1.5 block text-sm font-medium text-brand-dark-900">
					Due date
				</label>
				<input id="dueDate" type="date" bind:value={dueDate} class={FIELD} />
			</div>
		</div>

		<div class="mt-4">
			<span class="mb-1.5 block text-sm font-medium text-brand-dark-900">Status</span>
			<!-- Three options: a segmented control reads faster than a dropdown. -->
			<div class="inline-flex flex-wrap gap-1 rounded-lg border border-gray-200 p-1">
				{#each STATUSES as s}
					<button
						type="button"
						onclick={() => (status = s.id)}
						aria-pressed={status === s.id}
						class={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
							status === s.id
								? 'bg-brand-dark font-medium text-white'
								: 'text-gray-600 hover:bg-gray-50'
						}`}
					>
						<s.icon class="h-4 w-4" />
						{s.label}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- Who is doing it -->
	<section class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
		<div class="mb-4 flex items-baseline justify-between gap-3">
			<h2 class="text-xs font-semibold tracking-wider text-gray-400 uppercase">Assignees</h2>
			<span class="text-xs text-gray-400">
				{assigneeIds.length ? `${assigneeIds.length} selected` : 'Nobody assigned'}
			</span>
		</div>

		{#if users.length === 0}
			<p class="text-sm text-gray-500">No members to assign yet.</p>
		{:else}
			<!-- Toggle chips. A native multi-select needs ctrl-click, which nobody
			     discovers and which is unusable on a phone. -->
			<div class="flex flex-wrap gap-2">
				{#each users as u (u.id)}
					{@const picked = assigneeIds.includes(u.id)}
					<button
						type="button"
						onclick={() => toggleAssignee(u.id)}
						aria-pressed={picked}
						class={`inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm transition-colors ${
							picked
								? 'border-brand-gold-700 bg-brand-light-100 font-medium text-brand-dark'
								: 'border-gray-200 text-gray-600 hover:bg-gray-50'
						}`}
					>
						<span
							class={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
								picked ? 'bg-brand-gold-700 text-white' : 'bg-gray-100 text-gray-500'
							}`}
						>
							{#if picked}
								<Check class="h-3.5 w-3.5" />
							{:else}
								{(u.name || u.email || '?').charAt(0).toUpperCase()}
							{/if}
						</span>
						{u.name || u.email}
					</button>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Breaking it down -->
	<section class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">
			Subtasks <span class="font-normal normal-case">(optional)</span>
		</h2>

		<div class="space-y-2">
			{#each subtasks as subtask, i}
				<div class="flex items-center gap-2 rounded-lg border border-gray-100 p-1.5 pl-3">
					<input
						type="checkbox"
						bind:checked={subtask.is_done}
						aria-label={`Mark subtask ${i + 1} done`}
						class="h-4 w-4 shrink-0 rounded border-gray-300 text-brand-gold-700 focus:ring-brand-gold-700"
					/>
					<input
						type="text"
						bind:value={subtask.title}
						placeholder={`Step ${i + 1}`}
						class={`h-9 w-full border-none bg-transparent px-1 text-sm focus:ring-0 focus:outline-none ${
							subtask.is_done ? 'text-gray-400 line-through' : ''
						}`}
					/>
					<button
						type="button"
						onclick={() => removeSubtask(i)}
						aria-label={`Remove subtask ${i + 1}`}
						class="shrink-0 rounded-md p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
					>
						<Trash2 class="h-4 w-4" />
					</button>
				</div>
			{/each}
		</div>

		<button
			type="button"
			onclick={addSubtask}
			class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-gold-700 transition-colors hover:text-brand-gold-800"
		>
			<Plus class="h-4 w-4" />
			Add subtask
		</button>
	</section>

	<div class="flex justify-end gap-3 pt-2">
		{#if oncancel}
			<button
				type="button"
				onclick={oncancel}
				class="h-11 rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
			>
				Cancel
			</button>
		{:else}
			<a
				href="/tasks"
				class="inline-flex h-11 items-center rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
			>
				Cancel
			</a>
		{/if}
		<button
			type="submit"
			disabled={loading}
			class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-gold-700 px-6 text-sm font-medium text-white transition-colors hover:bg-brand-gold-800 disabled:opacity-60"
		>
			{#if loading}
				<Loader2 class="h-4 w-4 animate-spin" />
				Saving...
			{:else}
				<Save class="h-4 w-4" />
				{task ? 'Save changes' : 'Create task'}
			{/if}
		</button>
	</div>
</form>
