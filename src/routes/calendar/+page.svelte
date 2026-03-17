<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getTodayEvents, getUpcomingEvents, createEvent, getGoogleConnectionStatus } from '$lib/api';
	import type { CalendarEvent } from '$lib/types';

	let todayEvents: CalendarEvent[] = $state([]);
	let upcomingEvents: CalendarEvent[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let needsConnect = $state(false);

	let showModal = $state(false);
	let creating = $state(false);
	let newEvent = $state({
		title: '',
		description: '',
		start: '',
		end: '',
		location: ''
	});

	onMount(async () => {
		try {
			const status = await getGoogleConnectionStatus();
			if (!status.connected) {
				needsConnect = true;
				loading = false;
				return;
			}
		} catch {
			// If status check fails, try loading anyway
		}
		await loadEvents();
	});

	async function loadEvents() {
		loading = true;
		error = '';
		needsConnect = false;
		try {
			const [today, upcoming] = await Promise.all([getTodayEvents(), getUpcomingEvents()]);
			todayEvents = today;
			upcomingEvents = upcoming;
		} catch (e: any) {
			if (e.message?.includes('not connected') || e.message?.includes('connect')) {
				needsConnect = true;
			} else {
				error = e.message || 'Failed to load events';
			}
		} finally {
			loading = false;
		}
	}

	function formatTime(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function formatTimeRange(start: string, end: string): string {
		return `${formatTime(start)} - ${formatTime(end)}`;
	}

	function openModal() {
		newEvent = { title: '', description: '', start: '', end: '', location: '' };
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	async function handleCreate() {
		if (!newEvent.title || !newEvent.start || !newEvent.end) return;
		creating = true;
		try {
			const payload: Partial<CalendarEvent> = {
				title: newEvent.title,
				start: new Date(newEvent.start).toISOString(),
				end: new Date(newEvent.end).toISOString()
			};
			if (newEvent.description) payload.description = newEvent.description;
			if (newEvent.location) payload.location = newEvent.location;

			await createEvent(payload);
			closeModal();
			await loadEvents();
		} catch (e: any) {
			error = e.message || 'Failed to create event';
		} finally {
			creating = false;
		}
	}
</script>

<div class="max-w-3xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-[#e5e5e5]">Calendar</h1>
		<button
			class="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg transition-colors"
			onclick={openModal}
		>
			+ Create Event
		</button>
	</div>

	{#if needsConnect}
		<div class="flex items-center justify-center py-20">
			<div class="text-center space-y-4 max-w-sm">
				<div class="w-16 h-16 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center mx-auto">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
						<line x1="16" y1="2" x2="16" y2="6"/>
						<line x1="8" y1="2" x2="8" y2="6"/>
						<line x1="3" y1="10" x2="21" y2="10"/>
					</svg>
				</div>
				<h2 class="text-lg font-semibold text-[#e5e5e5]">Connect Google Services</h2>
				<p class="text-sm text-[#a3a3a3]">
					To access your Google Calendar, you need to connect your Google account first.
				</p>
				<button
					class="px-6 py-2.5 bg-[#7c3aed] text-white text-sm font-medium rounded-lg hover:bg-[#6d28d9] transition-colors"
					onclick={() => goto('/settings')}
				>
					Go to Settings
				</button>
			</div>
		</div>
	{:else if loading}
		<div class="flex items-center justify-center py-20">
			<div class="w-6 h-6 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if error}
		<div class="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
			{error}
		</div>
	{:else}
		<!-- Today Section -->
		<section>
			<h2 class="text-lg font-semibold text-[#e5e5e5] mb-3">Today</h2>
			{#if todayEvents.length === 0}
				<div class="bg-[#1a1a1a] border border-[#262626] rounded-lg p-6 text-center">
					<p class="text-[#a3a3a3] text-sm">No events scheduled for today.</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each todayEvents as event}
						<div class="bg-[#1a1a1a] border border-[#262626] rounded-lg p-4 flex items-start gap-4">
							<div class="shrink-0 w-24 text-right">
								<span class="text-sm font-medium text-[#7c3aed]">
									{formatTime(event.start)}
								</span>
							</div>
							<div class="border-l-2 border-[#7c3aed] pl-4 flex-1 min-w-0">
								<h3 class="text-[#e5e5e5] font-medium text-sm">{event.title}</h3>
								<p class="text-[#a3a3a3] text-xs mt-0.5">
									{formatTimeRange(event.start, event.end)}
								</p>
								{#if event.location}
									<p class="text-[#a3a3a3] text-xs mt-1 flex items-center gap-1">
										<span class="opacity-70">&#x1f4cd;</span>
										{event.location}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Upcoming Section -->
		<section>
			<h2 class="text-lg font-semibold text-[#e5e5e5] mb-3">Upcoming</h2>
			{#if upcomingEvents.length === 0}
				<div class="bg-[#1a1a1a] border border-[#262626] rounded-lg p-6 text-center">
					<p class="text-[#a3a3a3] text-sm">No upcoming events.</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each upcomingEvents as event}
						<div class="bg-[#1a1a1a] border border-[#262626] rounded-lg p-4 flex items-start gap-4">
							<div class="shrink-0 w-24 text-right">
								<div class="text-sm font-medium text-[#7c3aed]">
									{formatDate(event.start)}
								</div>
								<div class="text-xs text-[#a3a3a3]">
									{formatTime(event.start)}
								</div>
							</div>
							<div class="border-l-2 border-[#262626] pl-4 flex-1 min-w-0">
								<h3 class="text-[#e5e5e5] font-medium text-sm">{event.title}</h3>
								<p class="text-[#a3a3a3] text-xs mt-0.5">
									{formatTimeRange(event.start, event.end)}
								</p>
								{#if event.location}
									<p class="text-[#a3a3a3] text-xs mt-1 flex items-center gap-1">
										<span class="opacity-70">&#x1f4cd;</span>
										{event.location}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<!-- Create Event Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button class="absolute inset-0 bg-black/60" onclick={closeModal}></button>

		<!-- Modal -->
		<div class="relative bg-[#1a1a1a] border border-[#262626] rounded-xl w-full max-w-md p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-[#e5e5e5]">Create Event</h2>
				<button class="text-[#a3a3a3] hover:text-white text-xl leading-none" onclick={closeModal}>
					&times;
				</button>
			</div>

			<form
				class="space-y-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleCreate();
				}}
			>
				<!-- Title -->
				<div>
					<label for="event-title" class="block text-sm font-medium text-[#a3a3a3] mb-1">Title</label>
					<input
						id="event-title"
						type="text"
						bind:value={newEvent.title}
						required
						class="w-full bg-[#111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#525252] focus:outline-none focus:border-[#7c3aed] transition-colors"
						placeholder="Event title"
					/>
				</div>

				<!-- Description -->
				<div>
					<label for="event-desc" class="block text-sm font-medium text-[#a3a3a3] mb-1">Description</label>
					<textarea
						id="event-desc"
						bind:value={newEvent.description}
						rows="3"
						class="w-full bg-[#111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#525252] focus:outline-none focus:border-[#7c3aed] transition-colors resize-none"
						placeholder="Optional description"
					></textarea>
				</div>

				<!-- Start -->
				<div>
					<label for="event-start" class="block text-sm font-medium text-[#a3a3a3] mb-1">Start</label>
					<input
						id="event-start"
						type="datetime-local"
						bind:value={newEvent.start}
						required
						class="w-full bg-[#111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed] transition-colors"
					/>
				</div>

				<!-- End -->
				<div>
					<label for="event-end" class="block text-sm font-medium text-[#a3a3a3] mb-1">End</label>
					<input
						id="event-end"
						type="datetime-local"
						bind:value={newEvent.end}
						required
						class="w-full bg-[#111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#7c3aed] transition-colors"
					/>
				</div>

				<!-- Location -->
				<div>
					<label for="event-location" class="block text-sm font-medium text-[#a3a3a3] mb-1">Location</label>
					<input
						id="event-location"
						type="text"
						bind:value={newEvent.location}
						class="w-full bg-[#111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#525252] focus:outline-none focus:border-[#7c3aed] transition-colors"
						placeholder="Optional location"
					/>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-2">
					<button
						type="button"
						class="px-4 py-2 text-sm text-[#a3a3a3] hover:text-white transition-colors"
						onclick={closeModal}
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={creating || !newEvent.title || !newEvent.start || !newEvent.end}
						class="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
					>
						{creating ? 'Creating...' : 'Create Event'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
