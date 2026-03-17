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
	BusinessUnit,
	HealthStatus,
	Member,
	Message,
	Conversation
} from './types';

function getBaseUrl(): string {
	return env.PUBLIC_API_URL || 'http://localhost:8080/api';
}

interface PaginatedResponse<T> {
	data: T[];
	page: number;
	limit: number;
	totalCount: number;
	totalPages: number;
}

interface WrappedResponse<T> {
	data: T[];
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
		const err = await res.json().catch(() => ({ error: `Request failed: ${res.status}` }));
		throw new Error(err.error || err.message || `Request failed: ${res.status}`);
	}

	if (res.status === 204) return undefined as T;
	return res.json();
}

/** Extract .data array from paginated/wrapped responses */
function unwrapList<T>(response: PaginatedResponse<T> | WrappedResponse<T> | T[]): T[] {
	if (Array.isArray(response)) return response;
	if (response && 'data' in response) return (response as WrappedResponse<T>).data || [];
	return [];
}

// Health
export const getHealth = () => request<HealthStatus>('/health');

// Clients
export const getClients = () =>
	request<PaginatedResponse<Client>>('/clients').then(unwrapList);
export const getClient = (id: string) => request<Client>(`/clients/${id}`);
export const createClient = (data: Partial<Client>) =>
	request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) });
export const updateClient = (id: string, data: Partial<Client>) =>
	request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClient = (id: string) =>
	request<void>(`/clients/${id}`, { method: 'DELETE' });

// Business Units
export const getBusinessUnits = (clientId: string) =>
	request<WrappedResponse<BusinessUnit>>(`/clients/${clientId}/units`).then(unwrapList);

// Projects
export const getProjects = () =>
	request<PaginatedResponse<Project>>('/projects').then(unwrapList);
export const getProject = async (id: string): Promise<Project> => {
	const res = await request<{ project: Project; subProjects: Project[] }>(`/projects/${id}`);
	return { ...res.project, subProjects: res.subProjects || [] };
};
export const createProject = (data: Partial<Project>) =>
	request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) });
export const updateProject = (id: string, data: Partial<Project>) =>
	request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProject = (id: string) =>
	request<void>(`/projects/${id}`, { method: 'DELETE' });

// Tasks
export const getTasks = (projectId?: string) => {
	const query = projectId ? `?projectId=${projectId}` : '';
	return request<PaginatedResponse<Task> | WrappedResponse<Task>>(`/tasks${query}`).then(unwrapList);
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
export const getIdeas = () =>
	request<PaginatedResponse<Idea>>('/ideas').then(unwrapList);
export const getIdea = (id: string) => request<Idea>(`/ideas/${id}`);
export const createIdea = (data: Partial<Idea>) =>
	request<Idea>('/ideas', { method: 'POST', body: JSON.stringify(data) });
export const updateIdea = (id: string, data: Partial<Idea>) =>
	request<Idea>(`/ideas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteIdea = (id: string) =>
	request<void>(`/ideas/${id}`, { method: 'DELETE' });
export const addResearch = (id: string, data: { content: string; source?: string }) =>
	request<unknown>(`/ideas/${id}/research`, { method: 'POST', body: JSON.stringify(data) });

// Email (API routes use /email not /emails)
export const getEmails = () => request<Email[]>('/email/inbox');
export const getEmail = (id: string) => request<Email>(`/email/${id}`);
export const sendEmail = (data: { to: string; subject: string; body: string }) =>
	request<void>('/email/send', { method: 'POST', body: JSON.stringify(data) });

// Calendar
export const getTodayEvents = () => request<CalendarEvent[]>('/calendar/today');
export const getUpcomingEvents = () => request<CalendarEvent[]>('/calendar/upcoming');
export const createEvent = (data: Partial<CalendarEvent>) =>
	request<CalendarEvent>('/calendar/events', { method: 'POST', body: JSON.stringify(data) });

// Chat
export const getChatSessions = () =>
	request<WrappedResponse<ChatSession>>('/chat/sessions').then(unwrapList);
export const createChatSession = (title: string) =>
	request<ChatSession>('/chat/sessions', {
		method: 'POST',
		body: JSON.stringify({ title, key: generateSessionKey() })
	});
export const deleteChatSession = (key: string) =>
	request<void>(`/chat/sessions/${key}`, { method: 'DELETE' });
export const getChatHistory = (sessionKey: string) =>
	request<ChatSession>(`/chat/sessions/${sessionKey}`);

/** Send a chat message via POST and stream the SSE response */
export async function sendChat(
	sessionKey: string,
	message: string,
	onData: (text: string) => void,
	onDone: () => void,
	onError: (err: Error) => void
): Promise<() => void> {
	const token = getToken();
	const controller = new AbortController();

	try {
		const res = await fetch(`${getBaseUrl()}/chat/send`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {})
			},
			body: JSON.stringify({ sessionKey, message }),
			signal: controller.signal
		});

		if (res.status === 401) {
			logout();
			onError(new Error('Unauthorized'));
			return () => controller.abort();
		}

		if (!res.ok) {
			onError(new Error(`Chat request failed: ${res.status}`));
			return () => controller.abort();
		}

		const reader = res.body?.getReader();
		if (!reader) {
			onError(new Error('No response stream'));
			return () => controller.abort();
		}

		const decoder = new TextDecoder();
		(async () => {
			try {
				let buffer = '';
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';
					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							if (data === '[DONE]') {
								onDone();
								return;
							}
							onData(data);
						}
					}
				}
				onDone();
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					onError(err as Error);
				}
			}
		})();
	} catch (err) {
		if ((err as Error).name !== 'AbortError') {
			onError(err as Error);
		}
	}

	return () => controller.abort();
}

// Members
export const getMembers = () =>
	request<WrappedResponse<Member>>('/members').then(unwrapList);
export const getUsers = () =>
	request<WrappedResponse<Member>>('/users').then(unwrapList);
export const getAgents = () =>
	request<WrappedResponse<Member>>('/agents').then(unwrapList);

// Messages
export const sendMessage = (toId: string, content: string) =>
	request<Message>('/messages', { method: 'POST', body: JSON.stringify({ toId, content }) });
export const getConversation = (withId: string) =>
	request<WrappedResponse<Message>>(`/messages?with=${encodeURIComponent(withId)}`).then(unwrapList);
export const getConversations = () =>
	request<WrappedResponse<Conversation>>('/messages/conversations').then(unwrapList);
export const markRead = (id: string) =>
	request<void>(`/messages/${id}/read`, { method: 'PUT' });
export const getUnreadCount = () =>
	request<{ count: number }>('/messages/unread').then(r => r.count);

function generateSessionKey(): string {
	return crypto.randomUUID();
}
