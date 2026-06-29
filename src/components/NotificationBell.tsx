import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.notifications.list({ acknowledged: false, pageSize: 10 }),
    refetchInterval: 10000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) => api.notifications.acknowledge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data || [];
  const count = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded text-c3-muted hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-c3-error text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-lg bg-c3-surface border border-c3-border shadow-2xl z-50">
            <div className="p-3 border-b border-c3-border flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {count > 0 && (
                <span className="text-xs text-c3-muted">{count} unread</span>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-c3-muted text-center">All clear 👍</div>
            ) : (
              <div className="divide-y divide-c3-border/50">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-c3-border/20 transition-colors">
                    <div className="flex items-start gap-2">
                      <SeverityDot severity={n.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-c3-text leading-tight">{n.message}</p>
                        <p className="text-xs text-c3-muted mt-1">
                          {new Date(n.createdAt).toLocaleTimeString()}
                          {n.agentId && ` · ${n.agentId}`}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); acknowledgeMutation.mutate(n.id); }}
                        className="text-xs text-c3-accent hover:underline flex-shrink-0 min-h-[44px] flex items-center"
                        title="Dismiss"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    info: 'bg-c3-accent',
    warning: 'bg-c3-warning',
    critical: 'bg-c3-error animate-pulse',
  };
  return <span className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${colors[severity] || 'bg-gray-500'}`} />;
}
