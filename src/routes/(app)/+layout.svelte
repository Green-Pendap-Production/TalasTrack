<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		LayoutDashboard,
		CheckSquare,
		Vote,
		Building2,
		FolderKanban,
		TrendingUp,
		Users,
		LogOut,
		Menu,
		X
	} from 'lucide-svelte';
	import { page } from '$app/stores';
	import Avatar from '$lib/Avatar.svelte';
	import { projectScope, setProject, loadProjects } from '$lib/projects.svelte';
	import { ALL_PROJECTS, NO_PROJECT } from '$lib/projects';

	let { children } = $props();

	let isSidebarOpen = $state(false);
	let user = $state(pb.authStore.model);

	onMount(() => {
		// If not authenticated, redirect to login
		if (!pb.authStore.isValid) {
			goto('/login');
		}

		// Fetched once here, then read by every page that scopes by project.
		if (pb.authStore.isValid) loadProjects();

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

	// Route changes close the drawer - including back/forward, which the per-link
	// handler never sees.
	$effect(() => {
		$page.url.pathname;
		isSidebarOpen = false;
	});

	// A drawer over a scrolling page lets the background scroll under your finger.
	$effect(() => {
		document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
		return () => (document.body.style.overflow = '');
	});

	let navItems = $derived([
		{ label: 'Dashboard', icon: LayoutDashboard, href: '/' },
		{ label: 'Tasks', icon: CheckSquare, href: '/tasks' },
		{ label: 'Voting', icon: Vote, href: '/voting' },
		// Departments decide what tasks can be filed under, so directors only.
		...(user?.role === 'director'
			? [
					{ label: 'Performance', icon: TrendingUp, href: '/kpi' },
					{ label: 'Projects', icon: FolderKanban, href: '/projects' },
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
	<div class="flex h-dvh overflow-hidden bg-brand-light-100">
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
					<div class="flex items-center justify-between gap-2 bg-brand-light py-3 pr-2 pl-5">
						<img src="/logo.svg" alt="TrackMyPendap" class="h-8 w-auto" />
						<button
							onclick={() => (isSidebarOpen = false)}
							aria-label="Close menu"
							class="-mr-1 rounded-lg p-2.5 text-brand-dark/60 transition-colors hover:bg-black/5 hover:text-brand-dark md:hidden"
						>
							<X class="h-5 w-5" />
						</button>
					</div>
					<div class="space-y-3 px-5 py-3">
						<span
							class="inline-flex rounded-full bg-brand-dark-900 px-2.5 py-1 text-[11px] font-medium tracking-wider text-brand-gold-300 uppercase"
						>
							{user?.role || 'User'}
						</span>

						<!-- Scopes the whole app to one project. Hidden until the `projects`
						     collection exists, so nothing breaks before it is set up. -->
						{#if projectScope.available}
							<div>
								<label
									for="projectScope"
									class="mb-1 block text-[11px] font-medium tracking-wider text-brand-light/50 uppercase"
								>
									Project
								</label>
								<select
									id="projectScope"
									value={projectScope.id}
									onchange={(e) => setProject(e.currentTarget.value)}
									class="h-9 w-full rounded-lg border border-brand-dark-900 bg-brand-dark-900 px-2 text-sm text-white focus:border-brand-gold-700 focus:ring-1 focus:ring-brand-gold-700 focus:outline-none"
								>
									<option value={ALL_PROJECTS}>All projects</option>
									{#each projectScope.list as p (p.id)}
										<option value={p.id}>{p.name}</option>
									{/each}
									<option value={NO_PROJECT}>No project</option>
								</select>
							</div>
						{/if}
					</div>
				</div>

				<nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
					{#each navItems as item}
						<a
							href={item.href}
							class={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors md:py-2.5 ${
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
						<Avatar {user} size="md" class="bg-brand-dark-900 text-brand-gold-300" />
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
		<div class="flex min-w-0 flex-1 flex-col overflow-hidden">
			<!-- Mobile top bar. The old floating button sat on top of the drawer's
			     own logo and forced the page to reserve a blank strip for it. -->
			<header
				class="sticky top-0 z-20 flex items-center gap-2 border-b border-gray-200/70 bg-brand-light-100/95 px-2 py-2 backdrop-blur md:hidden"
			>
				<button
					onclick={() => (isSidebarOpen = true)}
					aria-label="Open menu"
					aria-expanded={isSidebarOpen}
					class="rounded-lg p-2.5 text-brand-dark transition-colors hover:bg-black/5"
				>
					<Menu class="h-6 w-6" />
				</button>
				<img src="/logo.svg" alt="TrackMyPendap" class="h-7 w-auto" />
			</header>

			<main class="flex-1 overflow-y-auto p-4 md:p-8">
				<div class="mx-auto max-w-6xl">
					{@render children()}
				</div>
			</main>
		</div>
	</div>
{/if}
