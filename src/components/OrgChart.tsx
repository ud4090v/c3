import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AgentDetail } from './AgentDetail';
import type { Agent, AgentStatus } from '@c3/shared';

export function OrgChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['org-chart'],
    queryFn: () => api.system.orgChart(),
  });
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.agents.list(),
  });

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const orgChart = data?.data || [];
  const agents = agentsData?.data || [];
  const selectedAgent = selectedAgentId ? agents.find((a) => a.id === selectedAgentId) : null;

  const toggleDept = (dept: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  if (isLoading) return <div className="text-c3-muted">Loading org chart…</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Organization Chart</h2>

      {/* Tree layout */}
      <div className="flex flex-col items-center">
        {/* Root node */}
        <div className="rounded-lg bg-c3-accent/20 border border-c3-accent px-4 py-2 text-sm font-bold text-c3-accent">
          OpenClaw Org
        </div>

        {/* Connector line down */}
        <div className="w-px h-6 bg-c3-border" />

        {/* Horizontal bar connecting all departments */}
        {orgChart.length > 1 && (
          <div className="relative w-full max-w-4xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-c3-border" style={{ width: `${Math.min(90, orgChart.length * 18)}%` }} />
          </div>
        )}

        {/* Department nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2 w-full">
          {orgChart.map((dept) => (
            <div key={dept.department} className="flex flex-col items-center">
              {/* Connector line */}
              <div className="w-px h-4 bg-c3-border" />

              {/* Department card */}
              <button
                onClick={() => toggleDept(dept.department)}
                className="w-full rounded-lg bg-c3-surface border border-c3-border p-4 text-left hover:border-c3-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-c3-accent">{dept.department}</h3>
                  <span className="text-c3-muted text-xs">
                    {collapsed.has(dept.department) ? '▶' : '▼'}
                  </span>
                </div>

                {!collapsed.has(dept.department) && (
                  <div className="space-y-2 mt-2">
                    {dept.positions.map((pos) => (
                      <div key={pos.position}>
                        <div className="text-xs text-c3-muted uppercase tracking-wide mb-1 border-l-2 border-c3-border pl-2">
                          {pos.position}
                        </div>
                        <div className="space-y-1 pl-2">
                          {pos.agents.map((agent) => (
                            <div
                              key={agent.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedAgentId(agent.id); }}
                              className="flex items-center gap-2 rounded bg-c3-bg px-3 py-2 cursor-pointer hover:bg-c3-border/30 transition-colors min-h-[44px]"
                            >
                              <StatusDot status={agent.status as AgentStatus} />
                              <span className="text-sm text-white font-medium">{agent.name}</span>
                              <span className="text-xs text-c3-muted ml-auto capitalize">{agent.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedAgent && (
        <AgentDetail agent={selectedAgent} onClose={() => setSelectedAgentId(null)} />
      )}
    </div>
  );
}

function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = {
    online: 'bg-c3-success',
    busy: 'bg-c3-warning',
    offline: 'bg-gray-500',
    error: 'bg-c3-error',
  };
  return (
    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${colors[status] || 'bg-gray-500'} ${status === 'online' ? 'animate-pulse' : ''}`} />
  );
}
