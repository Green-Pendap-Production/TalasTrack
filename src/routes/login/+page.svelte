<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { User, Lock, Loader2 } from 'lucide-svelte';
	import Seo from '$lib/Seo.svelte';

	// Only ever follow an in-app path, so a crafted ?redirect= can't bounce
	// someone off-site straight after they hand over a password.
	let redirect = $derived.by(() => {
		const target = $page.url.searchParams.get('redirect') ?? '';
		return target.startsWith('/') && !target.startsWith('//') ? target : '/tasks';
	});

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state('');

	async function handleLogin(event: Event) {
		event.preventDefault();
		loading = true;
		errorMessage = '';

		try {
			await pb.collection('users').authWithPassword(email, password);
			goto(redirect);
		} catch (error: any) {
			errorMessage = error.message || 'Invalid email or password';
		} finally {
			loading = false;
		}
	}
</script>

<Seo
	title="Sign in"
	description="TalasTrack - task tracking and team voting for Green Pendap. Sign in to manage your tasks."
/>

<div class="flex min-h-screen items-center justify-center bg-brand-light-100 p-4">
	<div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
		<div class="border-b border-gray-100 bg-brand-light px-6 py-8 text-center">
			<img src="/logo.svg" alt="TrackMyPendap" class="mx-auto h-14 w-auto" />
			<p class="mt-4 text-brand-dark/70">Sign in to manage your tasks</p>
		</div>

		<div class="p-8">
			{#if errorMessage}
				<div class="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
					{errorMessage}
				</div>
			{/if}

			<form onsubmit={handleLogin} class="space-y-6">
				<div>
					<label for="email" class="mb-2 block text-sm font-medium text-brand-dark-900"
						>Email Address</label
					>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<User class="h-5 w-5 text-gray-400" />
						</div>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="block w-full rounded-lg border border-gray-200 py-3 pr-3 pl-10 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
							placeholder="you@company.com"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="mb-2 block text-sm font-medium text-brand-dark-900"
						>Password</label
					>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Lock class="h-5 w-5 text-gray-400" />
						</div>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							class="block w-full rounded-lg border border-gray-200 py-3 pr-3 pl-10 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-gold-700"
							placeholder="••••••••"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="flex w-full items-center justify-center rounded-lg border border-transparent bg-brand-gold-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-gold-800 focus:ring-2 focus:ring-brand-gold-700 focus:ring-offset-2 focus:outline-none disabled:opacity-70"
				>
					{#if loading}
						<Loader2 class="mr-2 h-5 w-5 animate-spin" />
						Signing in...
					{:else}
						Sign In
					{/if}
				</button>
			</form>
		</div>

		<div class="flex flex-col items-center gap-2 border-t border-gray-100 px-8 py-5">
			<p class="text-xs tracking-wider text-gray-400 uppercase">A product by</p>
			<!-- gpp.svg carries a lot of padding in its viewBox: the artwork is only
			     ~51% of the file height, so it needs roughly double the box to read. -->
			<img src="/gpp.svg" alt="Green Pendap" class="h-14 w-auto" />
		</div>
	</div>
</div>
