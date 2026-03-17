<script lang="ts">
	import { onMount, tick } from 'svelte';
	import {
		getChatSessions,
		createChatSession,
		deleteChatSession,
		getChatHistory,
		sendChat
	} from '$lib/api';
	import type { ChatMessage, ChatSession } from '$lib/types';

	let sessions: ChatSession[] = $state([]);
	let selectedKey: string | null = $state(null);
	let messages: ChatMessage[] = $state([]);
	let input: string = $state('');
	let loading: boolean = $state(false);
	let sessionsLoading: boolean = $state(true);
	let historyLoading: boolean = $state(false);
	let streaming: boolean = $state(false);
	let newSessionTitle: string = $state('');
	let showNewSession: boolean = $state(false);
	let messagesContainer: HTMLDivElement | undefined = $state(undefined);
	let abortStream: (() => void) | null = $state(null);

	onMount(() => {
		loadSessions();
	});

	async function loadSessions() {
		sessionsLoading = true;
		try {
			sessions = await getChatSessions();
			if (sessions.length > 0 && !selectedKey) {
				await selectSession(sessions[0].key);
			}
		} catch (e) {
			console.error('Failed to load sessions:', e);
		} finally {
			sessionsLoading = false;
		}
	}

	async function selectSession(key: string) {
		selectedKey = key;
		historyLoading = true;
		try {
			const session = await getChatHistory(key);
			messages = session.messages || [];
			await scrollToBottom();
		} catch (e) {
			console.error('Failed to load chat history:', e);
			messages = [];
		} finally {
			historyLoading = false;
		}
	}

	async function handleCreateSession() {
		const title = newSessionTitle.trim() || 'New Chat';
		try {
			const session = await createChatSession(title);
			sessions = [session, ...sessions];
			newSessionTitle = '';
			showNewSession = false;
			await selectSession(session.key);
		} catch (e) {
			console.error('Failed to create session:', e);
		}
	}

	async function handleDeleteSession(key: string) {
		try {
			await deleteChatSession(key);
			sessions = sessions.filter((s) => s.key !== key);
			if (selectedKey === key) {
				selectedKey = null;
				messages = [];
				if (sessions.length > 0) {
					await selectSession(sessions[0].key);
				}
			}
		} catch (e) {
			console.error('Failed to delete session:', e);
		}
	}

	async function scrollToBottom() {
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	async function handleSend() {
		if (!input.trim() || !selectedKey || streaming) return;

		const userMessage: ChatMessage = {
			role: 'user',
			content: input.trim()
		};

		messages = [...messages, userMessage];
		const currentInput = input;
		input = '';
		streaming = true;
		await scrollToBottom();

		const assistantMessage: ChatMessage = {
			role: 'assistant',
			content: ''
		};
		messages = [...messages, assistantMessage];

		abortStream = await sendChat(
			selectedKey,
			currentInput,
			async (data) => {
				const lastIndex = messages.length - 1;
				messages = messages.map((m, i) =>
					i === lastIndex ? { ...m, content: m.content + data } : m
				);
				await scrollToBottom();
			},
			() => {
				streaming = false;
				abortStream = null;
			},
			() => {
				streaming = false;
				abortStream = null;
				if (messages.length > 0 && messages[messages.length - 1].content === '') {
					messages = messages.map((m, i) =>
						i === messages.length - 1
							? { ...m, content: 'An error occurred while streaming the response.' }
							: m
					);
				}
			}
		);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function handleNewSessionKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleCreateSession();
		} else if (e.key === 'Escape') {
			showNewSession = false;
			newSessionTitle = '';
		}
	}

	function getSelectedSession(): ChatSession | undefined {
		return sessions.find((s) => s.key === selectedKey);
	}
</script>

<div class="flex h-full min-h-0 bg-[#0a0a0a]">
	<!-- Sessions Sidebar -->
	<div
		class="w-64 shrink-0 flex flex-col border-r border-[#262626] bg-[#0a0a0a] max-md:hidden"
	>
		<div class="flex items-center justify-between p-3 border-b border-[#262626]">
			<h2 class="text-sm font-semibold text-[#e5e5e5]">Sessions</h2>
			<button
				class="px-2 py-1 text-xs rounded bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors"
				onclick={() => (showNewSession = !showNewSession)}
			>
				+ New
			</button>
		</div>

		{#if showNewSession}
			<div class="p-2 border-b border-[#262626]">
				<input
					type="text"
					class="w-full px-2 py-1.5 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-[#e5e5e5] placeholder-[#a3a3a3] focus:outline-none focus:border-[#7c3aed]"
					placeholder="Session title..."
					bind:value={newSessionTitle}
					onkeydown={handleNewSessionKeydown}
				/>
				<div class="flex gap-1 mt-1.5">
					<button
						class="flex-1 px-2 py-1 text-xs rounded bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors"
						onclick={handleCreateSession}
					>
						Create
					</button>
					<button
						class="flex-1 px-2 py-1 text-xs rounded bg-[#1a1a1a] text-[#a3a3a3] border border-[#262626] hover:text-[#e5e5e5] transition-colors"
						onclick={() => {
							showNewSession = false;
							newSessionTitle = '';
						}}
					>
						Cancel
					</button>
				</div>
			</div>
		{/if}

		<div class="flex-1 overflow-y-auto p-2 space-y-1">
			{#if sessionsLoading}
				<div class="flex items-center justify-center py-8">
					<span class="text-sm text-[#a3a3a3]">Loading...</span>
				</div>
			{:else if sessions.length === 0}
				<div class="flex items-center justify-center py-8">
					<span class="text-sm text-[#a3a3a3]">No sessions yet</span>
				</div>
			{:else}
				{#each sessions as session (session.key)}
					<div
						class="group flex items-center gap-1 rounded-md transition-colors {selectedKey === session.key
							? 'bg-[#7c3aed]/20'
							: 'hover:bg-[#1a1a1a]'}"
					>
						<button
							class="flex-1 text-left px-3 py-2 text-sm truncate {selectedKey === session.key
								? 'text-[#7c3aed]'
								: 'text-[#a3a3a3] hover:text-[#e5e5e5]'}"
							onclick={() => selectSession(session.key)}
						>
							{session.title}
						</button>
						<button
							class="shrink-0 px-2 py-1 text-xs text-[#a3a3a3] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
							onclick={() => handleDeleteSession(session.key)}
							title="Delete session"
						>
							&times;
						</button>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Main Chat Area -->
	<div class="flex-1 flex flex-col min-w-0">
		<!-- Mobile session selector -->
		<div class="md:hidden flex items-center gap-2 p-2 border-b border-[#262626]">
			<select
				class="flex-1 px-2 py-1.5 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed]"
				value={selectedKey}
				onchange={(e) => {
					const target = e.target as HTMLSelectElement;
					if (target.value) selectSession(target.value);
				}}
			>
				{#if sessions.length === 0}
					<option value="">No sessions</option>
				{/if}
				{#each sessions as session (session.key)}
					<option value={session.key}>{session.title}</option>
				{/each}
			</select>
			<button
				class="px-2 py-1.5 text-xs rounded bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors shrink-0"
				onclick={() => (showNewSession = !showNewSession)}
			>
				+
			</button>
		</div>

		<!-- Chat Header -->
		{#if selectedKey}
			<div class="px-4 py-2.5 border-b border-[#262626] bg-[#0a0a0a]">
				<h3 class="text-sm font-medium text-[#e5e5e5] truncate">
					{getSelectedSession()?.title || 'Chat'}
				</h3>
			</div>
		{/if}

		<!-- Messages -->
		<div class="flex-1 overflow-y-auto p-4 space-y-4" bind:this={messagesContainer}>
			{#if !selectedKey}
				<div class="flex items-center justify-center h-full">
					<p class="text-[#a3a3a3] text-sm">
						{sessions.length === 0 ? 'Create a session to start chatting' : 'Select a session'}
					</p>
				</div>
			{:else if historyLoading}
				<div class="flex items-center justify-center h-full">
					<p class="text-[#a3a3a3] text-sm">Loading messages...</p>
				</div>
			{:else if messages.length === 0}
				<div class="flex items-center justify-center h-full">
					<p class="text-[#a3a3a3] text-sm">No messages yet. Start the conversation!</p>
				</div>
			{:else}
				{#each messages as message, i (i)}
					<div
						class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}"
					>
						<div
							class="max-w-[80%] px-4 py-2.5 rounded-lg text-sm {message.role === 'user'
								? 'bg-[#7c3aed] text-white'
								: 'bg-[#1a1a1a] text-[#e5e5e5] border border-[#262626]'}"
						>
							<pre class="whitespace-pre-wrap break-words font-sans m-0">{message.content}{#if streaming && i === messages.length - 1 && message.role === 'assistant'}<span class="inline-block w-1.5 h-4 bg-[#7c3aed] animate-pulse ml-0.5 align-middle"></span>{/if}</pre>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Input Area -->
		{#if selectedKey}
			<div class="p-3 border-t border-[#262626] bg-[#0a0a0a]">
				<div class="flex gap-2 items-end">
					<textarea
						class="flex-1 px-3 py-2 text-sm bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-[#a3a3a3] resize-none focus:outline-none focus:border-[#7c3aed] transition-colors"
						rows="1"
						placeholder="Type a message..."
						bind:value={input}
						onkeydown={handleKeydown}
						disabled={streaming}
					></textarea>
					<button
						class="px-4 py-2 text-sm rounded-lg font-medium transition-colors {streaming || !input.trim()
							? 'bg-[#1a1a1a] text-[#a3a3a3] border border-[#262626] cursor-not-allowed'
							: 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]'}"
						onclick={handleSend}
						disabled={streaming || !input.trim()}
					>
						{streaming ? 'Sending...' : 'Send'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
