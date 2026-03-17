import { writable } from 'svelte/store';
import type { User } from './types';

export const user = writable<User | { email: string; name: string; picture: string } | null>(null);
export const isAuthenticated = writable(false);
export const sidebarOpen = writable(false);
export const currentRoute = writable('/');
