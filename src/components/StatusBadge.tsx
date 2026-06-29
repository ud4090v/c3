import type { AgentStatus } from '@c3/shared';

const STATUS_CONFIG: Record<AgentStatus, { color: string; label: string; dot: string }> = {
  online: { color: 'text-c3-success', label: 'Online', dot: 'bg-c3-success' },
  offline: { color: 'text-c3-muted', label: 'Offline', dot: 'bg-gray-500' },
  busy: { color: 'text-c3-warning', label: 'Busy', dot: 'bg-c3-warning' },
  error: { color: 'text-c3-error', label: 'Error', dot: 'bg-c3-error' },
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
      <span className={`h-2 w-2 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}
