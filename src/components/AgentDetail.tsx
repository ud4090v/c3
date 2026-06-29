import type { Agent } from '@c3/shared';
import { StatusBadge } from './StatusBadge';

interface Props {
  agent: Agent;
  onClose: () => void;
}

export function AgentDetail({ agent, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-c3-surface border border-c3-border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{agent.name}</h3>
            <p className="text-sm text-c3-muted">
              {agent.department} · {agent.position}
            </p>
          </div>
          <button onClick={onClose} className="text-c3-muted hover:text-white text-xl">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-c3-muted uppercase tracking-wide">Status</label>
            <div className="mt-1">
              <StatusBadge status={agent.status} />
            </div>
          </div>

          <div>
            <label className="text-xs text-c3-muted uppercase tracking-wide">Session Key</label>
            <div className="mt-1 font-mono text-sm bg-c3-bg rounded px-2 py-1 text-c3-muted">
              {agent.sessionKey}
            </div>
          </div>

          <div>
            <label className="text-xs text-c3-muted uppercase tracking-wide">Capabilities</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {agent.capabilities.map((cap) => (
                <span key={cap} className="rounded-full bg-c3-accent/20 px-2 py-0.5 text-xs text-c3-accent">
                  {cap}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-c3-muted uppercase tracking-wide">Last Seen</label>
            <div className="mt-1 text-sm">{new Date(agent.lastSeen).toLocaleString()}</div>
          </div>

          {agent.metadata && Object.keys(agent.metadata).length > 0 && (
            <div>
              <label className="text-xs text-c3-muted uppercase tracking-wide">Metadata</label>
              <pre className="mt-1 rounded bg-c3-bg p-2 text-xs text-c3-muted overflow-auto max-h-32">
                {JSON.stringify(agent.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
