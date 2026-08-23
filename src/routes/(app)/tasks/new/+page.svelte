<script lang="ts">
	import TaskForm from '$lib/TaskForm.svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft } from 'lucide-svelte';
</script>

<svelte:head>
	<title>New Task | TalasTrack</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div class="flex items-center gap-4">
		<a
			href="/tasks"
			class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
			aria-label="Back to tasks"
		>
			<ArrowLeft class="h-5 w-5" />
		</a>
		<div>
			<h1 class="text-3xl font-bold text-brand-dark">Create New Task</h1>
			<p class="mt-1 text-gray-500">Assign a new task to a department or team member.</p>
		</div>
	</div>

	<TaskForm onsaved={(t) => goto(`/tasks/${t.id}`)} />
</div>
