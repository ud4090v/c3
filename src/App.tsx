import { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useRealtimeUpdates } from './hooks/useRealtimeUpdates';
import { HealthBar } from './components/HealthBar';
import { AgentDirectory } from './components/AgentDirectory';
import { TaskBoard } from './components/TaskBoard';
import { AuditLog } from './components/AuditLog';
import { OrgChart } from './components/OrgChart';
import { Analytics } from './components/Analytics';
import { CreateTaskForm } from './components/CreateTaskForm';
import { NotificationBell } from './components/NotificationBell';
import { DataFreshness } from './components/DataFreshness';
import { VaultBrowser } from './components/VaultBrowser';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/agents', label: 'Agents' },
  { path: '/tasks', label: 'Tasks' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/audit', label: 'Audit Log' },
  { path: '/org', label: 'Org Chart' },
  { path: '/vault', label: 'Vault' },
];

export default function App() {
  useRealtimeUpdates();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-c3-bg text-c3-text">
      {/* Header */}
      <header className="border-b border-c3-border bg-c3-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-c3-muted hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <path d="M3 12h18" />
                    <path d="M3 6h18" />
                    <path d="M3 18h18" />
                  </>
                )}
              </svg>
            </button>
            <div className="text-xl font-bold text-white tracking-tight">
              <span className="text-c3-accent">C3</span> Command Center
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-c3-accent/20 text-c3-accent font-medium'
                      : 'text-c3-muted hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <DataFreshness />
            <NotificationBell />
            <button
              onClick={() => setShowCreateTask(true)}
              className="rounded bg-c3-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-c3-accent/80 transition-colors min-h-[44px]"
            >
              + New Task
            </button>
          </div>
        </div>

        {/* Mobile nav slide-out */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-c3-border bg-c3-surface px-4 py-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-3 rounded text-sm transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-c3-accent/20 text-c3-accent font-medium'
                      : 'text-c3-muted hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="mb-6">
          <HealthBar />
        </div>
        <Routes>
          <Route
            path="/"
            element={
              <div className="space-y-8">
                <OrgChart />
                <TaskBoard />
                <AgentDirectory />
              </div>
            }
          />
          <Route path="/agents" element={<AgentDirectory />} />
          <Route path="/tasks" element={<TaskBoard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/org" element={<OrgChart />} />
          <Route path="/vault" element={<VaultBrowser />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-c3-border py-3 text-center text-xs text-c3-muted">
        C3 — Command & Control Center · OpenClaw Matrix Org
      </footer>

      {/* Modals */}
      {showCreateTask && <CreateTaskForm onClose={() => setShowCreateTask(false)} />}
    </div>
  );
}
