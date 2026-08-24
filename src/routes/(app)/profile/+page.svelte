<script lang="ts">
	import { pb, pbError } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Loader2, Save, Check, Mail, KeyRound, Camera, Trash2 } from 'lucide-svelte';
	import Avatar from '$lib/Avatar.svelte';

	let me = $state<any>(pb.authStore.model);
	let departments = $state<any[]>([]);

	let name = $state(pb.authStore.model?.name ?? '');
	let departmentId = $state(pb.authStore.model?.department ?? '');
	let newEmail = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	let savingProfile = $state(false);
	let savingPassword = $state(false);
	let savingEmail = $state(false);
	let savingAvatar = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let error = $state('');
	let notice = $state('');

	// Same feature detection as the members page: only offer the department
	// selector if the field actually exists on the record.
	let hasDepartmentField = $derived(!!me && 'department' in me);
	let hasAvatarField = $derived(!!me && 'avatar' in me);

	// Checked before the upload starts: the server enforces its own limits, but a
	// 40MB pick should fail here rather than after a long upload.
	const MAX_AVATAR = 5 * 1024 * 1024;

	async function pickAvatar(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // let the same file be picked again after an error
		if (!file) return;

		error = '';
		notice = '';
		if (!file.type.startsWith('image/')) {
			error = 'Choose an image file.';
			return;
		}
		if (file.size > MAX_AVATAR) {
			error = `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 5MB.`;
			return;
		}

		savingAvatar = true;
		try {
			const form = new FormData();
			form.append('avatar', file);
			me = await pb.collection('users').update(me.id, form);
			await pb.collection('users').authRefresh();
			notice = 'Photo updated.';
		} catch (e: any) {
			error = pbError(e);
		} finally {
			savingAvatar = false;
		}
	}

	async function removeAvatar() {
		error = '';
		notice = '';
		savingAvatar = true;
		try {
			me = await pb.collection('users').update(me.id, { avatar: null });
			await pb.collection('users').authRefresh();
			notice = 'Photo removed.';
		} catch (e: any) {
			error = pbError(e);
		} finally {
			savingAvatar = false;
		}
	}

	onMount(async () => {
		try {
			departments = await pb.collection('departments').getFullList({ sort: 'name' });
		} catch {
			departments = [];
		}
	});

	async function saveProfile(event: Event) {
		event.preventDefault();
		error = '';
		notice = '';
		savingProfile = true;
		try {
			me = await pb.collection('users').update(me.id, {
				name,
				...(hasDepartmentField ? { department: departmentId || null } : {})
			});
			// Keep the sidebar's copy of the user in step with what we just saved.
			await pb.collection('users').authRefresh();
			notice = 'Profile updated.';
		} catch (e: any) {
			error = pbError(e);
		} finally {
			savingProfile = false;
		}
	}

	async function changePassword(event: Event) {
		event.preventDefault();
		error = '';
		notice = '';
		if (newPassword.length < 8) {
			error = 'New password must be at least 8 characters.';
			return;
		}
		if (newPassword !== confirmPassword) {
			error = 'The two new passwords do not match.';
			return;
		}
		savingPassword = true;
		try {
			await pb.collection('users').update(me.id, {
				oldPassword: currentPassword,
				password: newPassword,
				passwordConfirm: confirmPassword
			});
			// Changing the password invalidates the token, so sign in again.
			pb.authStore.clear();
			goto('/login');
		} catch (e: any) {
			error = pbError(e);
		} finally {
			savingPassword = false;
		}
	}

	async function changeEmail(event: Event) {
		event.preventDefault();
		error = '';
		notice = '';
		savingEmail = true;
		try {
			// PocketBase mails a confirmation link; the address only changes once
			// it is clicked, so nobody can lock you out of your own account.
			await pb.collection('users').requestEmailChange(newEmail);
			notice = `Confirmation sent to ${newEmail}. The change applies once you click the link.`;
			newEmail = '';
		} catch (e: any) {
			error = pbError(e);
		} finally {
			savingEmail = false;
		}
	}
</script>

<svelte:head>
	<title>My profile | TalasTrack</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-brand-dark">My profile</h1>
		<p class="mt-0.5 text-sm text-gray-500">Update your own details and password.</p>
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

	<form onsubmit={saveProfile} class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
		<div class="mb-6 flex items-center gap-4">
			<div class="relative shrink-0">
				<Avatar user={me} size="xl" />
				{#if savingAvatar}
					<span
						class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white"
					>
						<Loader2 class="h-5 w-5 animate-spin" />
					</span>
				{/if}
			</div>

			<div class="min-w-0">
				<p class="truncate font-medium text-brand-dark">{me?.email}</p>
				<p class="text-xs tracking-wider text-gray-400 uppercase">{me?.role || 'member'}</p>

				{#if hasAvatarField}
					<div class="mt-2 flex flex-wrap items-center gap-2">
						<input
							bind:this={fileInput}
							type="file"
							accept="image/*"
							onchange={pickAvatar}
							class="hidden"
						/>
						<button
							type="button"
							onclick={() => fileInput?.click()}
							disabled={savingAvatar}
							class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
						>
							<Camera class="h-3.5 w-3.5" />
							{me?.avatar ? 'Change photo' : 'Upload photo'}
						</button>
						{#if me?.avatar}
							<button
								type="button"
								onclick={removeAvatar}
								disabled={savingAvatar}
								aria-label="Remove photo"
								class="rounded-lg border border-transparent p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-60"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<div class="space-y-4">
			<div>
				<label for="name" class="mb-1.5 block text-sm font-medium text-brand-dark-900">Name</label>
				<input
					id="name"
					bind:value={name}
					required
					class="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
				/>
			</div>

			{#if hasDepartmentField}
				<div>
					<label for="dept" class="mb-1.5 block text-sm font-medium text-brand-dark-900">
						Department
					</label>
					<select
						id="dept"
						bind:value={departmentId}
						class="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
					>
						<option value="">No department</option>
						{#each departments as d}
							<option value={d.id}>{d.name}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		<div class="mt-6 flex justify-end">
			<button
				type="submit"
				disabled={savingProfile}
				class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-gold-700 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-gold-800 disabled:opacity-60"
			>
				{#if savingProfile}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<Save class="h-4 w-4" />
				{/if}
				Save changes
			</button>
		</div>
	</form>

	{#if !hasAvatarField}
		<p class="text-xs text-gray-400">
			No photo upload: the <code>users</code> collection has no <code>avatar</code> field. Add a
			file field named <code>avatar</code> in PocketBase and it appears here automatically.
		</p>
	{/if}

	<form onsubmit={changePassword} class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
		<h2 class="mb-1 flex items-center gap-2 font-semibold text-brand-dark">
			<KeyRound class="h-4 w-4 text-gray-400" />
			Change password
		</h2>
		<p class="mb-5 text-xs text-gray-500">You will be signed out and asked to log in again.</p>

		<div class="space-y-4">
			<div>
				<label for="current" class="mb-1.5 block text-sm font-medium text-brand-dark-900">
					Current password
				</label>
				<input
					id="current"
					type="password"
					bind:value={currentPassword}
					required
					autocomplete="current-password"
					class="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
				/>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="new" class="mb-1.5 block text-sm font-medium text-brand-dark-900">
						New password
					</label>
					<input
						id="new"
						type="password"
						bind:value={newPassword}
						required
						minlength="8"
						autocomplete="new-password"
						class="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
					/>
				</div>
				<div>
					<label for="confirm" class="mb-1.5 block text-sm font-medium text-brand-dark-900">
						Confirm new password
					</label>
					<input
						id="confirm"
						type="password"
						bind:value={confirmPassword}
						required
						minlength="8"
						autocomplete="new-password"
						class="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
					/>
				</div>
			</div>
		</div>

		<div class="mt-6 flex justify-end">
			<button
				type="submit"
				disabled={savingPassword}
				class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-5 text-sm font-medium text-brand-dark transition-colors hover:bg-gray-50 disabled:opacity-60"
			>
				{#if savingPassword}
					<Loader2 class="h-4 w-4 animate-spin" />
				{/if}
				Update password
			</button>
		</div>
	</form>

	<form onsubmit={changeEmail} class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
		<h2 class="mb-1 flex items-center gap-2 font-semibold text-brand-dark">
			<Mail class="h-4 w-4 text-gray-400" />
			Change email
		</h2>
		<p class="mb-5 text-xs text-gray-500">
			Currently <span class="font-medium text-brand-dark">{me?.email}</span>. We send a confirmation
			link to the new address first.
		</p>

		<div class="flex flex-col gap-3 sm:flex-row">
			<div class="flex-1">
				<label for="newEmail" class="sr-only">New email address</label>
				<input
					id="newEmail"
					type="email"
					bind:value={newEmail}
					required
					placeholder="new@company.com"
					class="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-gold-700 focus:outline-none"
				/>
			</div>
			<button
				type="submit"
				disabled={savingEmail}
				class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-5 text-sm font-medium text-brand-dark transition-colors hover:bg-gray-50 disabled:opacity-60"
			>
				{#if savingEmail}
					<Loader2 class="h-4 w-4 animate-spin" />
				{/if}
				Send confirmation
			</button>
		</div>
	</form>
</div>
