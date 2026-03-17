<script lang="ts">
	import { user } from '$lib/stores';
	import { logout } from '$lib/auth';

	let currentUser = $state<{ name: string; email: string; picture: string } | null>(null);

	user.subscribe((v) => (currentUser = v));

	let appVersion = $state('0.0.1');
	let confirmingSignOut = $state(false);

	function handleSignOut() {
		if (!confirmingSignOut) {
			confirmingSignOut = true;
			return;
		}
		logout();
	}

	function cancelSignOut() {
		confirmingSignOut = false;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-[#e5e5e5]">Settings</h1>
		<p class="text-sm text-[#a3a3a3] mt-1">Manage your account and preferences</p>
	</div>

	<!-- Profile Card -->
	<div class="card">
		<h2 class="text-sm font-semibold text-[#e5e5e5] mb-4">Profile</h2>
		{#if currentUser}
			<div class="flex items-center gap-4">
				{#if currentUser.picture}
					<img
						src={currentUser.picture}
						alt={currentUser.name}
						class="w-16 h-16 rounded-full border-2 border-[#262626] shrink-0"
						referrerpolicy="no-referrer"
					/>
				{:else}
					<div class="w-16 h-16 rounded-full bg-[#7c3aed]/20 border-2 border-[#262626] flex items-center justify-center shrink-0">
						<span class="text-2xl font-bold text-[#7c3aed]">
							{currentUser.name?.charAt(0)?.toUpperCase() || '?'}
						</span>
					</div>
				{/if}
				<div class="min-w-0">
					<p class="text-lg font-semibold text-[#e5e5e5] truncate">{currentUser.name}</p>
					<p class="text-sm text-[#a3a3a3] truncate">{currentUser.email}</p>
				</div>
			</div>
		{:else}
			<p class="text-sm text-[#a3a3a3]">No user information available</p>
		{/if}
	</div>

	<!-- Account Actions -->
	<div class="card">
		<h2 class="text-sm font-semibold text-[#e5e5e5] mb-4">Account</h2>
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-[#e5e5e5]">Sign out</p>
					<p class="text-xs text-[#a3a3a3]">Sign out of your account on this device</p>
				</div>
				{#if confirmingSignOut}
					<div class="flex items-center gap-2">
						<button class="btn-secondary text-xs" onclick={cancelSignOut}>Cancel</button>
						<button
							class="text-xs font-medium px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer border-none"
							onclick={handleSignOut}
						>
							Confirm
						</button>
					</div>
				{:else}
					<button
						class="text-xs font-medium px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer border-none"
						onclick={handleSignOut}
					>
						Sign Out
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- App Info -->
	<div class="card">
		<h2 class="text-sm font-semibold text-[#e5e5e5] mb-4">About</h2>
		<div class="space-y-3">
			<div class="flex items-center justify-between text-sm">
				<span class="text-[#a3a3a3]">App</span>
				<span class="text-[#e5e5e5]">Erebus</span>
			</div>
			<div class="flex items-center justify-between text-sm">
				<span class="text-[#a3a3a3]">Version</span>
				<span class="text-[#e5e5e5]">{appVersion}</span>
			</div>
			<div class="flex items-center justify-between text-sm">
				<span class="text-[#a3a3a3]">Platform</span>
				<span class="text-[#e5e5e5]">PWA</span>
			</div>
			<div class="flex items-center justify-between text-sm">
				<span class="text-[#a3a3a3]">Framework</span>
				<span class="text-[#e5e5e5]">SvelteKit</span>
			</div>
		</div>
	</div>
</div>
