<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		getConversations,
		getConversation,
		sendMessage,
		markRead,
		getMembers
	} from '$lib/api';
	import type { Conversation, Message, Member } from '$lib/types';

	let conversations = $state<Conversation[]>([]);
	let messages = $state<Message[]>([]);
	let members = $state<Member[]>([]);
	let selectedId = $state<string | null>(null);
	let selectedName = $state('');
	let messageInput = $state('');
	let loading = $state(true);
	let loadingMessages = $state(false);
	let sending = $state(false);
	let error = $state('');
	let showNewMessage = $state(false);
	let search = $state('');
	let messagesEnd: HTMLDivElement | undefined = $state();

	let filteredConversations = $derived(
		conversations
			.filter((c) => c.memberName.toLowerCase().includes(search.toLowerCase()))
			.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
	);

	let filteredMembers = $derived(
		members.filter(
			(m) =>
				(m.name.toLowerCase().includes(search.toLowerCase()) ||
					(m.email && m.email.toLowerCase().includes(search.toLowerCase()))) &&
				!conversations.some((c) => c.memberId === (m.email || m.id))
		)
	);

	onMount(() => {
		loadConversations();
		loadMembers();

		// Check URL for ?with= param
		const withId = $page.url.searchParams.get('with');
		if (withId) {
			selectConversation(withId, '');
		}
	});

	async function loadConversations() {
		loading = true;
		error = '';
		try {
			conversations = await getConversations();
			// If we have a selected ID from URL but no name, resolve it
			if (selectedId && !selectedName) {
				const conv = conversations.find((c) => c.memberId === selectedId);
				if (conv) selectedName = conv.memberName;
			}
		} catch (e: any) {
			error = e.message || 'Failed to load conversations';
		} finally {
			loading = false;
		}
	}

	async function loadMembers() {
		try {
			members = await getMembers();
			// Resolve name from URL param if needed
			if (selectedId && !selectedName) {
				const member = members.find((m) => m.email === selectedId || m.id === selectedId);
				if (member) selectedName = member.name;
			}
		} catch {
			// Non-critical
		}
	}

	async function selectConversation(id: string, name: string) {
		selectedId = id;
		selectedName = name;
		showNewMessage = false;
		loadingMessages = true;
		try {
			messages = await getConversation(id);
			// Mark unread messages as read
			for (const msg of messages) {
				if (!msg.read && msg.fromId === id) {
					markRead(msg.id).catch(() => {});
				}
			}
			// Update unread count in conversation list
			const conv = conversations.find((c) => c.memberId === id);
			if (conv) conv.unreadCount = 0;
			scrollToBottom();
		} catch (e: any) {
			error = e.message || 'Failed to load messages';
		} finally {
			loadingMessages = false;
		}
	}

	async function handleSend() {
		if (!messageInput.trim() || !selectedId || sending) return;
		sending = true;
		const content = messageInput.trim();
		messageInput = '';
		try {
			const msg = await sendMessage(selectedId, content);
			messages = [...messages, msg];
			scrollToBottom();
			// Refresh conversation list
			loadConversations();
		} catch (e: any) {
			error = e.message || 'Failed to send message';
			messageInput = content;
		} finally {
			sending = false;
		}
	}

	function startNewConversation(member: Member) {
		const id = member.email || member.id;
		selectConversation(id, member.name);
	}

	function scrollToBottom() {
		setTimeout(() => {
			messagesEnd?.scrollIntoView({ behavior: 'smooth' });
		}, 50);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function formatTime(dateStr: string): string {
		const d = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays === 0) {
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return d.toLocaleDateString([], { weekday: 'short' });
		}
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}
</script>

<div class="max-w-6xl mx-auto h-[calc(100vh-6rem)] md:h-[calc(100vh-3rem)] flex flex-col">
	<h1 class="text-2xl font-bold text-[#e5e5e5] mb-4 shrink-0">Messages</h1>

	<!-- Error -->
	{#if error}
		<div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm shrink-0">
			{error}
			<button class="ml-2 underline" onclick={() => (error = '')}>dismiss</button>
		</div>
	{/if}

	<div class="flex-1 flex border border-[#262626] rounded-lg overflow-hidden min-h-0">
		<!-- Left Panel: Conversations -->
		<div class="w-full sm:w-80 shrink-0 bg-[#111] border-r border-[#262626] flex flex-col {selectedId ? 'hidden sm:flex' : 'flex'}">
			<!-- Search + New -->
			<div class="p-3 border-b border-[#262626] space-y-2">
				<input
					type="text"
					placeholder="Search..."
					bind:value={search}
					class="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-[#a3a3a3] text-sm focus:outline-none focus:border-[#7c3aed] transition-colors"
				/>
				<button
					class="w-full px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium rounded-lg transition-colors"
					onclick={() => (showNewMessage = !showNewMessage)}
				>
					{showNewMessage ? 'Back to Conversations' : '+ New Message'}
				</button>
			</div>

			<!-- Conversation List or New Message Member Picker -->
			<div class="flex-1 overflow-y-auto">
				{#if showNewMessage}
					{#if filteredMembers.length === 0}
						<div class="p-4 text-center text-[#a3a3a3] text-sm">No members found</div>
					{:else}
						{#each filteredMembers as member (member.id)}
							<button
								class="w-full flex items-center gap-3 p-3 text-left hover:bg-[#1a1a1a] transition-colors border-b border-[#262626]/50"
								onclick={() => startNewConversation(member)}
							>
								{#if member.picture}
									<img src={member.picture} alt="" class="w-8 h-8 rounded-full object-cover shrink-0" />
								{:else}
									<div class="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center text-[#a3a3a3] text-xs font-medium shrink-0">
										{member.name.charAt(0).toUpperCase()}
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<div class="text-[#e5e5e5] text-sm font-medium truncate">{member.name}</div>
									<div class="flex items-center gap-1.5">
										<span class="text-[10px] font-medium uppercase tracking-wider px-1 py-0.5 rounded {member.type === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#7c3aed]/20 text-[#7c3aed]'}">
											{member.type}
										</span>
									</div>
								</div>
							</button>
						{/each}
					{/if}
				{:else if loading}
					<div class="flex justify-center py-8">
						<div class="w-5 h-5 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
					</div>
				{:else if filteredConversations.length === 0}
					<div class="p-4 text-center text-[#a3a3a3] text-sm">
						No conversations yet. Start one!
					</div>
				{:else}
					{#each filteredConversations as conv (conv.memberId)}
						<button
							class="w-full flex items-center gap-3 p-3 text-left transition-colors border-b border-[#262626]/50 {selectedId === conv.memberId ? 'bg-[#7c3aed]/10 border-l-2 border-l-[#7c3aed]' : 'hover:bg-[#1a1a1a]'}"
							onclick={() => selectConversation(conv.memberId, conv.memberName)}
						>
							<div class="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center text-[#a3a3a3] text-xs font-medium shrink-0">
								{conv.memberName.charAt(0).toUpperCase()}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center justify-between">
									<span class="text-[#e5e5e5] text-sm font-medium truncate">{conv.memberName}</span>
									<span class="text-[#525252] text-[10px] shrink-0 ml-2">{formatTime(conv.lastMessageAt)}</span>
								</div>
								<div class="flex items-center justify-between mt-0.5">
									<span class="text-[#a3a3a3] text-xs truncate">{conv.lastMessage}</span>
									{#if conv.unreadCount > 0}
										<span class="ml-2 shrink-0 bg-[#7c3aed] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
											{conv.unreadCount > 9 ? '9+' : conv.unreadCount}
										</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Right Panel: Messages -->
		<div class="flex-1 flex flex-col bg-[#0a0a0a] {selectedId ? 'flex' : 'hidden sm:flex'}">
			{#if selectedId}
				<!-- Chat Header -->
				<div class="p-3 border-b border-[#262626] flex items-center gap-3 bg-[#111]">
					<button
						class="sm:hidden text-[#a3a3a3] hover:text-white text-lg"
						onclick={() => (selectedId = null)}
					>
						&#8592;
					</button>
					<div class="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center text-[#a3a3a3] text-xs font-medium">
						{selectedName ? selectedName.charAt(0).toUpperCase() : '?'}
					</div>
					<span class="text-[#e5e5e5] font-medium text-sm">{selectedName || selectedId}</span>
				</div>

				<!-- Messages -->
				<div class="flex-1 overflow-y-auto p-4 space-y-3">
					{#if loadingMessages}
						<div class="flex justify-center py-8">
							<div class="w-5 h-5 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
						</div>
					{:else if messages.length === 0}
						<div class="text-center py-12 text-[#a3a3a3] text-sm">
							No messages yet. Say hello!
						</div>
					{:else}
						{#each messages as msg (msg.id)}
							{@const isMe = msg.toId === selectedId}
							<div class="flex {isMe ? 'justify-end' : 'justify-start'}">
								<div
									class="max-w-[75%] px-3 py-2 rounded-lg text-sm {isMe ? 'bg-[#7c3aed] text-white' : 'bg-[#1a1a1a] text-[#e5e5e5] border border-[#262626]'}"
								>
									<p class="whitespace-pre-wrap break-words">{msg.content}</p>
									<p class="text-[10px] mt-1 {isMe ? 'text-white/60' : 'text-[#525252]'}">
										{formatTime(msg.createdAt)}
									</p>
								</div>
							</div>
						{/each}
					{/if}
					<div bind:this={messagesEnd}></div>
				</div>

				<!-- Input -->
				<div class="p-3 border-t border-[#262626] bg-[#111]">
					<div class="flex gap-2">
						<input
							type="text"
							placeholder="Type a message..."
							bind:value={messageInput}
							onkeydown={handleKeydown}
							class="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-[#a3a3a3] text-sm focus:outline-none focus:border-[#7c3aed] transition-colors"
						/>
						<button
							class="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
							disabled={!messageInput.trim() || sending}
							onclick={handleSend}
						>
							{sending ? '...' : 'Send'}
						</button>
					</div>
				</div>
			{:else}
				<!-- Empty state -->
				<div class="flex-1 flex items-center justify-center">
					<div class="text-center text-[#a3a3a3]">
						<p class="text-lg mb-1">Select a conversation</p>
						<p class="text-sm">or start a new one</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
