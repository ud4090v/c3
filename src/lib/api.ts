const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  agents: {
    list: (params?: { department?: string; status?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return fetchJson<{ success: boolean; data: import('@c3/shared').Agent[] }>(`/agents${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) =>
      fetchJson<{ success: boolean; data: import('@c3/shared').Agent }>(`/agents/${encodeURIComponent(id)}`),
    register: (payload: import('@c3/shared').AgentRegisterPayload) =>
      fetchJson<{ success: boolean; data: import('@c3/shared').Agent }>('/agents/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  tasks: {
    list: (params?: { status?: string; department?: string; assignedTo?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return fetchJson<{ success: boolean; data: import('@c3/shared').Task[]; total: number }>(`/tasks${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) =>
      fetchJson<{ success: boolean; data: import('@c3/shared').Task }>(`/tasks/${id}`),
    create: (payload: import('@c3/shared').TaskCreatePayload) =>
      fetchJson<{ success: boolean; data: import('@c3/shared').Task }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: import('@c3/shared').TaskUpdatePayload) =>
      fetchJson<{ success: boolean; data: import('@c3/shared').Task }>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  },

  audit: {
    messages: (params?: { fromAgent?: string; toAgent?: string; channel?: string; since?: string; query?: string; page?: number; pageSize?: number }) => {
      const qs = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') qs.set(k, String(v));
        });
      }
      const qsStr = qs.toString();
      return fetchJson<{ success: boolean; data: import('@c3/shared').AuditMessage[]; total: number }>(
        `/audit/messages${qsStr ? `?${qsStr}` : ''}`,
      );
    },
    log: (payload: import('@c3/shared').AuditMessageCreatePayload) =>
      fetchJson<{ success: boolean; data: import('@c3/shared').AuditMessage }>('/audit/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  notifications: {
    list: (params?: { acknowledged?: boolean; page?: number; pageSize?: number }) => {
      const qs = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined) qs.set(k, String(v));
        });
      }
      const qsStr = qs.toString();
      return fetchJson<{ success: boolean; data: import('@c3/shared').Notification[]; total: number }>(
        `/notifications${qsStr ? `?${qsStr}` : ''}`,
      );
    },
    acknowledge: (id: number) =>
      fetchJson<{ success: boolean }>(`/notifications/${id}/acknowledge`, { method: 'PATCH' }),
  },

  analytics: {
    departments: () =>
      fetchJson<{ success: boolean; data: import('@c3/shared').DepartmentTaskStats[] }>('/analytics/departments'),
    leaderboard: () =>
      fetchJson<{ success: boolean; data: import('@c3/shared').AgentLeaderboard[] }>('/analytics/leaderboard'),
    summary: () =>
      fetchJson<{ success: boolean; data: { pending: number; assigned: number; inProgress: number; completed: number; failed: number } }>('/analytics/summary'),
  },

  vault: {
    tree: () => fetchJson<{ success: boolean; data: unknown[] }>('/vault/tree'),
    file: (vaultPath: string) => fetchJson<{ success: boolean; data: any }>(`/vault/file?path=${encodeURIComponent(vaultPath)}`),
    search: (q: string) => fetchJson<{ success: boolean; data: any[]; total: number }>(`/vault/search?q=${encodeURIComponent(q)}`),
  },

  system: {
    health: () => fetchJson<{ success: boolean; data: import('@c3/shared').HealthStatus }>('/health'),
    orgChart: () =>
      fetchJson<{ success: boolean; data: import('@c3/shared').OrgChartNode[] }>('/org-chart'),
    syncStatus: () =>
      fetchJson<{ success: boolean; data: {
        lastSuccessfulQueryAt: string | null;
        lastFailedQueryAt: string | null;
        lastError: string | null;
        consecutiveFailures: number;
        mockFallbackActive: boolean;
        requestCount24h: number;
      } }>('/system/sync-status'),
  },
};
