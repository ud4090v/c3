import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

type SyncStatus = {
  lastSuccessfulQueryAt: string | null;
  lastFailedQueryAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  mockFallbackActive: boolean;
  requestCount24h: number;
};

function getRelativeTime(timestamp: string | null): string {
  if (!timestamp) {
    return 'never synced';
  }

  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();

  if (diffMs < 0) {
    return 'just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 5) {
    return `${minutes}m ago`;
  }

  if (minutes < 60) {
    return 'stale (>5m)';
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function DataFreshness(): React.ReactElement {
  const { data, isError } = useQuery({
    queryKey: ['syncStatus'],
    queryFn: () => api.system.syncStatus(),
    refetchInterval: 30000,
    retry: 1,
    staleTime: 15000,
  });

  const status: SyncStatus | undefined = data?.data;

  // Handle errors silently — show degraded state
  const lastAt = status?.lastSuccessfulQueryAt ?? null;
  const timeLabel = getRelativeTime(lastAt);
  const failures = status?.consecutiveFailures ?? 0;
  const isMock = status?.mockFallbackActive ?? false;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1 rounded-full border border-c3-border bg-c3-surface px-2 py-0.5 font-medium text-c3-text">
        Data: {timeLabel}
      </span>

      {failures > 0 && (
        <span className="text-[10px] text-c3-muted">
          {failures} {failures === 1 ? 'failure' : 'failures'}
        </span>
      )}

      {isMock && (
        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
          MOCK DATA — OpenClaw CLI unavailable
        </span>
      )}
    </div>
  );
}
