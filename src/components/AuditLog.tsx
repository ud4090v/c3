import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const CHANNELS = ['', 'internal', 'discord', 'telegram', 'webchat'];
const PAGE_SIZE = 20;

export function AuditLog() {
  const [filterAgent, setFilterAgent] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSince, setDateSince] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', filterAgent, filterChannel, searchQuery, dateSince, page],
    queryFn: () =>
      api.audit.messages({
        fromAgent: filterAgent || undefined,
        channel: filterChannel || undefined,
        query: searchQuery || undefined,
        since: dateSince || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const messages = data?.data || [];
  const total = (data as { total?: number })?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Audit Log</h2>
          <span className="text-xs text-c3-muted">{total} messages</span>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Search messages…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="flex-1 rounded bg-c3-bg border border-c3-border px-3 py-2 text-sm text-c3-text placeholder-c3-muted focus:border-c3-accent focus:outline-none min-h-[44px]"
          />
          <input
            type="text"
            placeholder="Filter by agent…"
            value={filterAgent}
            onChange={(e) => { setFilterAgent(e.target.value); setPage(1); }}
            className="rounded bg-c3-bg border border-c3-border px-3 py-2 text-sm text-c3-text placeholder-c3-muted focus:border-c3-accent focus:outline-none sm:w-40 min-h-[44px]"
          />
          <select
            value={filterChannel}
            onChange={(e) => { setFilterChannel(e.target.value); setPage(1); }}
            className="rounded bg-c3-bg border border-c3-border px-3 py-2 text-sm text-c3-text focus:border-c3-accent focus:outline-none sm:w-36 min-h-[44px]"
          >
            <option value="">All channels</option>
            {CHANNELS.filter(Boolean).map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateSince}
            onChange={(e) => { setDateSince(e.target.value); setPage(1); }}
            className="rounded bg-c3-bg border border-c3-border px-3 py-2 text-sm text-c3-text focus:border-c3-accent focus:outline-none sm:w-40 min-h-[44px]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-c3-muted">Loading audit log…</div>
      ) : messages.length === 0 ? (
        <div className="text-c3-muted text-sm py-8 text-center">No messages found</div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-c3-border text-left text-c3-muted">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">From</th>
                  <th className="pb-2 pr-4">To</th>
                  <th className="pb-2 pr-4">Channel</th>
                  <th className="pb-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id} className="border-b border-c3-border/50 hover:bg-c3-border/20">
                    <td className="py-2 pr-4 text-c3-muted whitespace-nowrap">
                      {new Date(msg.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 font-medium text-white">{msg.fromAgent}</td>
                    <td className="py-2 pr-4">{msg.toAgent}</td>
                    <td className="py-2 pr-4">
                      <span className="rounded bg-c3-border px-1.5 py-0.5 text-xs">{msg.channel}</span>
                    </td>
                    <td className="py-2 text-c3-muted max-w-md truncate">{msg.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded bg-c3-bg border border-c3-border px-3 py-1.5 text-sm text-c3-text disabled:opacity-30 hover:border-c3-accent min-h-[44px]"
              >
                ← Prev
              </button>
              <span className="text-sm text-c3-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded bg-c3-bg border border-c3-border px-3 py-1.5 text-sm text-c3-text disabled:opacity-30 hover:border-c3-accent min-h-[44px]"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
