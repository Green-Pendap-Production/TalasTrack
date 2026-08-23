<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		LayoutDashboard,
		CheckSquare,
		Vote,
		Building2,
		TrendingUp,
		Users,
		LogOut,
		Menu
	} from 'lucide-svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	let isSidebarOpen = $state(false);
	let user = $state(pb.authStore.model);

	onMount(() => {
		// If not authenticated, redirect to login
		if (!pb.authStore.isValid) {
			goto('/login');
		}

		// Subscribe to auth changes
		return pb.authStore.onChange((token, model) => {
			user = model;
			if (!pb.authStore.isValid) {
				goto('/login');
			}
		});
	});

	async function handleLogout() {
		pb.authStore.clear();
		goto('/login');
	}

	let navItems = $derived([
		{ label: 'Dashboard', icon: LayoutDashboard, href: '/' },
		{ label: 'Tasks', icon: CheckSquare, href: '/tasks' },
		{ label: 'Voting', icon: Vote, href: '/voting' },
		// Departments decide what tasks can be filed under, so directors only.
		...(user?.role === 'director'
			? [
					{ label: 'Performance', icon: TrendingUp, href: '/kpi' },
					{ label: 'Departments', icon: Building2, href: '/departments' },
					{ label: 'Members', icon: Users, href: '/users' }
				]
			: [])
	]);
</script>

<!-- Everything in this group sits behind the login. Nothing here should ever
     reach an index, and one tag on the group layout covers every page in it. -->
<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if user}
	<div class="flex h-screen overflow-hidden bg-brand-light-100">
		<!-- Mobile sidebar toggle -->
		<div class="fixed top-4 left-4 z-50 md:hidden">
			<button
				onclick={() => (isSidebarOpen = !isSidebarOpen)}
				class="rounded-lg border border-gray-200 bg-white p-2 text-brand-dark shadow-sm"
			>
				<Menu class="h-6 w-6" />
			</button>
		</div>

		<!-- Sidebar -->
		<aside
			class={`
      fixed inset-y-0 left-0 z-40 w-64 transform bg-brand-dark text-brand-light transition-transform duration-300 ease-in-out md:relative md:translate-x-0
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    `}
		>
			<div class="flex h-full flex-col">
				<div class="border-b border-brand-dark-900">
					<!-- Logo keeps its own colours, so it gets a light band rather than
					     the dark sidebar, where its dark ink would vanish. -->
					<div class="flex items-center bg-brand-light px-5 py-4">
						<img src="/logo.svg" alt="TrackMyPendap" class="h-8 w-auto" />
					</div>
					<div class="px-5 py-3">
						<span
							class="inline-flex rounded-full bg-brand-dark-900 px-2.5 py-1 text-[11px] font-medium tracking-wider text-brand-gold-300 uppercase"
						>
							{user?.role || 'User'}
						</span>
					</div>
				</div>

				<nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
					{#each navItems as item}
						<a
							href={item.href}
							class={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
								$page.url.pathname === item.href ||
								($page.url.pathname.startsWith(item.href) && item.href !== '/')
									? 'bg-brand-gold-700 font-medium text-white'
									: 'text-brand-light/70 hover:bg-brand-dark-900 hover:text-white'
							}`}
							onclick={() => (isSidebarOpen = false)}
						>
							<item.icon class="h-[18px] w-[18px] shrink-0" />
							{item.label}
						</a>
					{/each}
				</nav>

				<div class="border-t border-brand-dark-900 p-4">
					<a
						href="/profile"
						onclick={() => (isSidebarOpen = false)}
						class="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-brand-dark-900"
					>
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-dark-900 text-sm font-bold text-brand-gold-300"
						>
							{user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
						</div>
						<div class="overflow-hidden">
							<p class="truncate text-sm font-medium">{user?.name || user?.email}</p>
						</div>
					</a>
					<button
						onclick={handleLogout}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-light/70 transition-colors hover:bg-brand-dark-900 hover:text-red-400"
					>
						<LogOut class="h-5 w-5" />
						Logout
					</button>
				</div>
			</div>
		</aside>

		<!-- Overlay -->
		{#if isSidebarOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="fixed inset-0 z-30 bg-black/50 md:hidden"
				onclick={() => (isSidebarOpen = false)}
			></div>
		{/if}

		<!-- Main Content -->
		<main class="flex-1 overflow-y-auto p-4 md:p-8">
			<div class="mx-auto mt-12 max-w-6xl md:mt-0">
				{@render children()}
			</div>
		</main>
	</div>
{/if}
