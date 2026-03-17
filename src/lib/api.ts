import { env } from '$env/dynamic/public';
import { getToken, logout } from './auth';
import type {
	Client,
	Project,
	Task,
	Idea,
	Email,
	CalendarEvent,
	ChatSession,
	HealthStatus
} from './types';

function getBaseUrl(): string {
	return env.PUBLIC_API_URL || 'http://localhost:8080/api';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getToken();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string> || {})
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const res = await fetch(`${getBaseUrl()}${path}`, {
		...options,
		headers
	});

	if (res.status === 401) {
		logout();
		throw new Error('Unauthorized');
	}

	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: `Request failed: ${res.status}` }));
		throw new Error(err.message || err.error || `Request failed: ${res.status}`);
	}

	if (res.status === 204) return undefined as T;
	return res.json();
}

// Health
export const getHealth = () => request<HealthStatus>('/health');

// Clients
export const getClients = () => request<Client[]>('/clients');
export const getClient = (id: string) => request<Client>(`/clients/${id}`);
export const createClient = (data: Partial<Client>) =>
	request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) });
export const updateClient = (id: string, data: Partial<Client>) =>
	request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClient = (id: string) =>
	request<void>(`/clients/${id}`, { method: 'DELETE' });

// Projects
export const getProjects = () => request<Project[]>('/projects');
export const getProject = (id: string) => request<Project>(`/projects/${id}`);
export const createProject = (data: Partial<Project>) =>
	request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) });
export const updateProject = (id: string, data: Partial<Project>) =>
	request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProject = (id: string) =>
	request<void>(`/projects/${id}`, { method: 'DELETE' });

// Tasks
export const getTasks = (projectId?: string) => {
	const query = projectId ? `?project_id=${projectId}` : '';
	return request<Task[]>(`/tasks${query}`);
};
export const getTask = (id: string) => request<Task>(`/tasks/${id}`);
export const createTask = (data: Partial<Task>) =>
	request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id: string, data: Partial<Task>) =>
	request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const claimTask = (id: string) =>
	request<Task>(`/tasks/${id}/claim`, { method: 'POST' });
export const deleteTask = (id: string) =>
	request<void>(`/tasks/${id}`, { method: 'DELETE' });

// Ideas
export const getIdeas = () => request<Idea[]>('/ideas');
export const getIdea = (id: string) => request<Idea>(`/ideas/${id}`);
export const createIdea = (data: Partial<Idea>) =>
	request<Idea>('/ideas', { method: 'POST', body: JSON.stringify(data) });
export const updateIdea = (id: string, data: Partial<Idea>) =>
	request<Idea>(`/ideas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteIdea = (id: string) =>
	request<void>(`/ideas/${id}`, { method: 'DELETE' });

// Email
export const getEmails = () => request<Email[]>('/emails');
export const getEmail = (id: string) => request<Email>(`/emails/${id}`);
export const sendEmail = (data: { to: string; subject: string; body: string }) =>
	request<void>('/emails/send', { method: 'POST', body: JSON.stringify(data) });

// Calendar
export const getTodayEvents = () => request<CalendarEvent[]>('/calendar/today');
export const getUpcomingEvents = () => request<CalendarEvent[]>('/calendar/upcoming');
export const createEvent = (data: Partial<CalendarEvent>) =>
	request<CalendarEvent>('/calendar', { method: 'POST', body: JSON.stringify(data) });

// Chat
export const getChatSessions = () => request<ChatSession[]>('/chat/sessions');
export const createChatSession = (title: string) =>
	request<ChatSession>('/chat/sessions', { method: 'POST', body: JSON.stringify({ title }) });
export const deleteChatSession = (key: string) =>
	request<void>(`/chat/sessions/${key}`, { method: 'DELETE' });
export const getChatHistory = (sessionKey: string) =>
	request<ChatSession>(`/chat/sessions/${sessionKey}`);

export function sendChat(sessionKey: string, message: string): EventSource {
	const token = getToken();
	const url = new URL(`${getBaseUrl()}/chat/stream`);
	url.searchParams.set('session_key', sessionKey);
	url.searchParams.set('message', message);
	if (token) {
		url.searchParams.set('token', token);
	}
	return new EventSource(url.toString());
}
