<script lang="ts">
	import { onMount } from 'svelte';
	import { getClients, getProjects, getTasks, getIdeas, getHealth } from '$lib/api';
	import type { Client, Project, Task, Idea, HealthStatus } from '$lib/types';

	let clients = $state<Client[]>([]);
	let projects = $state<Project[]>([]);
	let tasks = $state<Task[]>([]);
	let ideas = $state<Idea[]>([]);
	let health = $state<HealthStatus | null>(null);

	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const [c, p, t, i, h] = await Promise.all([
				getClients(),
				getProjects(),
				getTasks(),
				getIdeas(),
				getHealth()
			]);
			clients = c;
			projects = p;
			tasks = t;
			ideas = i;
			health = h;
		} catch (e: any) {
			error = e.message || 'Failed to load dashboard data';
		} finally {
			loading = false;
		}
	});

	const stats = $derived([
		{ label: 'Clients', value: clients.length, icon: '👥', accent: '#7c3aed' },
		{ label: 'Projects', value: projects.length, icon: '📁', accent: '#2563eb' },
		{ label: 'Tasks', value: tasks.length, icon: '✓', accent: '#059669' },
		{ label: 'Ideas', value: ideas.length, icon: '💡', accent: '#d97706' }
	]);

	const activeTasks = $derived(tasks.filter((t) => t.status === 'in_progress'));
	const todoTasks = $derived(tasks.filter((t) => t.status === 'todo'));
	const activeProjects = $derived(projects.filter((p) => p.status === 'active'));
</script>

{#if loading}
	<div class="flex items-center justify-center h-64">
		<div class="text-[#a3a3a3] text-sm">Loading dashboard...</div>
	</div>
{:else if error}
	<div class="flex items-center justify-center h-64">
		<div class="card max-w-md w-full text-center">
			<p class="text-red-400 text-sm mb-3">{error}</p>
			<button class="btn-primary" onclick={() => location.reload()}>Retry</button>
		</div>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Header -->
		<div>
			<h1 class="text-2xl font-bold text-[#e5e5e5]">Dashboard</h1>
			<p class="text-sm text-[#a3a3a3] mt-1">Overview of your workspace</p>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			{#each stats as stat}
				<div class="card flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="text-[#a3a3a3] text-xs font-medium uppercase tracking-wide">{stat.label}</span>
						<span class="text-lg">{stat.icon}</span>
					</div>
					<span class="text-3xl font-bold" style="color: {stat.accent}">{stat.value}</span>
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Task Summary -->
			<div class="card lg:col-span-2">
				<h2 class="text-sm font-semibold text-[#e5e5e5] mb-3">Task Summary</h2>
				<div class="space-y-2">
					<div class="flex items-center justify-between text-sm">
						<span class="text-[#a3a3a3]">In Progress</span>
						<span class="badge bg-blue-500/20 text-blue-400">{activeTasks.length}</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-[#a3a3a3]">To Do</span>
						<span class="badge bg-yellow-500/20 text-yellow-400">{todoTasks.length}</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-[#a3a3a3]">Active Projects</span>
						<span class="badge bg-green-500/20 text-green-400">{activeProjects.length}</span>
					</div>
				</div>

				{#if activeTasks.length > 0}
					<div class="mt-4 pt-3 border-t border-[#262626]">
						<h3 class="text-xs font-medium text-[#a3a3a3] uppercase tracking-wide mb-2">Current Tasks</h3>
						<div class="space-y-2">
							{#each activeTasks.slice(0, 5) as task}
								<div class="flex items-center gap-2 text-sm">
									<span class="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
									<span class="text-[#e5e5e5] truncate">{task.title}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- System Health -->
			<div class="card">
				<h2 class="text-sm font-semibold text-[#e5e5e5] mb-3">System Health</h2>
				{#if health}
					<div class="space-y-3">
						<div class="flex items-center gap-2">
							<span
								class="w-2.5 h-2.5 rounded-full {health.status === 'ok' || health.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'}"
							></span>
							<span class="text-sm text-[#e5e5e5] capitalize">{health.status}</span>
						</div>
						{#if health.database}
							<div class="flex items-center justify-between text-sm">
								<span class="text-[#a3a3a3]">Database</span>
								<span class="text-[#e5e5e5] capitalize">{health.database}</span>
							</div>
						{/if}
						{#if health.service}
							<div class="flex items-center justify-between text-sm">
								<span class="text-[#a3a3a3]">Service</span>
								<span class="text-[#e5e5e5]">{health.service}</span>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-[#a3a3a3]">Unable to fetch health status</p>
				{/if}
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="card">
			<h2 class="text-sm font-semibold text-[#e5e5e5] mb-3">Recent Activity</h2>
			<div class="space-y-3">
				{#if tasks.length > 0 || projects.length > 0}
					{#each tasks.slice(0, 5) as task}
						<div class="flex items-start gap-3 text-sm">
							<span class="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-1.5 shrink-0"></span>
							<div class="min-w-0">
								<p class="text-[#e5e5e5] truncate">{task.title}</p>
								<p class="text-xs text-[#a3a3a3]">
									{task.status.replace('_', ' ')} &middot; {new Date(task.updatedAt).toLocaleDateString()}
								</p>
							</div>
						</div>
					{/each}
					{#if tasks.length === 0}
						<p class="text-sm text-[#a3a3a3]">No recent activity to show</p>
					{/if}
				{:else}
					<p class="text-sm text-[#a3a3a3]">No recent activity to show</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
