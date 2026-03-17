<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { page } from '$app/stores';
	import {
		getConversations,
		getConversation,
		sendMessage,
		markRead,
		getMembers
	} from '$lib/api';
	import {
		onWsMessage,
		sendWsMessage,
		sendTyping,
		isConnected,
		typingUsers,
		presenceMap,
		unreadWsCount,
		type WsIncoming
	} from '$lib/websocket';
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
	let typingMap = $state<Record<string, { name: string; timeout: ReturnType<typeof setTimeout> }>>({});
	let presence = $state<Record<string, 'online' | 'offline'>>({});
	let typingThrottle = 0;
	let dataLoaded = $state(false);

	let filteredConversations = $derived(
		conversations
			.filter((c) => c.memberName.toLowerCase().includes(search.toLowerCase()))
			.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
	);

	// Show ALL members in the picker (don't filter out existing conversations)
	let filteredMembers = $derived(
		members.filter(
			(m) =>
				m.name.toLowerCase().includes(search.toLowerCase()) ||
				(m.email && m.email.toLowerCase().includes(search.toLowerCase()))
		)
	);

	// Is the selected user currently typing?
	let selectedTyping = $derived(selectedId ? !!typingMap[selectedId] : false);
	// Selected user's online status
	let selectedOnline = $derived(selectedId ? presence[selectedId] === 'online' : false);

	// Subscribe to stores
	const unsubTyping = typingUsers.subscribe((v) => (typingMap = v));
	const unsubPresence = presenceMap.subscribe((v) => (presence = v));

	let unsubWs: (() => void) | null = null;

	onMount(async () => {
		// Listen for WebSocket messages immediately
		unsubWs = onWsMessage(handleWsMessage);

		// Load data in parallel, then mark ready
		await Promise.all([loadConversations(), loadMembers()]);
		dataLoaded = true;
	});

	// React to ?with= URL param — handles both initial load and in-page navigation
	$effect(() => {
		if (!dataLoaded) return;
		const withId = $page.url.searchParams.get('with');
		if (!withId) return;
		if (withId === untrack(() => selectedId)) return;
		const conv = untrack(() => conversations.find((c) => c.memberId === withId));
		const member = untrack(() => members.find((m) => m.email === withId || m.id === withId));
		const name = conv?.memberName || member?.name || '';
		selectConversation(withId, name);
	});

	onDestroy(() => {
		unsubWs?.();
		unsubTyping();
		unsubPresence();
	});

	function handleWsMessage(data: WsIncoming) {
		if (data.type === 'message' && data.fromId) {
			const newMsg: Message = {
				id: data.id || crypto.randomUUID(),
				fromId: data.fromId,
				fromName: data.fromName || data.fromId,
				fromType: data.fromType || 'user',
				toId: data.toId || '',
				toName: data.toName || '',
				content: data.content || '',
				read: false,
				createdAt: data.createdAt || new Date().toISOString()
			};

			// If this message is part of the currently open conversation
			if (selectedId && (data.fromId === selectedId || data.toId === selectedId)) {
				messages = [...messages, newMsg];
				scrollToBottom();
				// Mark as read since we're viewing it
				if (data.fromId === selectedId && newMsg.id) {
					markRead(newMsg.id).catch(() => {});
				}
			}

			// Update conversation list
			updateConversationFromMessage(data);
		}
	}

	function updateConversationFromMessage(data: WsIncoming) {
		const otherId = data.fromId || '';
		const existing = conversations.find((c) => c.memberId === otherId);
		if (existing) {
			existing.lastMessage = data.content || '';
			existing.lastMessageAt = data.createdAt || new Date().toISOString();
			if (selectedId !== otherId) {
				existing.unreadCount = (existing.unreadCount || 0) + 1;
			}
			conversations = [...conversations];
		} else {
			// New conversation appeared — reload list
			loadConversations();
		}
	}

	async function loadConversations() {
		loading = true;
		error = '';
		try {
			const result = await getConversations();
			conversations = Array.isArray(result) ? result : [];
		} catch (e: any) {
			error = e.message || 'Failed to load conversations';
		} finally {
			loading = false;
		}
	}

	async function loadMembers() {
		try {
			const result = await getMembers();
			members = Array.isArray(result) ? result : [];
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
			const result = await getConversation(id);
			messages = Array.isArray(result) ? result : [];
			for (const msg of messages) {
				if (!msg.read && msg.fromId === id) {
					markRead(msg.id).catch(() => {});
				}
			}
			const conv = conversations.find((c) => c.memberId === id);
			if (conv) conv.unreadCount = 0;
			// Resolve name if it wasn't provided
			if (!selectedName) {
				if (conv) {
					selectedName = conv.memberName;
				} else {
					const member = members.find((m) => m.email === id || m.id === id);
					if (member) selectedName = member.name;
				}
			}
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

		// Try WebSocket first, fall back to REST
		if (isConnected()) {
			const sent = sendWsMessage(selectedId, content);
			if (sent) {
				// Optimistically add message to UI
				const optimistic: Message = {
					id: crypto.randomUUID(),
					fromId: '', // will be filled by server echo or next load
					fromName: '',
					fromType: 'user',
					toId: selectedId,
					toName: selectedName,
					content,
					read: false,
					createdAt: new Date().toISOString()
				};
				messages = [...messages, optimistic];
				scrollToBottom();
				loadConversations();
				sending = false;
				return;
			}
		}

		// Fallback to REST API
		try {
			const msg = await sendMessage(selectedId, content);
			messages = [...messages, msg];
			scrollToBottom();
			loadConversations();
		} catch (e: any) {
			error = e.message || 'Failed to send message';
			messageInput = content;
		} finally {
			sending = false;
		}
	}

	function handleInput() {
		// Send typing indicator (throttled to once per 2s)
		if (selectedId && isConnected()) {
			const now = Date.now();
			if (now - typingThrottle > 2000) {
				typingThrottle = now;
				sendTyping(selectedId);
			}
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

<div class="max-w-6xl mx-auto h-[calc(100vh-12rem)] md:h-[calc(100vh-6rem)] flex flex-col">
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
					<div class="px-3 py-2 bg-[#0a0a0a] border-b border-[#262626]">
						<span class="text-[#a3a3a3] text-xs font-medium uppercase tracking-wider">Select a member</span>
					</div>
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
										{#if member.status === 'online'}
											<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
										{/if}
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
							<div class="relative shrink-0">
								<div class="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center text-[#a3a3a3] text-xs font-medium">
									{conv.memberName.charAt(0).toUpperCase()}
								</div>
								{#if presence[conv.memberId] === 'online'}
									<div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#111]"></div>
								{/if}
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
				<div class="p-3 border-b border-[#262626] flex items-center gap-3 bg-[#111] shrink-0">
					<button
						class="sm:hidden text-[#a3a3a3] hover:text-white text-lg"
						onclick={() => (selectedId = null)}
					>
						&#8592;
					</button>
					<div class="relative">
						<div class="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center text-[#a3a3a3] text-xs font-medium">
							{selectedName ? selectedName.charAt(0).toUpperCase() : '?'}
						</div>
						{#if selectedOnline}
							<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111]"></div>
						{/if}
					</div>
					<div class="flex flex-col">
						<span class="text-[#e5e5e5] font-medium text-sm">{selectedName || selectedId}</span>
						{#if selectedTyping}
							<span class="text-[#7c3aed] text-[10px] animate-pulse">typing...</span>
						{:else if selectedOnline}
							<span class="text-green-400 text-[10px]">online</span>
						{/if}
					</div>
				</div>

				<!-- Messages -->
				<div class="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
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

				<!-- Typing indicator -->
				{#if selectedTyping}
					<div class="px-4 py-1 text-[#7c3aed] text-xs animate-pulse shrink-0">
						{typingMap[selectedId!]?.name || 'Someone'} is typing...
					</div>
				{/if}

				<!-- Input -->
				<div class="p-3 border-t border-[#262626] bg-[#111] shrink-0">
					<div class="flex gap-2">
						<input
							type="text"
							placeholder="Type a message..."
							bind:value={messageInput}
							onkeydown={handleKeydown}
							oninput={handleInput}
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
