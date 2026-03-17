<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getMembers } from '$lib/api';
	import type { Member } from '$lib/types';

	let members = $state<Member[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let filterType = $state<'all' | 'user' | 'agent'>('all');

	let filtered = $derived(
		members
			.filter((m) => {
				if (filterType !== 'all' && m.type !== filterType) return false;
				const q = search.toLowerCase();
				return (
					m.name.toLowerCase().includes(q) ||
					(m.email && m.email.toLowerCase().includes(q))
				);
			})
			.sort((a, b) => {
				if (a.status === 'online' && b.status !== 'online') return -1;
				if (b.status === 'online' && a.status !== 'online') return 1;
				return a.name.localeCompare(b.name);
			})
	);

	onMount(() => {
		loadMembers();
	});

	async function loadMembers() {
		loading = true;
		error = '';
		try {
			members = await getMembers();
		} catch (e: any) {
			error = e.message || 'Failed to load members';
		} finally {
			loading = false;
		}
	}

	function openChat(member: Member) {
		const id = member.email || member.id;
		goto(`/messages?with=${encodeURIComponent(id)}`);
	}
</script>

<div class="max-w-5xl mx-auto">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
		<h1 class="text-2xl font-bold text-[#e5e5e5]">Members</h1>
		<div class="flex gap-2">
			<button
				class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors {filterType === 'all' ? 'bg-[#7c3aed] text-white' : 'bg-[#1a1a1a] text-[#a3a3a3] border border-[#262626] hover:text-white'}"
				onclick={() => (filterType = 'all')}
			>
				All
			</button>
			<button
				class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors {filterType === 'user' ? 'bg-[#7c3aed] text-white' : 'bg-[#1a1a1a] text-[#a3a3a3] border border-[#262626] hover:text-white'}"
				onclick={() => (filterType = 'user')}
			>
				Users
			</button>
			<button
				class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors {filterType === 'agent' ? 'bg-[#7c3aed] text-white' : 'bg-[#1a1a1a] text-[#a3a3a3] border border-[#262626] hover:text-white'}"
				onclick={() => (filterType = 'agent')}
			>
				Agents
			</button>
		</div>
	</div>

	<!-- Search -->
	<div class="mb-6">
		<input
			type="text"
			placeholder="Search members..."
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
			{#if search || filterType !== 'all'}
				No members match your filters.
			{:else}
				No members found.
			{/if}
		</div>
	{:else}
		<!-- Members Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filtered as member (member.id)}
				<button
					class="bg-[#1a1a1a] border border-[#262626] rounded-lg p-4 text-left transition-colors hover:border-[#7c3aed]/40 focus:outline-none focus:border-[#7c3aed]"
					onclick={() => openChat(member)}
				>
					<div class="flex items-center gap-3">
						<!-- Avatar -->
						{#if member.picture}
							<img
								src={member.picture}
								alt={member.name}
								class="w-10 h-10 rounded-full object-cover shrink-0"
							/>
						{:else}
							<div class="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center text-[#a3a3a3] text-sm font-medium shrink-0">
								{member.name.charAt(0).toUpperCase()}
							</div>
						{/if}

						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="text-[#e5e5e5] font-medium truncate">{member.name}</span>
								<!-- Status dot -->
								<span
									class="w-2 h-2 rounded-full shrink-0 {member.status === 'online' ? 'bg-green-500' : 'bg-[#525252]'}"
								></span>
							</div>

							<div class="flex items-center gap-2 mt-1">
								<!-- Type badge -->
								<span
									class="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded {member.type === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#7c3aed]/20 text-[#7c3aed]'}"
								>
									{member.type}
								</span>
								{#if member.email}
									<span class="text-[#a3a3a3] text-xs truncate">{member.email}</span>
								{/if}
							</div>
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>
