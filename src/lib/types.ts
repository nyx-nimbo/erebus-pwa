export interface User {
	id: string;
	email: string;
	name: string;
	picture: string;
}

export interface Client {
	id: string;
	name: string;
	business_units: BusinessUnit[];
	created_at: string;
	updated_at: string;
}

export interface BusinessUnit {
	id: string;
	name: string;
	client_id: string;
}

export interface Project {
	id: string;
	name: string;
	description: string;
	status: ProjectStatus;
	client_id?: string;
	client_name?: string;
	parent_id?: string;
	is_group: boolean;
	sub_projects?: Project[];
	ports?: PortMapping[];
	env_files?: EnvFile[];
	tasks?: Task[];
	created_at: string;
	updated_at: string;
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
	project_id: string;
	assigned_to?: string;
	priority: number;
	created_at: string;
	updated_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface Idea {
	id: string;
	title: string;
	description: string;
	status: IdeaStatus;
	research?: string;
	suggested_tasks?: string[];
	created_at: string;
	updated_at: string;
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
	timestamp?: string;
}

export interface ChatSession {
	key: string;
	title: string;
	messages: ChatMessage[];
	created_at: string;
}

export interface HealthStatus {
	status: string;
	version?: string;
	uptime?: string;
}

export interface ApiError {
	error: string;
	message: string;
	status: number;
}
