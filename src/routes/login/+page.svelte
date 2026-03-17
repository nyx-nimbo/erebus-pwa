<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { initGoogleSignIn, renderGoogleButton, exchangeCodeForToken, setToken, setStoredUser } from '$lib/auth';
	import { isAuthenticated } from '$lib/stores';

	let errorMsg = $state('');
	let loading = $state(false);
	let googleBtnRef: HTMLDivElement;

	onMount(() => {
		const unsub = isAuthenticated.subscribe((v) => {
			if (v) goto('/');
		});

		try {
			initGoogleSignIn(handleCredentialResponse);
			if (googleBtnRef) {
				renderGoogleButton(googleBtnRef);
			}
		} catch (e) {
			console.error('Failed to initialize Google Sign-In:', e);
		}

		return unsub;
	});

	async function handleCredentialResponse(response: { credential: string }) {
		loading = true;
		errorMsg = '';
		try {
			const result = await exchangeCodeForToken(response.credential);
			setToken(result.token);
			setStoredUser(result.user);
			goto('/');
		} catch (e: any) {
			errorMsg = e.message || 'Authentication failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
	<div class="w-full max-w-sm mx-auto p-8">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-[#7c3aed] mb-2">Erebus</h1>
			<p class="text-[#a3a3a3] text-sm">Command Center</p>
		</div>

		<div class="card text-center">
			<p class="text-sm text-[#a3a3a3] mb-6">Sign in to continue</p>

			{#if loading}
				<div class="flex justify-center py-4">
					<div class="w-6 h-6 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
				</div>
			{:else}
				<div class="flex justify-center" bind:this={googleBtnRef}></div>
			{/if}

			{#if errorMsg}
				<p class="mt-4 text-red-400 text-sm">{errorMsg}</p>
			{/if}
		</div>
	</div>
</div>
