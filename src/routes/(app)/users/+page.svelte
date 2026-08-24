<script lang="ts">
	import { pb, pbError } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { UserPlus, Trash2, Loader2, KeyRound, Check } from 'lucide-svelte';
	import Avatar from '$lib/Avatar.svelte';

	let users = $state<any[]>([]);
	let departments = $state<any[]>([]);
	let taskCounts = $state<Record<string, number>>({});
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let notice = $state('');
	let showAdd = $state(false);

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let role = $state('');
	let departmentId = $state('');

	let me = pb.authStore.model;
	let isDirector = $derived(me?.role === 'director');

	// Take the roles from the data rather than hardcoding a list this schema may
	// not use. 'director' is the one the app itself checks for, so it is always offered.
	let roles = $derived([...new Set(['director', ...users.map((u) => u.role).filter(Boolean)])]);

	// PocketBase returns every schema field on a record, so the records themselves
	// tell us whether `users` has a department relation - no guessing, and no
	// writing to a field that would just 400.
	let hasDepartmentField = $derived(users.some((u) => 'department' in u));

	onMount(async () => {
		try {
			users = await pb.collection('users').getFullList({ sort: 'name' });
			try {
				departments = await pb.collection('departments').getFullList({ sort: 'name' });
			} catch {
				departments = [];
			}
			role = role || (roles.find((r) => r !== 'director') ?? 'director');
			const tasks = await pb.collection('tasks').getFullList({ fields: 'id,assignees' });
			taskCounts = tasks.reduce((acc: Record<string, number>, t: any) => {
				for (const id of t.assignees ?? []) acc[id] = (acc[id] ?? 0) + 1;
				return acc;
			}, {});
		} catch (e: any) {
			error = pbError(e);
		} finally {
			loading = false;
		}
	});

	async function add(event: Event) {
		event.preventDefault();
		error = '';
		notice = '';
		if (password.length < 8) {
			error = 'Password must be at least 8 characters.';
			return;
		}
		saving = true;
		try {
			const created = await pb.collection('users').create({
				name,
				email,
				password,
				passwordConfirm: password,
				role,
				...(hasDepartmentField ? { department: departmentId || null } : {})
			});
			users = [...users, created].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
			notice = `${name || email} can now sign in.`;
			showAdd = false;
			name = '';
			email = '';
			password = '';
		} catch (e: any) {
			error = pbError(e);
		} finally {
			saving = false;
		}
	}

	async function changeRole(u: any, next: string) {
		error = '';
		notice = '';
		// Dropping your own director role locks you out of this page immediately.
		if (u.id === me?.id && u.role === 'director' && next !== 'director') {
			if (!confirm('This removes your own director access. Continue?')) return;
		}
		const previous = u.role;
		u.role = next;
		try {
			await pb.collection('users').update(u.id, { role: next });
		} catch (e: any) {
			u.role = previous;
			error = pbError(e);
		}
	}

	async function changeDepartment(u: any, next: string) {
		error = '';
		notice = '';
		const previous = u.department ?? '';
		u.department = next;
		try {
			await pb.collection('users').update(u.id, { department: next || null });
		} catch (e: any) {
			u.department = previous;
			error = pbError(e);
		}
	}

	async function resetPassword(u: any) {
		error = '';
		notice = '';
		try {
			// PocketBase mails the link. Setting someone else's password directly is
			// a superuser action, so it stays in the admin panel.
			await pb.collection('users').requestPasswordReset(u.email);
			notice = `Password reset sent to ${u.email}.`;
		} catch (e: any) {
			error = pbError(e);
		}
	}

	async function remove(u: any) {
		error = '';
		notice = '';
		if (u.id === me?.id) {
			error = 'You cannot delete your own account.';
			return;
		}
		const count = taskCounts[u.id] ?? 0;
		const warning = count
			? `\n\nThey are assigned to ${count} task${count === 1 ? '' : 's'}, which will lose this assignee.`
			: '';
		if (!confirm(`Delete ${u.name || u.email}?${warning}\n\nThis cannot be undone.`)) return;
		try {
			await pb.collection('users').delete(u.id);
			users = users.filter((x) => x.id !== u.id);
		} catch (e: any) {
			error = pbError(e);
		}
	}
</script>

<svelte:head>
	<title>Members | TalasTrack</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-brand-dark">Members</h1>
		<p class="mt-0.5 text-sm text-gray-500">Add people, set their role, or remove access.</p>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
	{/if}
	{#if notice}
		<div
			class="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 p-4 text-sm text-green-700"
		>
			<Check class="h-4 w-4 shrink-0" />
			{notice}
		</div>
	{/if}

	{#if !isDirector}
		<div class="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500 shadow-sm">
			Only directors can manage members.
		</div>
	{:else}
		<div class="flex justify-end">
			<button
				onclick={() => (showAdd = !showAdd)}
				class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-gold-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-gold-800"
			>
				<UserPlus class="h-4 w-4" />
				{showAdd ? 'Close' : 'Add member'}
			</button>
		</div>

		{#if showAdd}
			<form onsubmit={add} class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
				<h2 class="mb-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">
					New member
				</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="name" class="mb-1.5 block text-xs font-medium text-gray-500">Name</label>
						<input
							id="name"
							bind:value={name}
							required
							placeholder="Jane Doe"
							class="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
						/>
					</div>
					<div>
						<label for="email" class="mb-1.5 block text-xs font-medium text-gray-500">Email</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							placeholder="jane@company.com"
							class="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
						/>
					</div>
					<div>
						<label for="password" class="mb-1.5 block text-xs font-medium text-gray-500">
							Temporary password
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							minlength="8"
							placeholder="At least 8 characters"
							class="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
						/>
					</div>
					<div>
						<label for="role" class="mb-1.5 block text-xs font-medium text-gray-500">Role</label>
						<select
							id="role"
							bind:value={role}
							class="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
						>
							{#each roles as r}
								<option value={r}>{r}</option>
							{/each}
						</select>
					</div>
					{#if hasDepartmentField}
						<div>
							<label for="dept" class="mb-1.5 block text-xs font-medium text-gray-500"
								>Department</label
							>
							<select
								id="dept"
								bind:value={departmentId}
								class="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
							>
								<option value="">No department</option>
								{#each departments as d}
									<option value={d.id}>{d.name}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>

				<div class="mt-5 flex justify-end gap-3 border-t border-gray-100 pt-5">
					<button
						type="button"
						onclick={() => (showAdd = false)}
						class="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-gold-700 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-gold-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if saving}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						Create member
					</button>
				</div>
			</form>
		{/if}

		<div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
			{#if loading}
				<p class="p-8 text-center text-gray-500">Loading members...</p>
			{:else if users.length === 0}
				<p class="p-8 text-center text-gray-500">No members yet.</p>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each users as u (u.id)}
						<li
							class="grid grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-brand-light-100/50 sm:grid-cols-[minmax(0,1fr)_auto]"
						>
							<div class="flex min-w-0 items-center gap-3">
								<Avatar user={u} size="lg" />

								<div class="min-w-0">
									<p class="flex items-center gap-2 text-sm font-medium text-brand-dark">
										<span class="truncate">{u.name || 'No name'}</span>
										{#if u.role === 'director'}
											<span
												class="shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-gold-800"
											>
												Director
											</span>
										{/if}
										{#if u.id === me?.id}
											<span class="shrink-0 text-xs font-normal text-gray-400">you</span>
										{/if}
									</p>
									<p class="mt-0.5 truncate text-xs text-gray-500">
										{u.email || 'email hidden'}
										<span class="text-gray-300">&middot;</span>
										{taskCounts[u.id] ?? 0} tasks
									</p>
								</div>
							</div>

							<!-- Controls sit in their own group, so rows line up column-wise
							     instead of every row wrapping at a different point. -->
							<div class="flex flex-wrap items-center gap-2 pl-13 sm:flex-nowrap sm:pl-0">
								{#if hasDepartmentField}
									<select
										value={u.department ?? ''}
										onchange={(e) => changeDepartment(u, e.currentTarget.value)}
										aria-label={`Department for ${u.name || u.email}`}
										class="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-600 focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none sm:h-9 sm:w-32 sm:flex-none"
									>
										<option value="">No department</option>
										{#each departments as d}
											<option value={d.id}>{d.name}</option>
										{/each}
									</select>
								{/if}

								<select
									value={u.role ?? ''}
									onchange={(e) => changeRole(u, e.currentTarget.value)}
									aria-label={`Role for ${u.name || u.email}`}
									class="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-600 capitalize focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none sm:h-9 sm:w-28 sm:flex-none"
								>
									{#each roles as r}
										<option value={r}>{r}</option>
									{/each}
								</select>

								<div class="ml-1 flex items-center gap-1 border-l border-gray-100 pl-2">
									<button
										onclick={() => resetPassword(u)}
										aria-label={`Send password reset to ${u.email}`}
										title="Send password reset email"
										class="rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-dark sm:p-2"
									>
										<KeyRound class="h-4 w-4" />
									</button>

									<button
										onclick={() => remove(u)}
										disabled={u.id === me?.id}
										aria-label={`Delete ${u.name || u.email}`}
										title={u.id === me?.id ? 'You cannot delete yourself' : 'Delete member'}
										class="rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 sm:p-2"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		{#if !loading && !hasDepartmentField}
			<p class="text-xs text-gray-400">
				No department selector: the <code>users</code> collection has no
				<code>department</code> field. Add a relation field named <code>department</code>
				pointing at <code>departments</code> in PocketBase and it appears here automatically.
			</p>
		{/if}

		<p class="text-xs text-gray-400">
			Passwords are only set at creation. Changing someone else's password afterwards is a superuser
			action, so the key icon sends them a reset email instead.
		</p>
	{/if}
</div>
