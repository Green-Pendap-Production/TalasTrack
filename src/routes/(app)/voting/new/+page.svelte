<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Loader2, Save, Plus, Trash2 } from 'lucide-svelte';

	let title = $state('');
	let description = $state('');
	let options = $state(['', '']);

	let loading = $state(false);
	let error = $state('');

	function addOption() {
		options = [...options, ''];
	}

	function removeOption(index: number) {
		if (options.length > 2) {
			options = options.filter((_, i) => i !== index);
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		const validOptions = options.filter((o) => o.trim() !== '');
		if (validOptions.length < 2) {
			error = 'Please provide at least two valid options.';
			return;
		}

		loading = true;
		error = '';

		try {
			await pb.collection('polls').create({
				title,
				description,
				is_open: true,
				options: validOptions,
				created_by: pb.authStore.model?.id
			});

			goto('/voting');
		} catch (e: any) {
			error = e.message || 'Failed to create poll';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>New Poll | TalasTrack</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div class="flex items-center gap-4">
		<a href="/voting" class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100">
			<ArrowLeft class="h-5 w-5" />
		</a>
		<div>
			<h1 class="text-3xl font-bold text-brand-dark">Create New Poll</h1>
			<p class="mt-1 text-gray-500">Start a new vote for the team.</p>
		</div>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
			{error}
		</div>
	{/if}

	<form
		onsubmit={handleSubmit}
		class="space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8"
	>
		<div>
			<label for="title" class="mb-2 block text-sm font-medium text-brand-dark-900"
				>Poll Question</label
			>
			<input
				id="title"
				type="text"
				bind:value={title}
				required
				class="block w-full rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
				placeholder="What should we decide?"
			/>
		</div>

		<div>
			<label for="description" class="mb-2 block text-sm font-medium text-brand-dark-900"
				>Description (Optional)</label
			>
			<textarea
				id="description"
				bind:value={description}
				rows="3"
				class="block w-full resize-y rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
				placeholder="Add context..."></textarea>
		</div>

		<div class="border-t border-gray-100 pt-4">
			<span class="mb-4 block text-sm font-medium text-brand-dark-900">Poll Options</span>
			<div class="space-y-3">
				{#each options as option, i}
					<div class="flex items-center gap-3">
						<input
							type="text"
							bind:value={options[i]}
							required
							class="block w-full rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
							placeholder={`Option ${i + 1}`}
						/>
						{#if options.length > 2}
							<button
								type="button"
								onclick={() => removeOption(i)}
								class="rounded-lg border border-transparent p-3 text-gray-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500"
							>
								<Trash2 class="h-5 w-5" />
							</button>
						{/if}
					</div>
				{/each}
			</div>

			<button
				type="button"
				onclick={addOption}
				class="mt-4 flex items-center gap-2 text-sm font-medium text-brand-gold-700 transition-colors hover:text-brand-gold-800"
			>
				<Plus class="h-4 w-4" />
				Add another option
			</button>
		</div>

		<div class="flex justify-end gap-4 border-t border-gray-100 pt-6">
			<a
				href="/voting"
				class="rounded-lg border border-gray-200 px-6 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={loading}
				class="inline-flex items-center justify-center rounded-lg border border-transparent bg-brand-gold-700 px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-brand-gold-800 focus:ring-2 focus:ring-brand-gold-700 focus:ring-offset-2 focus:outline-none disabled:opacity-70"
			>
				{#if loading}
					<Loader2 class="mr-2 h-5 w-5 animate-spin" />
					Creating...
				{:else}
					<Save class="mr-2 h-5 w-5" />
					Create Poll
				{/if}
			</button>
		</div>
	</form>
</div>
