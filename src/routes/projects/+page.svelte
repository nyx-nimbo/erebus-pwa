<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getTopLevelProjects, getSubProjects } from '$lib/api';
	import type { Project, ProjectStatus } from '$lib/types';

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let statusFilter = $state<'all' | ProjectStatus>('all');

	// Track expanded groups and their loaded sub-projects
	let expandedGroups = $state<Set<string>>(new Set());
	let subProjectsMap = $state<Record<string, Project[]>>({});
	let loadingGroups = $state<Set<string>>(new Set());
	let subProjectCounts = $state<Record<string, number>>({});

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
			projects = await getTopLevelProjects();
			// Pre-fetch sub-project counts for groups
			const groups = projects.filter((p) => p.isGroup);
			await Promise.all(
				groups.map(async (g) => {
					try {
						const subs = await getSubProjects(g.id);
						subProjectCounts[g.id] = subs.length;
					} catch {
						subProjectCounts[g.id] = 0;
					}
				})
			);
		} catch (e: any) {
			error = e.message || 'Failed to load projects';
		} finally {
			loading = false;
		}
	});

	async function toggleGroup(groupId: string) {
		if (expandedGroups.has(groupId)) {
			const next = new Set(expandedGroups);
			next.delete(groupId);
			expandedGroups = next;
			return;
		}

		// Load sub-projects if not cached
		if (!subProjectsMap[groupId]) {
			const nextLoading = new Set(loadingGroups);
			nextLoading.add(groupId);
			loadingGroups = nextLoading;
			try {
				const subs = await getSubProjects(groupId);
				subProjectsMap = { ...subProjectsMap, [groupId]: subs };
				subProjectCounts = { ...subProjectCounts, [groupId]: subs.length };
			} catch {
				subProjectsMap = { ...subProjectsMap, [groupId]: [] };
			} finally {
				const done = new Set(loadingGroups);
				done.delete(groupId);
				loadingGroups = done;
			}
		}

		const next = new Set(expandedGroups);
		next.add(groupId);
		expandedGroups = next;
	}

	function filteredSubProjects(groupId: string): Project[] {
		const subs = subProjectsMap[groupId] || [];
		return subs.filter((p) => {
			const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
			const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	}
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

	<!-- Project List -->
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filtered as project (project.id)}
				{#if project.isGroup}
					<!-- Group Card -->
					<div class="col-span-1 sm:col-span-2 lg:col-span-3">
						<button
							class="w-full text-left p-4 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-[#7c3aed]/50 transition-all duration-200 cursor-pointer group"
							onclick={() => toggleGroup(project.id)}
						>
							<div class="flex items-start justify-between gap-3 mb-1">
								<div class="flex items-center gap-2">
									<span class="text-[#7c3aed] transition-transform duration-200 {expandedGroups.has(project.id) ? 'rotate-90' : ''}">
										<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
											<path d="M6 3l5 5-5 5V3z"/>
										</svg>
									</span>
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
									</svg>
									<h3 class="font-semibold text-white group-hover:text-[#7c3aed] transition-colors">
										{project.name}
									</h3>
								</div>
								<div class="flex items-center gap-2">
									<span class="px-2 py-0.5 text-xs rounded-full bg-[#7c3aed]/15 text-[#7c3aed] border border-[#7c3aed]/30">
										{subProjectCounts[project.id] ?? '...'} sub-projects
									</span>
									<span
										class="shrink-0 px-2 py-0.5 text-xs rounded-full border {statusColors[project.status]}"
									>
										{project.status}
									</span>
								</div>
							</div>

							{#if project.description}
								<p class="text-sm text-[#a3a3a3] ml-9 line-clamp-1">
									{project.description}
								</p>
							{/if}
						</button>

						<!-- Expanded Sub-Projects -->
						{#if expandedGroups.has(project.id)}
							<div class="mt-2 ml-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{#if loadingGroups.has(project.id)}
									<div class="col-span-full flex items-center justify-center py-6">
										<div class="w-5 h-5 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
									</div>
								{:else if filteredSubProjects(project.id).length === 0}
									<div class="col-span-full py-4 text-center text-[#525252] text-sm">
										No sub-projects{statusFilter !== 'all' || search ? ' match your filters' : ''}
									</div>
								{:else}
									{#each filteredSubProjects(project.id) as sub (sub.id)}
										<button
											class="text-left p-3 rounded-lg bg-[#141414] border border-[#1f1f1f] hover:border-[#7c3aed]/40 transition-all duration-200 cursor-pointer group/sub"
											onclick={() => goto('/projects/' + sub.id)}
										>
											<div class="flex items-start justify-between gap-2 mb-1">
												<h4 class="font-medium text-sm text-white group-hover/sub:text-[#7c3aed] transition-colors truncate">
													{sub.name}
												</h4>
												<span
													class="shrink-0 px-1.5 py-0.5 text-[10px] rounded-full border {statusColors[sub.status]}"
												>
													{sub.status}
												</span>
											</div>
											{#if sub.description}
												<p class="text-xs text-[#a3a3a3] line-clamp-2">{sub.description}</p>
											{/if}
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{:else}
					<!-- Regular Project Card -->
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
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>
