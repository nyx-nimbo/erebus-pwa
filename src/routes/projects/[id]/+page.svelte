<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getProject, getTasks, updateTask } from '$lib/api';
	import type { Project, Task, TaskStatus } from '$lib/types';

	let project = $state<Project | null>(null);
	let tasks = $state<Task[]>([]);
	let loading = $state(true);
	let error = $state('');

	const statusColors: Record<string, string> = {
		active: 'bg-green-500/20 text-green-400 border-green-500/30',
		paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
		completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
		archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
	};

	const priorityColors: Record<number, string> = {
		1: 'text-[#525252]',
		2: 'text-blue-400',
		3: 'text-yellow-400',
		4: 'text-orange-400',
		5: 'text-red-400'
	};

	interface KanbanColumn {
		key: TaskStatus;
		label: string;
		color: string;
	}

	const columns: KanbanColumn[] = [
		{ key: 'todo', label: 'Todo', color: 'border-[#525252]' },
		{ key: 'in_progress', label: 'In Progress', color: 'border-[#7c3aed]' },
		{ key: 'in_review', label: 'In Review', color: 'border-yellow-500' },
		{ key: 'done', label: 'Done', color: 'border-green-500' }
	];

	function tasksByStatus(status: TaskStatus): Task[] {
		return tasks.filter((t) => t.status === status);
	}

	onMount(async () => {
		const id = $page.params.id;
		try {
			const [proj, projTasks] = await Promise.all([
				getProject(id),
				getTasks(id)
			]);
			project = proj;
			tasks = projTasks;
		} catch (e: any) {
			error = e.message || 'Failed to load project';
		} finally {
			loading = false;
		}
	});
</script>

<div class="min-h-full bg-[#0a0a0a]">
	<!-- Back button -->
	<button
		class="flex items-center gap-2 text-sm text-[#a3a3a3] hover:text-white transition-colors mb-4"
		onclick={() => goto('/projects')}
	>
		<span class="text-lg leading-none">&larr;</span>
		<span>Back to Projects</span>
	</button>

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

	{:else if project}
		<!-- Project Header -->
		<div class="p-5 rounded-lg bg-[#1a1a1a] border border-[#262626] mb-6">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex-1 min-w-0">
					<h1 class="text-2xl font-bold text-white mb-1">{project.name}</h1>
					{#if project.description}
						<p class="text-[#a3a3a3] text-sm mb-3">{project.description}</p>
					{/if}
					<div class="flex flex-wrap items-center gap-3 text-sm">
						<span
							class="px-2.5 py-0.5 rounded-full border text-xs {statusColors[project.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}"
						>
							{project.status}
						</span>
						{#if project.client_name}
							<span class="text-[#525252]">
								Client: <span class="text-[#a3a3a3]">{project.client_name}</span>
							</span>
						{/if}
						{#if project.is_group}
							<span class="text-[#7c3aed]/70 text-xs">Group Project</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Sub-Projects -->
		{#if project.is_group && project.sub_projects && project.sub_projects.length > 0}
			<div class="mb-6">
				<h2 class="text-lg font-semibold text-white mb-3">Sub-Projects</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each project.sub_projects as sub (sub.id)}
						<button
							class="text-left p-3 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-[#7c3aed]/50 transition-all cursor-pointer"
							onclick={() => goto('/projects/' + sub.id)}
						>
							<div class="flex items-center justify-between gap-2">
								<span class="text-sm font-medium text-white truncate">{sub.name}</span>
								<span
									class="shrink-0 px-2 py-0.5 text-xs rounded-full border {statusColors[sub.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}"
								>
									{sub.status}
								</span>
							</div>
							{#if sub.description}
								<p class="text-xs text-[#a3a3a3] mt-1 line-clamp-1">{sub.description}</p>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Kanban Board -->
		<div class="mb-6">
			<h2 class="text-lg font-semibold text-white mb-3">Tasks</h2>
			{#if tasks.length === 0}
				<p class="text-[#525252] text-sm">No tasks for this project.</p>
			{:else}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{#each columns as column (column.key)}
						{@const columnTasks = tasksByStatus(column.key)}
						<div class="flex flex-col">
							<div class="flex items-center justify-between mb-2 px-1">
								<div class="flex items-center gap-2">
									<div class="w-2 h-2 rounded-full {column.color} border-2"></div>
									<h3 class="text-sm font-medium text-[#a3a3a3]">{column.label}</h3>
								</div>
								<span class="text-xs text-[#525252]">{columnTasks.length}</span>
							</div>
							<div class="flex-1 rounded-lg bg-[#111] border border-[#262626] p-2 space-y-2 min-h-[120px]">
								{#each columnTasks as task (task.id)}
									<div class="p-3 rounded-md bg-[#1a1a1a] border border-[#262626] hover:border-[#7c3aed]/30 transition-colors">
										<p class="text-sm font-medium text-white mb-1">{task.title}</p>
										{#if task.description}
											<p class="text-xs text-[#a3a3a3] line-clamp-2 mb-2">{task.description}</p>
										{/if}
										<div class="flex items-center justify-between">
											{#if task.assigned_to}
												<span class="text-xs text-[#525252] truncate max-w-[120px]">{task.assigned_to}</span>
											{:else}
												<span></span>
											{/if}
											{#if task.priority}
												<span class="text-xs {priorityColors[task.priority] || 'text-[#525252]'}">
													P{task.priority}
												</span>
											{/if}
										</div>
									</div>
								{/each}
								{#if columnTasks.length === 0}
									<div class="flex items-center justify-center h-full min-h-[80px] text-xs text-[#333]">
										No tasks
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Ports Section -->
		{#if project.ports && project.ports.length > 0}
			<div class="mb-6">
				<h2 class="text-lg font-semibold text-white mb-3">Ports</h2>
				<div class="rounded-lg bg-[#1a1a1a] border border-[#262626] overflow-hidden">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-[#262626]">
								<th class="text-left px-4 py-2.5 text-[#525252] font-medium">Port</th>
								<th class="text-left px-4 py-2.5 text-[#525252] font-medium">Description</th>
							</tr>
						</thead>
						<tbody>
							{#each project.ports as port}
								<tr class="border-b border-[#262626] last:border-b-0">
									<td class="px-4 py-2.5 text-[#7c3aed] font-mono">{port.port}</td>
									<td class="px-4 py-2.5 text-[#a3a3a3]">{port.description}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Env Files Section -->
		{#if project.env_files && project.env_files.length > 0}
			<div class="mb-6">
				<h2 class="text-lg font-semibold text-white mb-3">Environment Files</h2>
				<div class="space-y-3">
					{#each project.env_files as envFile}
						<div class="rounded-lg bg-[#1a1a1a] border border-[#262626] overflow-hidden">
							<div class="px-4 py-2.5 border-b border-[#262626] flex items-center gap-2">
								<span class="text-sm font-medium text-[#a3a3a3]">{envFile.name}</span>
							</div>
							<pre class="px-4 py-3 text-xs text-[#a3a3a3] font-mono overflow-x-auto whitespace-pre">{envFile.content}</pre>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
