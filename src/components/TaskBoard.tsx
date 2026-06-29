import { useState, DragEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Task, TaskStatus } from '@c3/shared';

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'pending', label: 'Pending', color: 'border-gray-500' },
  { status: 'assigned', label: 'Assigned', color: 'border-c3-accent' },
  { status: 'in-progress', label: 'In Progress', color: 'border-c3-warning' },
  { status: 'completed', label: 'Completed', color: 'border-c3-success' },
];

const DEPARTMENTS = ['', 'Executive', 'Engineering', 'Product', 'Infrastructure', 'Security', 'Intelligence'];
const PRIORITIES = [0, 1, 2, 3, 4, 5];

export function TaskBoard() {
  const [filterDept, setFilterDept] = useState('');
  const [filterPriority, setFilterPriority] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.tasks.list(),
  });

  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api.tasks.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  let tasks = data?.data || [];

  // Apply filters
  if (filterDept) {
    tasks = tasks.filter((t) => t.department === filterDept);
  }
  if (filterPriority > 0) {
    tasks = tasks.filter((t) => t.priority >= filterPriority);
  }

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    updateMutation.mutate({ id: taskId, status: newStatus });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Task Board</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="rounded bg-c3-bg border border-c3-border px-3 py-1.5 text-sm text-c3-text focus:border-c3-accent focus:outline-none min-h-[44px]"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.filter(Boolean).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(parseInt(e.target.value))}
            className="rounded bg-c3-bg border border-c3-border px-3 py-1.5 text-sm text-c3-text focus:border-c3-accent focus:outline-none min-h-[44px]"
          >
            <option value={0}>All priorities</option>
            <option value={3}>≥ Medium (3+)</option>
            <option value={4}>≥ High (4+)</option>
            <option value={5}>Critical only (5)</option>
          </select>
        </div>
      </div>
      {isLoading ? (
        <div className="text-c3-muted">Loading tasks…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <TaskColumn
              key={col.status}
              label={col.label}
              color={col.color}
              status={col.status}
              tasks={tasks.filter((t) => t.status === col.status)}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskColumn({
  label,
  color,
  status,
  tasks,
  onDrop,
}: {
  label: string;
  color: string;
  status: TaskStatus;
  tasks: Task[];
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onDrop(taskId, status);
  };

  return (
    <div
      className={`rounded-lg bg-c3-surface border-t-2 ${color} p-3 transition-colors ${dragOver ? 'ring-2 ring-c3-accent/50 bg-c3-accent/5' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-c3-muted bg-c3-bg rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-xs text-c3-muted py-4 text-center">No tasks</p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api.tasks.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const priorityColors: Record<number, string> = {
    5: 'bg-c3-error',
    4: 'bg-orange-500',
    3: 'bg-c3-warning',
    2: 'bg-c3-accent',
    1: 'bg-gray-500',
  };

  const priorityLabels: Record<number, string> = {
    5: 'Critical',
    4: 'High',
    3: 'Medium',
    2: 'Normal',
    1: 'Low',
  };

  const nextStatus: Partial<Record<TaskStatus, TaskStatus>> = {
    pending: 'assigned',
    assigned: 'in-progress',
    'in-progress': 'completed',
  };

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="rounded bg-c3-bg border border-c3-border/50 p-3 hover:border-c3-border transition-colors cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-white leading-tight">{task.title}</h4>
        <span
          className={`h-2 w-2 rounded-full flex-shrink-0 mt-1 ${priorityColors[task.priority] || 'bg-gray-500'}`}
          title={priorityLabels[task.priority] || ''}
        />
      </div>
      {task.description && (
        <p className="text-xs text-c3-muted mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs text-c3-muted truncate">
            {task.assignedTo || task.department}
          </span>
          <span className="text-[10px] text-c3-muted/60">P{task.priority}</span>
        </div>
        {nextStatus[task.status] && (
          <button
            className="text-xs text-c3-accent hover:underline whitespace-nowrap min-h-[44px] flex items-center"
            onClick={() => mutation.mutate({ id: task.id, status: nextStatus[task.status]! })}
            disabled={mutation.isPending}
          >
            → {nextStatus[task.status]}
          </button>
        )}
      </div>
    </div>
  );
}
