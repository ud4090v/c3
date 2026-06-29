import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { StatusBadge } from './StatusBadge';
import { AgentDetail } from './AgentDetail';
import type { Agent } from '@c3/shared';

export function AgentDirectory() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.agents.list(),
  });

  const agents = data?.data || [];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Agent Directory</h2>
      {isLoading ? (
        <div className="text-c3-muted">Loading agents…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-c3-border text-left text-c3-muted">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Department</th>
                <th className="pb-2 pr-4">Position</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Last Seen</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b border-c3-border/50 hover:bg-c3-border/20 cursor-pointer transition-colors"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <td className="py-3 pr-4 font-medium text-white">{agent.name}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded bg-c3-accent/20 px-2 py-0.5 text-xs text-c3-accent">
                      {agent.department}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{agent.position}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="py-3 pr-4 text-c3-muted">{formatTime(agent.lastSeen)}</td>
                  <td className="py-3">
                    <button
                      className="text-c3-accent hover:underline text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAgent(agent);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedAgent && (
        <AgentDetail agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return d.toLocaleTimeString();
}
