<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getProjects } from '$lib/api';
	import type { Project, ProjectStatus } from '$lib/types';

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let statusFilter = $state<'all' | ProjectStatus>('all');

	const statusColors: Record<ProjectStatus, string> = {
		active: 'bg-green-500/20 text-green-400 border-green-500/30',
		paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
		completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
		archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
	};

	let filtered = $derived(
		projects.filter((p) => {
			const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
			const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	onMount(async () => {
		try {
			projects = await getProjects();
		} catch (e: any) {
			error = e.message || 'Failed to load projects';
		} finally {
			loading = false;
		}
	});
</script>

<div class="min-h-full bg-[#0a0a0a]">
	<!-- Header -->
	<div class="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-bold text-white">Projects</h1>
	</div>

	<!-- Filters -->
	<div class="flex flex-col gap-3 mb-6 sm:flex-row">
		<input
			type="text"
			placeholder="Search projects..."
			bind:value={search}
			class="flex-1 px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#262626] text-white placeholder-[#525252] text-sm focus:outline-none focus:border-[#7c3aed] transition-colors"
		/>
		<select
			bind:value={statusFilter}
			class="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#262626] text-white text-sm focus:outline-none focus:border-[#7c3aed] transition-colors"
		>
			<option value="all">All Statuses</option>
			<option value="active">Active</option>
			<option value="paused">Paused</option>
			<option value="completed">Completed</option>
			<option value="archived">Archived</option>
		</select>
	</div>

	<!-- Loading -->
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
		</div>

	<!-- Error -->
	{:else if error}
		<div class="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
			{error}
		</div>

	<!-- Empty -->
	{:else if filtered.length === 0}
		<div class="text-center py-20 text-[#525252]">
			{#if projects.length === 0}
				<p class="text-lg">No projects yet</p>
			{:else}
				<p class="text-lg">No projects match your filters</p>
			{/if}
		</div>

	<!-- Grid -->
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filtered as project (project.id)}
				<button
					class="text-left p-4 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-[#7c3aed]/50 transition-all duration-200 cursor-pointer group"
					onclick={() => goto('/projects/' + project.id)}
				>
					<div class="flex items-start justify-between gap-3 mb-2">
						<h3 class="font-semibold text-white group-hover:text-[#7c3aed] transition-colors truncate">
							{project.name}
						</h3>
						<span
							class="shrink-0 px-2 py-0.5 text-xs rounded-full border {statusColors[project.status]}"
						>
							{project.status}
						</span>
					</div>

					{#if project.description}
						<p class="text-sm text-[#a3a3a3] mb-3 line-clamp-2">
							{project.description}
						</p>
					{/if}

					{#if project.isGroup}
						<div class="mt-2 flex items-center gap-1.5 text-xs text-[#7c3aed]/70">
							<span>Group</span>
							{#if project.subProjects}
								<span>({project.subProjects.length} sub-projects)</span>
							{/if}
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
