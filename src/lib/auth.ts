import { env } from '$env/dynamic/public';
import { user, isAuthenticated } from './stores';

const TOKEN_KEY = 'erebus_token';
const USER_KEY = 'erebus_user';

export function getToken(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
	isAuthenticated.set(true);
}

export function clearToken(): void {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(USER_KEY);
	isAuthenticated.set(false);
	user.set(null);
}

export function getStoredUser() {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem(USER_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export function setStoredUser(userData: { email: string; name: string; picture: string }): void {
	localStorage.setItem(USER_KEY, JSON.stringify(userData));
	user.set(userData);
}

export function initAuth(): void {
	const token = getToken();
	if (token) {
		isAuthenticated.set(true);
		const storedUser = getStoredUser();
		if (storedUser) {
			user.set(storedUser);
		}
	}
}

export function initGoogleSignIn(callback: (response: google.accounts.id.CredentialResponse) => void): void {
	const clientId = env.PUBLIC_GOOGLE_CLIENT_ID;
	if (!clientId) {
		console.error('Missing PUBLIC_GOOGLE_CLIENT_ID');
		return;
	}

	google.accounts.id.initialize({
		client_id: clientId,
		callback,
		ux_mode: 'popup'
	});
}

export function renderGoogleButton(element: HTMLElement): void {
	google.accounts.id.renderButton(element, {
		theme: 'filled_black',
		size: 'large',
		width: 300,
		text: 'signin_with'
	});
}

export async function exchangeCodeForToken(credential: string): Promise<{ token: string; user: { email: string; name: string; picture: string } }> {
	const apiUrl = env.PUBLIC_API_URL;
	const res = await fetch(`${apiUrl}/auth/google`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ credential })
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: 'Authentication failed' }));
		throw new Error(err.message || 'Authentication failed');
	}

	return res.json();
}

export function logout(): void {
	clearToken();
	if (typeof google !== 'undefined' && google.accounts?.id) {
		google.accounts.id.disableAutoSelect();
	}
	window.location.href = '/login';
}

// Type declarations for Google Identity Services
declare namespace google.accounts.id {
	interface CredentialResponse {
		credential: string;
		select_by: string;
	}
	function initialize(config: {
		client_id: string;
		callback: (response: CredentialResponse) => void;
		ux_mode?: string;
	}): void;
	function renderButton(element: HTMLElement, config: {
		theme?: string;
		size?: string;
		width?: number;
		text?: string;
	}): void;
	function disableAutoSelect(): void;
}
