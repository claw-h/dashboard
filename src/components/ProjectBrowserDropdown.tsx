import React, { useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { ScheduleAction } from '../state/scheduleEngine';
import type { ProjectLifecycle, ScheduleState } from '../types/schedule';

interface ProjectBrowserDropdownProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

function buildMiniBar(pct: number, width = 8): string {
  const filled = Math.round((Math.max(0, Math.min(100, pct)) / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

function getLifecycleStyle(lifecycle: ProjectLifecycle): string {
  switch (lifecycle) {
    case 'PRODUCTION':
      return 'text-emerald-400 border-emerald-800/70 bg-emerald-950/40';
    case 'ACTIVE':
      return 'text-[#E05C36] border-[#E05C36]/60 bg-[#E05C36]/15';
    case 'INCUBATING':
      return 'text-amber-300 border-amber-800/70 bg-amber-950/40';
    case 'ARCHIVED':
    default:
      return 'text-zinc-400 border-zinc-800 bg-zinc-900';
  }
}

export const ProjectBrowserDropdown: React.FC<ProjectBrowserDropdownProps> = ({
  state,
  dispatch,
}) => {
  const [query, setQuery] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<ProjectLifecycle | 'ALL'>('ALL');
  const [showNewForm, setShowNewForm] = useState(false);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('~/Documents/Github/');
  const [newStack, setNewStack] = useState('Astro, TypeScript, Tailwind');
  const [newDesc, setNewDesc] = useState('');

  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (state.projectBrowserOpen) {
      setQuery('');
      setTimeout(() => searchRef.current?.focus(), 15);
    }
  }, [state.projectBrowserOpen]);

  if (!state.projectBrowserOpen) return null;

  const allTasks = Object.values(state.tasks);
  const q = query.trim().toLowerCase();

  const filteredProjects = state.projects.filter((p) => {
    if (lifecycleFilter !== 'ALL' && p.lifecycle !== lifecycleFilter) return false;
    if (!q) return true;
    const hay = `${p.code} ${p.name} ${p.description} ${p.localPath} ${p.stack.join(' ')}`.toLowerCase();
    return hay.includes(q);
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    dispatch({
      type: 'REGISTER_NEW_PROJECT',
      code: newCode || newName.slice(0, 7).toUpperCase(),
      name: newName,
      localPath: newPath,
      stack: newStack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: newDesc,
      lifecycle: 'ACTIVE',
    });
    setNewCode('');
    setNewName('');
    setNewPath('~/Documents/Github/');
    setNewDesc('');
    setShowNewForm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[1px] flex items-start justify-start pt-11 pl-3 pr-3"
      onClick={() => dispatch({ type: 'TOGGLE_PROJECT_BROWSER', open: false })}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-[#0F0F11] border-2 border-[#E05C36] shadow-2xl flex flex-col max-h-[84dvh] font-mono text-xs select-none"
      >
        {/* Top Menu Header */}
        <div className="px-3.5 py-2.5 bg-[#18181B] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#E05C36] text-[#0F0F11] font-bold">
              [p] BROWSE WORKSPACE PROJECTS
            </span>
            <span className="text-zinc-400">
              Root: <strong className="text-[#F4F4F5]">~/Documents/Github/*</strong> (
              {state.projects.length} repositories indexed)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm((prev) => !prev)}
              className={`px-2.5 py-1 border font-bold transition-colors ${
                showNewForm
                  ? 'border-zinc-700 bg-zinc-900 text-zinc-300'
                  : 'border-[#E05C36] bg-[#E05C36] text-[#0F0F11] hover:bg-[#EA580C]'
              }`}
            >
              {showNewForm ? '× Close Init Form' : '+ Initialize Project'}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_PROJECT_BROWSER', open: false })}
              className="px-2 py-1 border border-zinc-700 bg-[#0F0F11] text-zinc-400 hover:text-[#F4F4F5]"
            >
              [Esc] Close
            </button>
          </div>
        </div>

        {/* Search & Lifecycle Filter Bar */}
        <div className="px-3.5 py-2 bg-[#18181B]/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-1 min-w-[240px] bg-[#0F0F11] border border-zinc-700 focus-within:border-[#E05C36] px-2.5 py-1">
            <span className="text-[#E05C36] font-bold mr-2">find://</span>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter ~/Documents/Github repos by name, folder path, or stack (e.g. Three.js, Astro, Python, Next.js)..."
              className="w-full bg-transparent text-[#F4F4F5] placeholder-zinc-600 outline-none text-xs font-mono"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-zinc-500 hover:text-[#E05C36]"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {(['ALL', 'PRODUCTION', 'ACTIVE', 'INCUBATING'] as const).map((lf) => (
              <button
                key={lf}
                type="button"
                onClick={() => setLifecycleFilter(lf)}
                className={`px-2 py-1 text-[11px] border transition-colors ${
                  lifecycleFilter === lf
                    ? 'border-[#E05C36] bg-[#E05C36]/20 text-[#E05C36] font-bold'
                    : 'border-zinc-800 bg-[#0F0F11] text-zinc-400 hover:text-[#F4F4F5]'
                }`}
              >
                {lf}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Quick Initialize New Workspace Project Drawer */}
        {showNewForm && (
          <form
            onSubmit={handleCreateProject}
            className="p-3.5 bg-[#18181B] border-b-2 border-[#E05C36] space-y-2.5"
          >
            <div className="text-[11px] text-[#E05C36] font-bold">
              ┌── INITIALIZE NEW REPOSITORY IN ~/Documents/Github ──┐
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Code (e.g. NEBULA)"
                className="bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] outline-none"
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project Name *"
                required
                className="bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] outline-none"
              />
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="~/Documents/Github/my-repo"
                className="bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] outline-none"
              />
              <input
                type="text"
                value={newStack}
                onChange={(e) => setNewStack(e.target.value)}
                placeholder="Stack (comma-separated)"
                className="bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Architectural description & primary objective..."
                className="flex-1 bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#E05C36] text-[#0F0F11] font-bold hover:bg-[#EA580C]"
              >
                REGISTER &amp; MOUNT ↵
              </button>
            </div>
          </form>
        )}

        {/* 2-Column Repository Grid */}
        <div className="p-3.5 overflow-y-auto tui-scroll grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredProjects.map((proj, idx) => {
            const isSelected = proj.id === state.selectedProjectId;
            const projTasks = allTasks.filter((t) => t.projectId === proj.id);
            const doneCount = projTasks.filter((t) => t.status === 'COMPLETED').length;
            const milestoneCount = projTasks.filter((t) => t.isMilestone).length;
            const pct =
              projTasks.length > 0 ? Math.round((doneCount / projTasks.length) * 100) : 0;

            return (
              <div
                key={proj.id}
                onClick={() =>
                  dispatch({
                    type: 'SELECT_PROJECT_CATEGORY',
                    projectId: proj.id,
                    categoryId: 'ALL',
                    closeBrowser: true,
                  })
                }
                className={`p-3 border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-[#E05C36] bg-[#18181B] tui-box-shadow-active'
                    : 'border-zinc-800 bg-[#18181B]/40 hover:border-zinc-600 hover:bg-[#18181B]'
                }`}
              >
                <div className="space-y-1.5">
                  {/* Top Row: Index, Code, Name & Lifecycle Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-zinc-500">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[11px] font-bold border ${
                          isSelected
                            ? 'bg-[#E05C36] text-[#0F0F11] border-[#E05C36]'
                            : 'bg-zinc-900 text-[#F4F4F5] border-zinc-700'
                        }`}
                      >
                        {proj.code}
                      </span>
                      <span className="font-bold text-[#F4F4F5] truncate">{proj.name}</span>
                    </div>

                    <span
                      className={`text-[10px] px-1.5 py-0.2 border shrink-0 ${getLifecycleStyle(
                        proj.lifecycle
                      )}`}
                    >
                      {proj.lifecycle}
                    </span>
                  </div>

                  {/* Folder Path */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span className="text-[#E05C36]/90 truncate">{proj.localPath}</span>
                    {proj.lastAgentSync && (
                      <span className="text-[10px] text-zinc-500 shrink-0">
                        sync: {proj.lastAgentSync}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>
                </div>

                {/* Bottom Row: Stack Pills & Task Progress Bar */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {proj.stack.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] px-1.5 py-0.2 bg-[#0F0F11] border border-zinc-800 text-zinc-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] shrink-0">
                    <span className="text-[#E05C36]">◆ {milestoneCount}</span>
                    <span className="text-zinc-400">
                      {doneCount}/{projTasks.length}
                    </span>
                    <span className="text-emerald-400 font-mono">
                      [{buildMiniBar(pct, 6)}]
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Hint */}
        <div className="px-3.5 py-2 bg-[#18181B] border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <span>
            Click any repository card to mount its hierarchical task tree in the main workspace.
          </span>
          <span className="text-[#E05C36]">
            Agent CLI Hook: node ~/Documents/Github/dashboard/scripts/agent-sync.mjs
          </span>
        </div>
      </div>
    </div>
  );
};
