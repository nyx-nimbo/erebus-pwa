<script lang="ts">
	import { onMount } from 'svelte';
	import { getIdeas, createIdea, updateIdea } from '$lib/api';
	import type { Idea, IdeaStatus } from '$lib/types';

	let ideas = $state<Idea[]>([]);
	let loading = $state(true);
	let error = $state('');
	let expandedId = $state<string | null>(null);
	let showCreateModal = $state(false);
	let newTitle = $state('');
	let newDescription = $state('');
	let creating = $state(false);

	const columns: { status: IdeaStatus; label: string; color: string; bg: string; border: string }[] = [
		{ status: 'new', label: 'New', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
		{ status: 'researching', label: 'Researching', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
		{ status: 'researched', label: 'Researched', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/40' },
		{ status: 'developing', label: 'Developing', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
		{ status: 'paused', label: 'Paused', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/40' }
	];

	const statusLabels: Record<IdeaStatus, string> = {
		new: 'New',
		researching: 'Researching',
		researched: 'Researched',
		developing: 'Developing',
		paused: 'Paused'
	};

	function ideasForColumn(status: IdeaStatus): Idea[] {
		return ideas.filter((i) => i.status === status);
	}

	function truncate(text: string, max: number = 120): string {
		if (!text || text.length <= max) return text || '';
		return text.slice(0, max) + '...';
	}

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	async function loadIdeas() {
		loading = true;
		error = '';
		try {
			ideas = await getIdeas();
		} catch (e: any) {
			error = e.message || 'Failed to load ideas';
		} finally {
			loading = false;
		}
	}

	async function handleCreate() {
		if (!newTitle.trim()) return;
		creating = true;
		try {
			const idea = await createIdea({ title: newTitle.trim(), description: newDescription.trim(), status: 'new' });
			ideas = [...ideas, idea];
			newTitle = '';
			newDescription = '';
			showCreateModal = false;
		} catch (e: any) {
			error = e.message || 'Failed to create idea';
		} finally {
			creating = false;
		}
	}

	async function moveIdea(id: string, newStatus: IdeaStatus) {
		try {
			const updated = await updateIdea(id, { status: newStatus });
			ideas = ideas.map((i) => (i.id === id ? updated : i));
		} catch (e: any) {
			error = e.message || 'Failed to update idea';
		}
	}

	onMount(() => {
		loadIdeas();
	});
</script>

<div class="min-h-full bg-[#0a0a0a]">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-white">Ideas</h1>
			<p class="text-sm text-[#a3a3a3] mt-1">Track and develop your ideas</p>
		</div>
		<button
			class="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg transition-colors"
			onclick={() => (showCreateModal = true)}
		>
			+ New Idea
		</button>
	</div>

	<!-- Error Banner -->
	{#if error}
		<div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center justify-between">
			<span>{error}</span>
			<button class="text-red-400 hover:text-red-300 ml-2" onclick={() => (error = '')}>x</button>
		</div>
	{/if}

	<!-- Loading -->
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="text-[#a3a3a3]">Loading ideas...</div>
		</div>
	{:else}
		<!-- Kanban Board -->
		<div class="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
			{#each columns as col}
				{@const colIdeas = ideasForColumn(col.status)}
				<div class="flex-shrink-0 w-72 md:w-auto md:flex-1 md:min-w-[220px]">
					<!-- Column Header -->
					<div class="flex items-center gap-2 mb-3 px-1">
						<div class="w-2.5 h-2.5 rounded-full {col.bg} {col.border} border"></div>
						<h2 class="text-sm font-semibold {col.color}">{col.label}</h2>
						<span class="text-xs text-[#a3a3a3] ml-auto bg-[#1a1a1a] px-2 py-0.5 rounded-full">{colIdeas.length}</span>
					</div>

					<!-- Column Body -->
					<div class="space-y-3 min-h-[200px] p-2 rounded-lg bg-[#0f0f0f] border border-[#262626]">
						{#each colIdeas as idea (idea.id)}
							<!-- Card -->
							<button
								class="w-full text-left bg-[#1a1a1a] border border-[#262626] rounded-lg p-3 hover:border-[#7c3aed]/40 transition-colors cursor-pointer"
								onclick={() => toggleExpand(idea.id)}
							>
								<div class="flex items-start justify-between gap-2">
									<h3 class="text-sm font-medium text-white leading-snug">{idea.title}</h3>
									<span class="text-[10px] px-1.5 py-0.5 rounded {col.bg} {col.color} whitespace-nowrap shrink-0">
										{statusLabels[idea.status]}
									</span>
								</div>

								{#if expandedId !== idea.id}
									<p class="text-xs text-[#a3a3a3] mt-2 leading-relaxed">{truncate(idea.description)}</p>
								{/if}

								<!-- Expanded Content -->
								{#if expandedId === idea.id}
									<div class="mt-3 space-y-3 border-t border-[#262626] pt-3">
										<!-- Full Description -->
										{#if idea.description}
											<div>
												<h4 class="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide mb-1">Description</h4>
												<p class="text-xs text-[#d4d4d4] leading-relaxed whitespace-pre-wrap">{idea.description}</p>
											</div>
										{/if}

										<!-- Research -->
										{#if idea.research}
											<div>
												<h4 class="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide mb-1">Research</h4>
												<p class="text-xs text-[#d4d4d4] leading-relaxed whitespace-pre-wrap">{idea.research}</p>
											</div>
										{/if}

										<!-- Suggested Tasks -->
										{#if idea.suggested_tasks && idea.suggested_tasks.length > 0}
											<div>
												<h4 class="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide mb-1">Suggested Tasks</h4>
												<ul class="space-y-1">
													{#each idea.suggested_tasks as task}
														<li class="flex items-start gap-2 text-xs text-[#d4d4d4]">
															<span class="text-[#7c3aed] mt-0.5 shrink-0">-</span>
															<span>{task}</span>
														</li>
													{/each}
												</ul>
											</div>
										{/if}

										<!-- Move Status -->
										<div>
											<h4 class="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide mb-2">Move to</h4>
											<div class="flex flex-wrap gap-1.5">
												{#each columns as target}
													{#if target.status !== idea.status}
														<button
															class="text-[10px] px-2 py-1 rounded border {target.border} {target.color} hover:bg-white/5 transition-colors"
															onclick={(e) => { e.stopPropagation(); moveIdea(idea.id, target.status); }}
														>
															{target.label}
														</button>
													{/if}
												{/each}
											</div>
										</div>
									</div>
								{/if}
							</button>
						{:else}
							<div class="flex items-center justify-center py-8 text-xs text-[#525252]">
								No ideas
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Idea Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button class="absolute inset-0 bg-black/70" onclick={() => (showCreateModal = false)}></button>

		<!-- Modal -->
		<div class="relative w-full max-w-md bg-[#1a1a1a] border border-[#262626] rounded-xl p-6 shadow-2xl">
			<h2 class="text-lg font-bold text-white mb-4">New Idea</h2>

			<div class="space-y-4">
				<div>
					<label for="idea-title" class="block text-xs font-medium text-[#a3a3a3] mb-1.5">Title</label>
					<input
						id="idea-title"
						type="text"
						bind:value={newTitle}
						placeholder="What's the idea?"
						class="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-sm text-white placeholder-[#525252] focus:outline-none focus:border-[#7c3aed] transition-colors"
					/>
				</div>

				<div>
					<label for="idea-desc" class="block text-xs font-medium text-[#a3a3a3] mb-1.5">Description</label>
					<textarea
						id="idea-desc"
						bind:value={newDescription}
						placeholder="Describe the idea..."
						rows="4"
						class="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-sm text-white placeholder-[#525252] focus:outline-none focus:border-[#7c3aed] transition-colors resize-none"
					></textarea>
				</div>
			</div>

			<div class="flex gap-3 mt-6">
				<button
					class="flex-1 px-4 py-2 bg-[#262626] hover:bg-[#333] text-[#a3a3a3] text-sm rounded-lg transition-colors"
					onclick={() => (showCreateModal = false)}
				>
					Cancel
				</button>
				<button
					class="flex-1 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={handleCreate}
					disabled={!newTitle.trim() || creating}
				>
					{creating ? 'Creating...' : 'Create Idea'}
				</button>
			</div>
		</div>
	</div>
{/if}
