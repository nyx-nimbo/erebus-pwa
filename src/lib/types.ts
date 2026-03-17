export interface User {
	id: string;
	email: string;
	name: string;
	picture: string;
}

export interface Client {
	id: string;
	name: string;
	email?: string;
	phone?: string;
	company?: string;
	notes?: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

export interface BusinessUnit {
	id: string;
	name: string;
	clientId: string;
	contact?: string;
	email?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface Project {
	id: string;
	name: string;
	description: string;
	status: ProjectStatus;
	clientId?: string;
	parentId?: string;
	isGroup: boolean;
	priority?: string;
	tags?: string[];
	startDate?: string;
	dueDate?: string;
	subProjects?: Project[];
	ports?: PortMapping[];
	envFiles?: EnvFile[];
	createdAt: string;
	updatedAt: string;
}

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface PortMapping {
	port: number;
	description: string;
}

export interface EnvFile {
	name: string;
	content: string;
}

export interface Task {
	id: string;
	title: string;
	description: string;
	status: TaskStatus;
	projectId: string;
	assignedTo?: string;
	claimedBy?: string;
	priority?: string;
	dueDate?: string;
	parentId?: string;
	createdAt: string;
	updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface ResearchEntry {
	id: string;
	content: string;
	source?: string;
	createdAt: string;
}

export interface Idea {
	id: string;
	title: string;
	description: string;
	status: IdeaStatus;
	category?: string;
	tags?: string[];
	research?: ResearchEntry[];
	createdAt: string;
	updatedAt: string;
}

export type IdeaStatus = 'new' | 'researching' | 'researched' | 'developing' | 'paused';

export interface Email {
	id: string;
	from: string;
	to: string;
	subject: string;
	body: string;
	snippet: string;
	date: string;
	read: boolean;
	labels: string[];
}

export interface CalendarEvent {
	id: string;
	title: string;
	description?: string;
	start: string;
	end: string;
	location?: string;
	attendees?: string[];
}

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface ChatSession {
	id: string;
	key: string;
	title: string;
	model?: string;
	messages?: ChatMessage[];
	createdAt: string;
	updatedAt: string;
}

export interface HealthStatus {
	status: string;
	service?: string;
	database?: string;
	time?: string;
}

export interface Member {
	id: string;
	name: string;
	email?: string;
	type: 'user' | 'agent';
	status: 'online' | 'offline';
	lastSeen?: string;
	picture?: string;
}

export interface Message {
	id: string;
	fromId: string;
	fromName: string;
	fromType: 'user' | 'agent';
	toId: string;
	toName: string;
	content: string;
	read: boolean;
	createdAt: string;
}

export interface Conversation {
	memberId: string;
	memberName: string;
	memberType: 'user' | 'agent';
	lastMessage: string;
	lastMessageAt: string;
	unreadCount: number;
}

export interface ApiError {
	error: string;
	code: number;
}
