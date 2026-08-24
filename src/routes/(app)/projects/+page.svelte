<script lang="ts">
	import { pb, pbError } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { FolderKanban, Plus, Trash2, Loader2 } from 'lucide-svelte';
	import { projectScope, loadProjects, setProject } from '$lib/projects.svelte';
	import { ALL_PROJECTS } from '$lib/projects';

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
		await loadProjects();
		if (projectScope.available) {
			try {
				// One skinny fetch of every task, counted here - not a getList per project.
				const tasks = await pb.collection('tasks').getFullList({ fields: 'id,project' });
				taskCounts = tasks.reduce((acc: Record<string, number>, t: any) => {
					if (t.project) acc[t.project] = (acc[t.project] ?? 0) + 1;
					return acc;
				}, {});
			} catch (e: any) {
				error = pbError(e);
			}
		}
		loading = false;
	}

	async function add(event: Event) {
		event.preventDefault();
		const name = newName.trim();
		if (!name) return;
		if (projectScope.list.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
			error = `"${name}" already exists.`;
			return;
		}
		saving = true;
		error = '';
		try {
			const created = await pb.collection('projects').create({ name });
			projectScope.list = [...projectScope.list, created].sort((a, b) =>
				a.name.localeCompare(b.name)
			);
			newName = '';
		} catch (e: any) {
			error = pbError(e);
		} finally {
			saving = false;
		}
	}

	async function remove(project: any) {
		const count = taskCounts[project.id] ?? 0;
		// Say what else this touches before it is gone - the tasks outlive the project.
		const warning = count
			? `\n\n${count} task${count === 1 ? '' : 's'} reference it and will be affected.`
			: '';
		if (!confirm(`Delete "${project.name}"?${warning}\n\nThis cannot be undone.`)) return;
		try {
			await pb.collection('projects').delete(project.id);
			projectScope.list = projectScope.list.filter((p) => p.id !== project.id);
			// Never leave the app scoped to something that no longer exists.
			if (projectScope.id === project.id) setProject(ALL_PROJECTS);
		} catch (e: any) {
			error = pbError(e);
		}
	}
</script>

<svelte:head>
	<title>Projects | TalasTrack</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-brand-dark">Projects</h1>
		<p class="mt-1 text-gray-500">
			Separate work by project, then switch between them from the sidebar.
		</p>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
	{/if}

	{#if !isDirector}
		<div class="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500 shadow-sm">
			Only directors can manage projects.
		</div>
	{:else if loading}
		<p class="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500 shadow-sm">
			Loading projects...
		</p>
	{:else if !projectScope.available}
		<!-- The collection has to exist server-side before any of this works.
		     Say exactly what to create rather than surfacing a bare 404. -->
		<div
			class="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
		>
			<p class="font-semibold">The <code>projects</code> collection does not exist yet.</p>
			<p>Create it once in the PocketBase admin UI, then reload this page:</p>
			<ol class="list-decimal space-y-1 pl-5">
				<li>
					New base collection named <code>projects</code>, with a text field <code>name</code> (required).
				</li>
				<li>
					In the <code>tasks</code> collection, add a <strong>relation</strong> field named
					<code>project</code> &rarr; <code>projects</code>, single, optional.
				</li>
				<li>Give both collections the same list/view/create API rules your departments use.</li>
			</ol>
		</div>
	{:else}
		<form
			onsubmit={add}
			class="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row"
		>
			<label for="projectName" class="sr-only">New project name</label>
			<input
				id="projectName"
				type="text"
				bind:value={newName}
				placeholder="E.g., Apollo"
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
			{#if projectScope.list.length === 0}
				<p class="p-8 text-center text-gray-500">No projects yet. Add your first one above.</p>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each projectScope.list as project (project.id)}
						{@const count = taskCounts[project.id] ?? 0}
						<li class="flex items-center gap-3 px-6 py-4">
							<FolderKanban class="h-5 w-5 shrink-0 text-brand-gold-700" />
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium text-brand-dark">{project.name}</p>
								<p class="text-xs text-gray-500">
									{count} task{count === 1 ? '' : 's'}
								</p>
							</div>
							<button
								onclick={() => setProject(project.id)}
								disabled={projectScope.id === project.id}
								class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:border-brand-gold-700 disabled:bg-brand-light-100 disabled:text-brand-dark"
							>
								{projectScope.id === project.id ? 'Current' : 'Switch to'}
							</button>
							<button
								onclick={() => remove(project)}
								aria-label={`Delete ${project.name}`}
								class="rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
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
