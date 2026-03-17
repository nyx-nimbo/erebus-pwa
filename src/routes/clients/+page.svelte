<script lang="ts">
	import { onMount } from 'svelte';
	import { getClients, createClient, deleteClient, getBusinessUnits } from '$lib/api';
	import type { Client, BusinessUnit } from '$lib/types';

	let clients = $state<Client[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let expandedId = $state<string | null>(null);
	let clientUnits = $state<Record<string, BusinessUnit[]>>({});
	let loadingUnits = $state<string | null>(null);

	// Create modal
	let showCreateModal = $state(false);
	let newClientName = $state('');
	let creating = $state(false);

	// Delete confirmation
	let deleteTarget = $state<Client | null>(null);
	let deleting = $state(false);

	let filtered = $derived(
		clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
	);

	onMount(() => {
		loadClients();
	});

	async function loadClients() {
		loading = true;
		error = '';
		try {
			clients = await getClients();
		} catch (e: any) {
			error = e.message || 'Failed to load clients';
		} finally {
			loading = false;
		}
	}

	async function toggleExpand(id: string) {
		if (expandedId === id) {
			expandedId = null;
			return;
		}
		expandedId = id;
		if (!clientUnits[id]) {
			loadingUnits = id;
			try {
				const units = await getBusinessUnits(id);
				clientUnits = { ...clientUnits, [id]: units };
			} catch (e) {
				console.error('Failed to load business units:', e);
				clientUnits = { ...clientUnits, [id]: [] };
			} finally {
				loadingUnits = null;
			}
		}
	}

	function openCreateModal() {
		newClientName = '';
		showCreateModal = true;
	}

	function closeCreateModal() {
		showCreateModal = false;
		newClientName = '';
	}

	async function handleCreate() {
		if (!newClientName.trim()) return;
		creating = true;
		try {
			await createClient({ name: newClientName.trim() });
			closeCreateModal();
			await loadClients();
		} catch (e: any) {
			error = e.message || 'Failed to create client';
		} finally {
			creating = false;
		}
	}

	function confirmDelete(client: Client) {
		deleteTarget = client;
	}

	function cancelDelete() {
		deleteTarget = null;
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		deleting = true;
		const targetId = deleteTarget.id;
		try {
			await deleteClient(targetId);
			deleteTarget = null;
			if (expandedId === targetId) expandedId = null;
			await loadClients();
		} catch (e: any) {
			error = e.message || 'Failed to delete client';
		} finally {
			deleting = false;
		}
	}

	function handleCreateKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleCreate();
		if (e.key === 'Escape') closeCreateModal();
	}
</script>

<div class="max-w-5xl mx-auto">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
		<h1 class="text-2xl font-bold text-[#e5e5e5]">Clients</h1>
		<button
			class="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg transition-colors"
			onclick={openCreateModal}
		>
			+ New Client
		</button>
	</div>

	<!-- Search -->
	<div class="mb-6">
		<input
			type="text"
			placeholder="Search clients..."
			bind:value={search}
			class="w-full sm:w-80 px-4 py-2 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-[#a3a3a3] text-sm focus:outline-none focus:border-[#7c3aed] transition-colors"
		/>
	</div>

	<!-- Error -->
	{#if error}
		<div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
			{error}
			<button class="ml-2 underline" onclick={() => (error = '')}>dismiss</button>
		</div>
	{/if}

	<!-- Loading -->
	{#if loading}
		<div class="flex justify-center py-12">
			<div class="w-6 h-6 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if filtered.length === 0}
		<div class="text-center py-12 text-[#a3a3a3] text-sm">
			{#if search}
				No clients match "{search}"
			{:else}
				No clients yet. Create one to get started.
			{/if}
		</div>
	{:else}
		<!-- Client Cards Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filtered as client (client.id)}
				<div class="bg-[#1a1a1a] border border-[#262626] rounded-lg overflow-hidden transition-colors hover:border-[#7c3aed]/40">
					<!-- Card Header -->
					<button
						class="w-full text-left p-4 focus:outline-none"
						onclick={() => toggleExpand(client.id)}
					>
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<h3 class="text-[#e5e5e5] font-medium truncate">{client.name}</h3>
								{#if client.status}
									<p class="text-[#a3a3a3] text-xs mt-1 capitalize">{client.status}</p>
								{/if}
							</div>
							<span
								class="text-[#a3a3a3] text-sm ml-2 transition-transform {expandedId === client.id ? 'rotate-180' : ''}"
							>
								&#9662;
							</span>
						</div>
					</button>

					<!-- Expanded: Business Units -->
					{#if expandedId === client.id}
						<div class="border-t border-[#262626] px-4 py-3">
							{#if loadingUnits === client.id}
								<div class="flex items-center justify-center py-4">
									<div class="w-4 h-4 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
								</div>
							{:else if clientUnits[client.id] && clientUnits[client.id].length > 0}
								<p class="text-[#a3a3a3] text-xs uppercase tracking-wide mb-2">Business Units</p>
								<ul class="space-y-1">
									{#each clientUnits[client.id] as bu}
										<li class="text-[#e5e5e5] text-sm py-1 px-2 bg-[#111] rounded">
											{bu.name}
										</li>
									{/each}
								</ul>
							{:else}
								<p class="text-[#a3a3a3] text-xs italic">No business units</p>
							{/if}

							<div class="mt-3 pt-3 border-t border-[#262626]">
								<button
									class="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
									onclick={() => confirmDelete(client)}
								>
									Delete Client
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Client Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<button class="absolute inset-0 bg-black/60" onclick={closeCreateModal}></button>
		<div class="relative bg-[#1a1a1a] border border-[#262626] rounded-lg w-full max-w-md mx-4 p-6">
			<h2 class="text-lg font-bold text-[#e5e5e5] mb-4">New Client</h2>
			<input
				type="text"
				placeholder="Client name"
				bind:value={newClientName}
				onkeydown={handleCreateKeydown}
				class="w-full px-4 py-2 bg-[#111] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-[#a3a3a3] text-sm focus:outline-none focus:border-[#7c3aed] transition-colors"
			/>
			<div class="flex justify-end gap-3 mt-6">
				<button
					class="px-4 py-2 text-sm text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
					onclick={closeCreateModal}
				>
					Cancel
				</button>
				<button
					class="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
					disabled={!newClientName.trim() || creating}
					onclick={handleCreate}
				>
					{creating ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteTarget}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<button class="absolute inset-0 bg-black/60" onclick={cancelDelete}></button>
		<div class="relative bg-[#1a1a1a] border border-[#262626] rounded-lg w-full max-w-sm mx-4 p-6">
			<h2 class="text-lg font-bold text-[#e5e5e5] mb-2">Delete Client</h2>
			<p class="text-[#a3a3a3] text-sm mb-6">
				Are you sure you want to delete <span class="text-[#e5e5e5] font-medium">{deleteTarget.name}</span>? This action cannot be undone.
			</p>
			<div class="flex justify-end gap-3">
				<button
					class="px-4 py-2 text-sm text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
					onclick={cancelDelete}
				>
					Cancel
				</button>
				<button
					class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
					disabled={deleting}
					onclick={handleDelete}
				>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
