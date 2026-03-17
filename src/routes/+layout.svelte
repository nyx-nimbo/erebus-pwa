<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { initAuth, logout as authLogout } from '$lib/auth';
	import { isAuthenticated, sidebarOpen } from '$lib/stores';
	import { connect, disconnect, unreadWsCount } from '$lib/websocket';

	let { children } = $props();

	const navItems = [
		{ path: '/', label: 'Dashboard', icon: '⊞' },
		{ path: '/chat', label: 'Chat', icon: '💬' },
		{ path: '/messages', label: 'Messages', icon: '✉' },
		{ path: '/members', label: 'Members', icon: '👤' },
		{ path: '/projects', label: 'Projects', icon: '📁' },
		{ path: '/clients', label: 'Clients', icon: '👥' },
		{ path: '/ideas', label: 'Ideas', icon: '💡' },
		{ path: '/email', label: 'Email', icon: '📧' },
		{ path: '/calendar', label: 'Calendar', icon: '📅' },
		{ path: '/settings', label: 'Settings', icon: '⚙' }
	];

	let authenticated = $state(false);
	let sidebar = $state(false);
	let unreadCount = $state(0);

	const unsubAuth = isAuthenticated.subscribe((v) => (authenticated = v));
	const unsubSidebar = sidebarOpen.subscribe((v) => (sidebar = v));
	const unsubUnread = unreadWsCount.subscribe((v) => (unreadCount = v));

	onMount(() => {
		initAuth();
	});

	onDestroy(() => {
		unsubAuth();
		unsubSidebar();
		unsubUnread();
		disconnect();
	});

	// Connect/disconnect WebSocket based on auth state
	$effect(() => {
		if (authenticated) {
			connect();
		} else {
			disconnect();
		}
	});

	$effect(() => {
		const path = $page.url.pathname;
		if (!authenticated && path !== '/login') {
			goto('/login');
		}
		// Clear unread count when viewing messages
		if (path === '/messages' || path.startsWith('/messages/')) {
			unreadWsCount.set(0);
		}
	});

	function logout() {
		disconnect();
		authLogout();
	}

	function isActive(path: string): boolean {
		if (path === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(path);
	}

	function navigate(path: string) {
		goto(path);
		sidebarOpen.set(false);
	}
</script>

{#if !authenticated || $page.url.pathname === '/login'}
	{@render children()}
{:else}
	<div class="flex h-screen overflow-hidden">
		<!-- Desktop Sidebar -->
		<aside class="hidden md:flex flex-col w-56 bg-[#111] border-r border-[#262626] shrink-0">
			<div class="p-4 border-b border-[#262626]">
				<h1 class="text-lg font-bold text-[#7c3aed]">Erebus</h1>
			</div>
			<nav class="flex-1 p-2 space-y-1 overflow-y-auto">
				{#each navItems as item}
					<button
						class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors {isActive(item.path) ? 'bg-[#7c3aed]/20 text-[#7c3aed]' : 'text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white'}"
						onclick={() => navigate(item.path)}
					>
						<span class="text-base">{item.icon}</span>
						<span class="flex-1 text-left">{item.label}</span>
						{#if item.path === '/messages' && unreadCount > 0}
							<span class="bg-[#7c3aed] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
								{unreadCount > 9 ? '9+' : unreadCount}
							</span>
						{/if}
					</button>
				{/each}
			</nav>
			<div class="p-2 border-t border-[#262626]">
				<button
					class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white transition-colors"
					onclick={logout}
				>
					<span class="text-base">🚪</span>
					Sign Out
				</button>
			</div>
		</aside>

		<!-- Mobile Sidebar Overlay -->
		{#if sidebar}
			<div class="fixed inset-0 z-40 md:hidden">
				<button class="absolute inset-0 bg-black/60" onclick={() => sidebarOpen.set(false)}></button>
				<aside class="absolute left-0 top-0 bottom-0 w-56 bg-[#111] border-r border-[#262626] flex flex-col">
					<div class="p-4 border-b border-[#262626]">
						<h1 class="text-lg font-bold text-[#7c3aed]">Erebus</h1>
					</div>
					<nav class="flex-1 p-2 space-y-1 overflow-y-auto">
						{#each navItems as item}
							<button
								class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors {isActive(item.path) ? 'bg-[#7c3aed]/20 text-[#7c3aed]' : 'text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white'}"
								onclick={() => navigate(item.path)}
							>
								<span class="text-base">{item.icon}</span>
								<span class="flex-1 text-left">{item.label}</span>
								{#if item.path === '/messages' && unreadCount > 0}
									<span class="bg-[#7c3aed] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
										{unreadCount > 9 ? '9+' : unreadCount}
									</span>
								{/if}
							</button>
						{/each}
					</nav>
				</aside>
			</div>
		{/if}

		<!-- Main Content -->
		<div class="flex-1 flex flex-col min-w-0">
			<!-- Mobile Header -->
			<header class="md:hidden flex items-center justify-between p-3 bg-[#111] border-b border-[#262626]">
				<button class="text-xl p-1" onclick={() => sidebarOpen.set(true)}>☰</button>
				<span class="text-sm font-bold text-[#7c3aed]">Erebus</span>
				<div class="w-8"></div>
			</header>

			<!-- Page Content -->
			<main class="flex-1 overflow-y-auto p-4 md:p-6">
				{@render children()}
			</main>
		</div>

		<!-- Mobile Bottom Nav -->
		<nav class="md:hidden fixed bottom-0 left-0 right-0 bg-[#111] border-t border-[#262626] flex justify-around py-2 z-30">
			{#each navItems.slice(0, 5) as item}
				<button
					class="relative flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors {isActive(item.path) ? 'text-[#7c3aed]' : 'text-[#a3a3a3]'}"
					onclick={() => navigate(item.path)}
				>
					<span class="text-lg">{item.icon}</span>
					{item.label}
					{#if item.path === '/messages' && unreadCount > 0}
						<span class="absolute -top-0.5 right-0 bg-[#7c3aed] text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
							{unreadCount > 9 ? '9+' : unreadCount}
						</span>
					{/if}
				</button>
			{/each}
		</nav>
	</div>
{/if}
