<script lang="ts">
	import { onMount } from 'svelte';
	import { getEmails, getEmail, sendEmail } from '$lib/api';
	import type { Email } from '$lib/types';

	let emails = $state<Email[]>([]);
	let selectedEmail = $state<Email | null>(null);
	let loading = $state(true);
	let loadingBody = $state(false);
	let error = $state('');
	let showCompose = $state(false);

	let composeTo = $state('');
	let composeSubject = $state('');
	let composeBody = $state('');
	let sending = $state(false);
	let sendError = $state('');
	let sendSuccess = $state('');

	onMount(async () => {
		await fetchEmails();
	});

	async function fetchEmails() {
		loading = true;
		error = '';
		try {
			emails = await getEmails();
		} catch (e: any) {
			error = e.message || 'Failed to load emails';
		} finally {
			loading = false;
		}
	}

	async function selectEmail(email: Email) {
		selectedEmail = email;
		loadingBody = true;
		try {
			const full = await getEmail(email.id);
			selectedEmail = full;
			// Mark as read in the list
			emails = emails.map((e) => (e.id === email.id ? { ...e, read: true } : e));
		} catch (e: any) {
			// Fall back to the list version if full fetch fails
			console.error('Failed to fetch full email:', e);
		} finally {
			loadingBody = false;
		}
	}

	function openCompose() {
		composeTo = '';
		composeSubject = '';
		composeBody = '';
		sendError = '';
		sendSuccess = '';
		showCompose = true;
	}

	function closeCompose() {
		showCompose = false;
	}

	async function handleSend() {
		if (!composeTo.trim() || !composeSubject.trim()) {
			sendError = 'To and Subject fields are required';
			return;
		}
		sending = true;
		sendError = '';
		sendSuccess = '';
		try {
			await sendEmail({ to: composeTo, subject: composeSubject, body: composeBody });
			sendSuccess = 'Email sent successfully';
			setTimeout(() => {
				closeCompose();
			}, 1200);
		} catch (e: any) {
			sendError = e.message || 'Failed to send email';
		} finally {
			sending = false;
		}
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const isToday =
			date.getDate() === now.getDate() &&
			date.getMonth() === now.getMonth() &&
			date.getFullYear() === now.getFullYear();
		if (isToday) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function handleBackToList() {
		selectedEmail = null;
	}
</script>

<div class="h-full flex flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-xl font-bold text-[#e5e5e5]">Inbox</h1>
		<button
			class="px-4 py-2 bg-[#7c3aed] text-white text-sm font-medium rounded-lg hover:bg-[#6d28d9] transition-colors"
			onclick={openCompose}
		>
			Compose
		</button>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<div class="w-6 h-6 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if error}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center">
				<p class="text-red-400 text-sm mb-3">{error}</p>
				<button
					class="px-4 py-2 bg-[#7c3aed] text-white text-sm rounded-lg hover:bg-[#6d28d9] transition-colors"
					onclick={fetchEmails}
				>
					Retry
				</button>
			</div>
		</div>
	{:else}
		<div class="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
			<!-- Email List -->
			<div
				class="w-full md:w-[360px] md:shrink-0 flex flex-col bg-[#1a1a1a] rounded-lg border border-[#262626] overflow-hidden {selectedEmail ? 'hidden md:flex' : 'flex'}"
			>
				{#if emails.length === 0}
					<div class="flex-1 flex items-center justify-center p-8">
						<p class="text-[#a3a3a3] text-sm">No emails found</p>
					</div>
				{:else}
					<div class="flex-1 overflow-y-auto">
						{#each emails as email (email.id)}
							<button
								class="w-full text-left px-4 py-3 border-b border-[#262626] transition-colors hover:bg-[#262626]/60 {selectedEmail?.id === email.id ? 'bg-[#7c3aed]/10 border-l-2 border-l-[#7c3aed]' : ''}"
								onclick={() => selectEmail(email)}
							>
								<div class="flex items-baseline justify-between gap-2 mb-1">
									<span
										class="text-sm truncate {email.read ? 'text-[#a3a3a3] font-normal' : 'text-[#e5e5e5] font-semibold'}"
									>
										{email.from}
									</span>
									<span class="text-xs text-[#a3a3a3] shrink-0">{formatDate(email.date)}</span>
								</div>
								<p
									class="text-sm truncate {email.read ? 'text-[#a3a3a3] font-normal' : 'text-[#e5e5e5] font-semibold'}"
								>
									{email.subject}
								</p>
								<p class="text-xs text-[#a3a3a3] truncate mt-0.5">{email.snippet}</p>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Email Detail -->
			<div
				class="flex-1 flex flex-col bg-[#1a1a1a] rounded-lg border border-[#262626] overflow-hidden min-h-0 {selectedEmail ? 'flex' : 'hidden md:flex'}"
			>
				{#if selectedEmail}
					<!-- Mobile back button -->
					<div class="md:hidden border-b border-[#262626]">
						<button
							class="flex items-center gap-2 px-4 py-2 text-sm text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
							onclick={handleBackToList}
						>
							<span>&larr;</span> Back to inbox
						</button>
					</div>

					<!-- Email header -->
					<div class="p-4 border-b border-[#262626] shrink-0">
						<h2 class="text-lg font-semibold text-[#e5e5e5] mb-2">{selectedEmail.subject}</h2>
						<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
							<span class="text-[#e5e5e5]">{selectedEmail.from}</span>
							<span class="text-[#a3a3a3]">to {selectedEmail.to}</span>
							<span class="text-[#a3a3a3] sm:ml-auto">{formatDate(selectedEmail.date)}</span>
						</div>
						{#if selectedEmail.labels && selectedEmail.labels.length > 0}
							<div class="flex flex-wrap gap-1.5 mt-2">
								{#each selectedEmail.labels as label}
									<span class="px-2 py-0.5 text-xs rounded-full bg-[#7c3aed]/20 text-[#7c3aed]">
										{label}
									</span>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Email body -->
					<div class="flex-1 overflow-y-auto p-4">
						{#if loadingBody}
							<div class="flex items-center justify-center py-8">
								<div class="w-5 h-5 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
							</div>
						{:else}
							<div class="text-sm text-[#e5e5e5] whitespace-pre-wrap leading-relaxed">
								{selectedEmail.body}
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex-1 flex items-center justify-center">
						<p class="text-[#a3a3a3] text-sm">Select an email to read</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Floating Compose Button (mobile) -->
<button
	class="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-[#7c3aed] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-[#6d28d9] transition-colors z-20"
	onclick={openCompose}
	aria-label="Compose email"
>
	+
</button>

<!-- Compose Modal -->
{#if showCompose}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/60"
			onclick={closeCompose}
			aria-label="Close compose"
		></button>

		<!-- Modal -->
		<div class="relative w-full sm:max-w-lg bg-[#1a1a1a] border border-[#262626] rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
			<!-- Modal header -->
			<div class="flex items-center justify-between px-4 py-3 border-b border-[#262626] shrink-0">
				<h3 class="text-sm font-semibold text-[#e5e5e5]">New Message</h3>
				<button
					class="text-[#a3a3a3] hover:text-[#e5e5e5] text-lg transition-colors"
					onclick={closeCompose}
					aria-label="Close"
				>
					&times;
				</button>
			</div>

			<!-- Modal body -->
			<div class="flex-1 overflow-y-auto p-4 space-y-3">
				<div>
					<input
						type="email"
						placeholder="To"
						bind:value={composeTo}
						class="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#a3a3a3] focus:outline-none focus:border-[#7c3aed] transition-colors"
					/>
				</div>
				<div>
					<input
						type="text"
						placeholder="Subject"
						bind:value={composeSubject}
						class="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#a3a3a3] focus:outline-none focus:border-[#7c3aed] transition-colors"
					/>
				</div>
				<div>
					<textarea
						placeholder="Write your message..."
						bind:value={composeBody}
						rows="8"
						class="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#a3a3a3] focus:outline-none focus:border-[#7c3aed] transition-colors resize-none"
					></textarea>
				</div>

				{#if sendError}
					<p class="text-red-400 text-sm">{sendError}</p>
				{/if}
				{#if sendSuccess}
					<p class="text-green-400 text-sm">{sendSuccess}</p>
				{/if}
			</div>

			<!-- Modal footer -->
			<div class="flex justify-end gap-2 px-4 py-3 border-t border-[#262626] shrink-0">
				<button
					class="px-4 py-2 text-sm text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
					onclick={closeCompose}
				>
					Discard
				</button>
				<button
					class="px-4 py-2 bg-[#7c3aed] text-white text-sm font-medium rounded-lg hover:bg-[#6d28d9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={handleSend}
					disabled={sending}
				>
					{#if sending}
						<span class="inline-flex items-center gap-2">
							<span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
							Sending...
						</span>
					{:else}
						Send
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
