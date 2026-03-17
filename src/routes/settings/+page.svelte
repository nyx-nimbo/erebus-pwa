<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$lib/stores';
	import { logout } from '$lib/auth';
	import { getGoogleConnectURL, googleCallback, getGoogleConnectionStatus, disconnectGoogle } from '$lib/api';

	let currentUser = $state<{ name: string; email: string; picture: string } | null>(null);

	user.subscribe((v) => (currentUser = v));

	let appVersion = $state('0.0.1');
	let confirmingSignOut = $state(false);

	// Google Services connection
	let googleConnected = $state(false);
	let googleLoading = $state(true);
	let googleError = $state('');
	let connecting = $state(false);
	let confirmingDisconnect = $state(false);

	onMount(async () => {
		// Check Google connection status
		try {
			const status = await getGoogleConnectionStatus();
			googleConnected = status.connected;
		} catch {
			googleConnected = false;
		} finally {
			googleLoading = false;
		}

		// Handle OAuth callback if we have a code in the URL
		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');
		if (code) {
			connecting = true;
			googleError = '';
			try {
				const result = await googleCallback(code);
				googleConnected = result.connected;
				// Clean URL
				window.history.replaceState({}, '', '/settings');
			} catch (e: any) {
				googleError = e.message || 'Failed to connect Google services';
			} finally {
				connecting = false;
			}
		}
	});

	async function connectGoogle() {
		connecting = true;
		googleError = '';
		try {
			const redirectUri = window.location.origin + '/settings';
			const result = await getGoogleConnectURL(redirectUri);
			window.location.href = result.url;
		} catch (e: any) {
			googleError = e.message || 'Failed to initiate Google connection';
			connecting = false;
		}
	}

	async function handleDisconnect() {
		if (!confirmingDisconnect) {
			confirmingDisconnect = true;
			return;
		}
		try {
			await disconnectGoogle();
			googleConnected = false;
			confirmingDisconnect = false;
		} catch (e: any) {
			googleError = e.message || 'Failed to disconnect';
		}
	}

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

	<!-- Google Services -->
	<div class="card">
		<h2 class="text-sm font-semibold text-[#e5e5e5] mb-4">Google Services</h2>
		<p class="text-xs text-[#a3a3a3] mb-4">
			Connect your Google account to use Gmail, Calendar, and Drive features.
		</p>

		{#if googleLoading}
			<div class="flex items-center gap-2 text-sm text-[#a3a3a3]">
				<div class="w-4 h-4 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
				Checking connection...
			</div>
		{:else if connecting}
			<div class="flex items-center gap-2 text-sm text-[#a3a3a3]">
				<div class="w-4 h-4 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
				Connecting...
			</div>
		{:else if googleConnected}
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-green-500"></span>
					<span class="text-sm text-green-400">Connected</span>
				</div>
				<p class="text-xs text-[#a3a3a3]">
					Gmail, Calendar, and Drive are active. You can access Email and Calendar from the sidebar.
				</p>
				<div class="flex items-center justify-between">
					<span class="text-xs text-[#a3a3a3]">Disconnect Google services</span>
					{#if confirmingDisconnect}
						<div class="flex items-center gap-2">
							<button class="btn-secondary text-xs" onclick={() => (confirmingDisconnect = false)}>Cancel</button>
							<button
								class="text-xs font-medium px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer border-none"
								onclick={handleDisconnect}
							>
								Confirm
							</button>
						</div>
					{:else}
						<button
							class="text-xs font-medium px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer border-none"
							onclick={handleDisconnect}
						>
							Disconnect
						</button>
					{/if}
				</div>
			</div>
		{:else}
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-[#525252]"></span>
					<span class="text-sm text-[#a3a3a3]">Not connected</span>
				</div>
				<button
					class="w-full px-4 py-2.5 bg-[#7c3aed] text-white text-sm font-medium rounded-lg hover:bg-[#6d28d9] transition-colors flex items-center justify-center gap-2"
					onclick={connectGoogle}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M1 4v6h6"/>
						<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
					</svg>
					Connect Google Services
				</button>
			</div>
		{/if}

		{#if googleError}
			<p class="text-red-400 text-xs mt-3">{googleError}</p>
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
