// Agent types
export interface Agent {
  id: string;
  name: string;
  department: AgentDepartment;
  position: string;
  capabilities: string[];
  sessionKey: string;
  lastSeen: string;
  status: AgentStatus;
  metadata: Record<string, unknown>;
}

export type AgentStatus = 'online' | 'offline' | 'busy' | 'error';
export type AgentDepartment = 'Executive' | 'Engineering' | 'Product' | 'Infrastructure' | 'Security' | 'Intelligence' | string;

export interface AgentRegisterPayload {
  id: string;
  name: string;
  department: AgentDepartment;
  position: string;
  capabilities: string[];
  sessionKey: string;
  metadata?: Record<string, unknown>;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  assignedTo: string | null;
  department: string;
  position: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  result: string | null;
  context: Record<string, unknown> | null;
}

export type TaskStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed';
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface TaskCreatePayload {
  title: string;
  description: string;
  createdBy: string;
  assignedTo?: string;
  department: string;
  position?: string;
  priority?: TaskPriority;
  context?: Record<string, unknown>;
}

export interface TaskUpdatePayload {
  status?: TaskStatus;
  assignedTo?: string;
  result?: string;
}

// Audit types
export interface AuditMessage {
  id: number;
  timestamp: string;
  fromAgent: string;
  toAgent: string;
  channel: string;
  message: string;
  metadata: Record<string, unknown> | null;
}

export interface AuditMessageCreatePayload {
  fromAgent: string;
  toAgent: string;
  channel: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// Org chart
export interface OrgChartNode {
  department: string;
  positions: {
    position: string;
    agents: Pick<Agent, 'id' | 'name' | 'status'>[];
  }[];
}

// API responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// WebSocket events
export interface WsEvents {
  'agent.status': { agentId: string; status: AgentStatus; timestamp: string };
  'task.updated': { task: Task; action: 'created' | 'assigned' | 'updated' | 'completed' };
  'message.sent': { message: AuditMessage };
}

// Notification types
export interface Notification {
  id: number;
  type: NotificationType;
  severity: NotificationSeverity;
  message: string;
  agentId: string | null;
  acknowledged: boolean;
  createdAt: string;
}

export type NotificationType = 'agent_offline' | 'task_failed' | 'task_completed' | 'system' | string;
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface NotificationCreatePayload {
  type: NotificationType;
  severity: NotificationSeverity;
  message: string;
  agentId?: string;
}

// Analytics types
export interface DepartmentTaskStats {
  department: string;
  completed: number;
  failed: number;
  pending: number;
  inProgress: number;
}

export interface AgentLeaderboard {
  agentId: string;
  agentName: string;
  department: string;
  completed: number;
  failed: number;
  total: number;
  errorRate: number;
}

// Health
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalAgents: number;
  onlineAgents: number;
  pendingTasks: number;
  completedToday: number;
  uptime: number;
}
