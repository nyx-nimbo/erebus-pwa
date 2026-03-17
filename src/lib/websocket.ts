import { writable, get } from 'svelte/store';
import { getToken } from './auth';
import type { Message } from './types';

const WS_URL = 'wss://ws-erebus.nimbo.pro/ws';

// --- Stores ---
export const wsConnected = writable(false);
export const unreadWsCount = writable(0);
export const typingUsers = writable<Record<string, { name: string; timeout: ReturnType<typeof setTimeout> }>>({});
export const presenceMap = writable<Record<string, 'online' | 'offline'>>({});

// --- Event callbacks ---
type MessageHandler = (msg: WsIncoming) => void;
const listeners: MessageHandler[] = [];

export function onWsMessage(handler: MessageHandler): () => void {
	listeners.push(handler);
	return () => {
		const idx = listeners.indexOf(handler);
		if (idx >= 0) listeners.splice(idx, 1);
	};
}

// --- Types ---
export interface WsIncoming {
	type: 'message' | 'typing' | 'presence' | 'error';
	fromId?: string;
	fromName?: string;
	userId?: string;
	content?: string;
	status?: 'online' | 'offline';
	message?: string;
	createdAt?: string;
	// Fields we add for message compatibility
	id?: string;
	fromType?: 'user' | 'agent';
	toId?: string;
	toName?: string;
	read?: boolean;
}

interface WsOutgoing {
	type: 'message' | 'typing';
	toId: string;
	content?: string;
}

// --- Connection state ---
let socket: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

function getBackoffDelay(): number {
	const base = 1000;
	const max = 30000;
	const delay = Math.min(base * Math.pow(2, reconnectAttempt), max);
	// Add jitter
	return delay + Math.random() * 1000;
}

export function connect(): void {
	const token = getToken();
	if (!token) return;
	if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
		return;
	}

	intentionalClose = false;

	try {
		socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
	} catch {
		scheduleReconnect();
		return;
	}

	socket.onopen = () => {
		wsConnected.set(true);
		reconnectAttempt = 0;
	};

	socket.onmessage = (event) => {
		try {
			const data: WsIncoming = JSON.parse(event.data);
			handleIncoming(data);
		} catch {
			// Ignore malformed messages
		}
	};

	socket.onclose = () => {
		wsConnected.set(false);
		socket = null;
		if (!intentionalClose) {
			scheduleReconnect();
		}
	};

	socket.onerror = () => {
		// onclose will fire after onerror
	};
}

function scheduleReconnect(): void {
	if (reconnectTimer) clearTimeout(reconnectTimer);
	const delay = getBackoffDelay();
	reconnectAttempt++;
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		connect();
	}, delay);
}

export function disconnect(): void {
	intentionalClose = true;
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
	reconnectAttempt = 0;
	if (socket) {
		socket.close();
		socket = null;
	}
	wsConnected.set(false);
	typingUsers.set({});
	presenceMap.set({});
}

export function send(msg: WsOutgoing): boolean {
	if (socket && socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify(msg));
		return true;
	}
	return false;
}

export function sendWsMessage(toId: string, content: string): boolean {
	return send({ type: 'message', toId, content });
}

export function sendTyping(toId: string): boolean {
	return send({ type: 'typing', toId });
}

export function isConnected(): boolean {
	return socket !== null && socket.readyState === WebSocket.OPEN;
}

// --- Incoming message handling ---
function handleIncoming(data: WsIncoming): void {
	switch (data.type) {
		case 'message':
			unreadWsCount.update((n) => n + 1);
			break;
		case 'typing':
			if (data.fromId) {
				const fromId = data.fromId;
				const fromName = data.fromName || fromId;
				typingUsers.update((map) => {
					// Clear existing timeout for this user
					if (map[fromId]) clearTimeout(map[fromId].timeout);
					const timeout = setTimeout(() => {
						typingUsers.update((m) => {
							const { [fromId]: _, ...rest } = m;
							return rest;
						});
					}, 3000);
					return { ...map, [fromId]: { name: fromName, timeout } };
				});
			}
			break;
		case 'presence':
			if (data.userId && data.status) {
				presenceMap.update((map) => ({ ...map, [data.userId!]: data.status! }));
			}
			break;
		case 'error':
			console.warn('[ws] server error:', data.message);
			break;
	}

	// Notify all listeners
	for (const handler of listeners) {
		try {
			handler(data);
		} catch {
			// Don't let one handler break others
		}
	}
}
