<script lang="ts">
	import { pb, pbError } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { Building2, Plus, Trash2, Loader2 } from 'lucide-svelte';

	let departments = $state<any[]>([]);
	let taskCounts = $state<Record<string, number>>({});
	let newName = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	let user = pb.authStore.model;
	let isDirector = $derived(user?.role === 'director');

	onMount(load);

	async function load() {
		loading = true;
		try {
			departments = await pb.collection('departments').getFullList({ sort: 'name' });
			// One skinny fetch of every task, counted here - not a getList per department.
			const tasks = await pb.collection('tasks').getFullList({ fields: 'id,department' });
			taskCounts = tasks.reduce((acc: Record<string, number>, t: any) => {
				if (t.department) acc[t.department] = (acc[t.department] ?? 0) + 1;
				return acc;
			}, {});
		} catch (e: any) {
			error = pbError(e);
		} finally {
			loading = false;
		}
	}

	async function add(event: Event) {
		event.preventDefault();
		const name = newName.trim();
		if (!name) return;
		if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
			error = `"${name}" already exists.`;
			return;
		}
		saving = true;
		error = '';
		try {
			const created = await pb.collection('departments').create({ name });
			departments = [...departments, created].sort((a, b) => a.name.localeCompare(b.name));
			newName = '';
		} catch (e: any) {
			error = pbError(e);
		} finally {
			saving = false;
		}
	}

	async function remove(dept: any) {
		const count = taskCounts[dept.id] ?? 0;
		// Say what else this touches before it is gone - the tasks outlive the department.
		const warning = count
			? `\n\n${count} task${count === 1 ? '' : 's'} reference it and will be affected.`
			: '';
		if (!confirm(`Delete "${dept.name}"?${warning}\n\nThis cannot be undone.`)) return;
		try {
			await pb.collection('departments').delete(dept.id);
			departments = departments.filter((d) => d.id !== dept.id);
		} catch (e: any) {
			error = pbError(e);
		}
	}
</script>

<svelte:head>
	<title>Departments | TalasTrack</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-brand-dark">Departments</h1>
		<p class="mt-1 text-gray-500">Add or remove the departments tasks can be assigned to.</p>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
	{/if}

	{#if !isDirector}
		<div class="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500 shadow-sm">
			Only directors can manage departments.
		</div>
	{:else}
		<form
			onsubmit={add}
			class="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row"
		>
			<label for="deptName" class="sr-only">New department name</label>
			<input
				id="deptName"
				type="text"
				bind:value={newName}
				placeholder="E.g., Marketing"
				class="flex-1 rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
			/>
			<button
				type="submit"
				disabled={saving || !newName.trim()}
				class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-gold-700 px-6 py-3 font-medium text-white transition-all hover:bg-brand-gold-800 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if saving}
					<Loader2 class="h-5 w-5 animate-spin" />
				{:else}
					<Plus class="h-5 w-5" />
				{/if}
				Add
			</button>
		</form>

		<div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
			{#if loading}
				<p class="p-8 text-center text-gray-500">Loading departments...</p>
			{:else if departments.length === 0}
				<p class="p-8 text-center text-gray-500">No departments yet. Add the first one above.</p>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each departments as dept}
						{@const count = taskCounts[dept.id] ?? 0}
						<li class="flex items-center justify-between gap-4 px-6 py-4">
							<div class="flex min-w-0 items-center gap-3">
								<div
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light-100 text-brand-gold-700"
								>
									<Building2 class="h-5 w-5" />
								</div>
								<div class="min-w-0">
									<p class="truncate font-medium text-brand-dark">{dept.name}</p>
									<p class="text-xs text-gray-500">{count} {count === 1 ? 'task' : 'tasks'}</p>
								</div>
							</div>
							<button
								onclick={() => remove(dept)}
								aria-label={`Delete ${dept.name}`}
								class="shrink-0 rounded-lg border border-transparent p-2 text-gray-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500"
							>
								<Trash2 class="h-5 w-5" />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
