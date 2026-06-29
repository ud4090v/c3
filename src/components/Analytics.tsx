import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { DepartmentTaskStats, AgentLeaderboard } from '@c3/shared';

export function Analytics() {
  const { data: deptData } = useQuery({
    queryKey: ['analytics', 'departments'],
    queryFn: () => api.analytics.departments(),
  });
  const { data: leaderboardData } = useQuery({
    queryKey: ['analytics', 'leaderboard'],
    queryFn: () => api.analytics.leaderboard(),
  });
  const { data: summaryData } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.analytics.summary(),
  });

  const departments = deptData?.data || [];
  const leaderboard = leaderboardData?.data || [];
  const summary = summaryData?.data;

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Performance Analytics</h2>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryCard label="Pending" value={summary.pending} color="text-gray-400" />
          <SummaryCard label="Assigned" value={summary.assigned} color="text-c3-accent" />
          <SummaryCard label="In Progress" value={summary.inProgress} color="text-c3-warning" />
          <SummaryCard label="Completed" value={summary.completed} color="text-c3-success" />
          <SummaryCard label="Failed" value={summary.failed} color="text-c3-error" />
        </div>
      )}

      {/* Task distribution donut */}
      {summary && <TaskDistribution summary={summary} />}

      {/* Department bar chart */}
      <DepartmentChart departments={departments} />

      {/* Agent leaderboard */}
      <LeaderboardTable leaderboard={leaderboard} />
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-c3-surface border border-c3-border p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-c3-muted mt-1">{label}</div>
    </div>
  );
}

function TaskDistribution({ summary }: { summary: { pending: number; assigned: number; inProgress: number; completed: number; failed: number } }) {
  const total = summary.pending + summary.assigned + summary.inProgress + summary.completed + summary.failed;
  if (total === 0) return null;

  const segments = [
    { label: 'Pending', value: summary.pending, color: '#6b7280' },
    { label: 'Assigned', value: summary.assigned, color: '#3b82f6' },
    { label: 'In Progress', value: summary.inProgress, color: '#f59e0b' },
    { label: 'Completed', value: summary.completed, color: '#10b981' },
    { label: 'Failed', value: summary.failed, color: '#ef4444' },
  ].filter((s) => s.value > 0);

  // SVG donut chart
  const size = 160;
  const radius = 60;
  const innerRadius = 40;
  const cx = size / 2;
  const cy = size / 2;

  let startAngle = -90;
  const paths = segments.map((seg) => {
    const angle = (seg.value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const ix1 = cx + innerRadius * Math.cos(endRad);
    const iy1 = cy + innerRadius * Math.sin(endRad);
    const ix2 = cx + innerRadius * Math.cos(startRad);
    const iy2 = cy + innerRadius * Math.sin(startRad);

    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
    startAngle = endAngle;
    return { ...seg, d };
  });

  return (
    <div className="rounded-lg bg-c3-surface border border-c3-border p-4">
      <h3 className="text-sm font-semibold mb-4">Task Distribution</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} stroke="#111827" strokeWidth="1" />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="#6b7280" fontSize="10">total</text>
        </svg>
        <div className="flex flex-wrap gap-3">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-c3-muted">{s.label}: {s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DepartmentChart({ departments }: { departments: DepartmentTaskStats[] }) {
  if (departments.length === 0) {
    return (
      <div className="rounded-lg bg-c3-surface border border-c3-border p-4">
        <h3 className="text-sm font-semibold mb-3">Tasks by Department</h3>
        <p className="text-sm text-c3-muted text-center py-4">No task data yet</p>
      </div>
    );
  }

  const maxValue = Math.max(...departments.map((d) => d.completed + d.failed + d.pending + d.inProgress), 1);

  return (
    <div className="rounded-lg bg-c3-surface border border-c3-border p-4">
      <h3 className="text-sm font-semibold mb-4">Tasks by Department</h3>
      <div className="space-y-3">
        {departments.map((dept) => {
          const total = dept.completed + dept.failed + dept.pending + dept.inProgress;
          const pct = (total / maxValue) * 100;
          return (
            <div key={dept.department}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white">{dept.department}</span>
                <span className="text-xs text-c3-muted">{total} tasks</span>
              </div>
              <div className="h-6 bg-c3-bg rounded-full overflow-hidden flex">
                {dept.completed > 0 && (
                  <div className="bg-c3-success h-full" style={{ width: `${(dept.completed / maxValue) * 100}%` }} />
                )}
                {dept.inProgress > 0 && (
                  <div className="bg-c3-warning h-full" style={{ width: `${(dept.inProgress / maxValue) * 100}%` }} />
                )}
                {dept.pending > 0 && (
                  <div className="bg-gray-500 h-full" style={{ width: `${(dept.pending / maxValue) * 100}%` }} />
                )}
                {dept.failed > 0 && (
                  <div className="bg-c3-error h-full" style={{ width: `${(dept.failed / maxValue) * 100}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderboardTable({ leaderboard }: { leaderboard: AgentLeaderboard[] }) {
  return (
    <div className="rounded-lg bg-c3-surface border border-c3-border p-4">
      <h3 className="text-sm font-semibold mb-4">Agent Leaderboard</h3>
      {leaderboard.length === 0 ? (
        <p className="text-sm text-c3-muted text-center py-4">No task assignments yet</p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-c3-border text-left text-c3-muted">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Agent</th>
                <th className="pb-2 pr-4">Department</th>
                <th className="pb-2 pr-4 text-right">Completed</th>
                <th className="pb-2 pr-4 text-right">Failed</th>
                <th className="pb-2 text-right">Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr key={entry.agentId} className="border-b border-c3-border/50 hover:bg-c3-border/20">
                  <td className="py-2 pr-4 text-c3-muted">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium text-white">{entry.agentName}</td>
                  <td className="py-2 pr-4">
                    <span className="rounded bg-c3-accent/20 px-2 py-0.5 text-xs text-c3-accent">{entry.department}</span>
                  </td>
                  <td className="py-2 pr-4 text-right text-c3-success">{entry.completed}</td>
                  <td className="py-2 pr-4 text-right text-c3-error">{entry.failed}</td>
                  <td className="py-2 text-right">
                    <span className={entry.errorRate > 20 ? 'text-c3-error' : 'text-c3-muted'}>
                      {entry.errorRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
