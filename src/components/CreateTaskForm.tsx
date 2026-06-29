import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TaskPriority } from '@c3/shared';

const DEPARTMENTS = ['Executive', 'Engineering', 'Product', 'Infrastructure', 'Security', 'Intelligence'];

export function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    description: '',
    department: 'Engineering',
    assignedTo: '',
    priority: 3 as TaskPriority,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.agents.list(),
  });
  const agents = agentsData?.data || [];

  const mutation = useMutation({
    mutationFn: () =>
      api.tasks.create({
        ...form,
        assignedTo: form.assignedTo || undefined,
        createdBy: 'cormac',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-c3-surface border border-c3-border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">Create Task</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-c3-muted uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded bg-c3-bg border border-c3-border px-3 py-2 text-sm text-c3-text focus:border-c3-accent focus:outline-none"
              placeholder="Task title…"
            />
          </div>
          <div>
            <label className="text-xs text-c3-muted uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded bg-c3-bg border border-c3-border px-3 py-2 text-sm text-c3-text focus:border-c3-accent focus:outline-none h-24 resize-none"
              placeholder="Describe the task…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-c3-muted uppercase tracking-wide">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="mt-1 w-full rounded bg-c3-bg border border-c3-border px-3 py-2 text-sm text-c3-text focus:border-c3-accent focus:outline-none"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-c3-muted uppercase tracking-wide">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) as TaskPriority })}
                className="mt-1 w-full rounded bg-c3-bg border border-c3-border px-3 py-2 text-sm text-c3-text focus:border-c3-accent focus:outline-none"
              >
                <option value={1}>1 — Low</option>
                <option value={2}>2 — Normal</option>
                <option value={3}>3 — Medium</option>
                <option value={4}>4 — High</option>
                <option value={5}>5 — Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-c3-muted uppercase tracking-wide">Assign To (optional)</label>
            <select
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className="mt-1 w-full rounded bg-c3-bg border border-c3-border px-3 py-2 text-sm text-c3-text focus:border-c3-accent focus:outline-none"
            >
              <option value="">Auto-route (best available)</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.department})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-c3-muted hover:text-white transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.title || mutation.isPending}
            className="rounded bg-c3-accent px-4 py-2 text-sm font-medium text-white hover:bg-c3-accent/80 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {mutation.isPending ? 'Creating…' : 'Create Task'}
          </button>
        </div>
        {mutation.isError && (
          <p className="mt-2 text-xs text-c3-error">{(mutation.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
