import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function HealthBar() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.system.health(),
    refetchInterval: 5000,
  });

  const health = data?.data;
  if (!health) return null;

  const statusColor =
    health.status === 'healthy'
      ? 'bg-c3-success'
      : health.status === 'degraded'
        ? 'bg-c3-warning'
        : 'bg-c3-error';

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 rounded-lg bg-c3-surface border border-c3-border p-4">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${statusColor} animate-pulse`} />
        <span className="text-sm font-semibold uppercase tracking-wide">{health.status}</span>
      </div>
      <Stat label="Agents" value={`${health.onlineAgents}/${health.totalAgents}`} />
      <Stat label="Pending" value={health.pendingTasks} />
      <Stat label="Completed" value={health.completedToday} />
      <Stat label="Uptime" value={formatUptime(health.uptime)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-c3-muted">{label}</div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
