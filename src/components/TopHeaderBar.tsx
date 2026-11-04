import React, { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { ScheduleAction } from '../state/scheduleEngine';
import type { ScheduleState } from '../types/schedule';

interface TopHeaderBarProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
  regexError: string | null;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  state,
  dispatch,
  regexError,
}) => {
  const filterInputRef = useRef<HTMLInputElement | null>(null);
  const regexInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (state.inputMode === 'FILTER_BAR') {
      filterInputRef.current?.focus();
      filterInputRef.current?.select();
    } else if (state.inputMode === 'SEARCH_REGEX') {
      regexInputRef.current?.focus();
      regexInputRef.current?.select();
    }
  }, [state.inputMode]);

  const allTasks = Object.values(state.tasks);
  const completedCount = allTasks.filter((t) => t.status === 'COMPLETED').length;
  const milestoneCount = allTasks.filter((t) => t.isMilestone).length;
  const activeProject = state.projects.find((p) => p.id === state.selectedProjectId);

  return (
    <header className="h-11 bg-[#0F0F11] border-b border-zinc-800 px-3 flex items-center justify-between gap-2 text-xs select-none shrink-0">
      {/* Left: Bespoke YXB // CMD Emblem & Interactive ~/workspace Breadcrumb Dropdown Trigger */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#18181B] border border-zinc-800 shrink-0">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            className="shrink-0"
            aria-hidden="true"
          >
            <polygon
              points="12,2 22,12 12,22 2,12"
              stroke="#E05C36"
              strokeWidth="2"
              fill="rgba(224,92,54,0.18)"
            />
            <circle cx="12" cy="12" r="2.5" fill="#F4F4F5" />
          </svg>
          <span className="font-bold tracking-wider text-[#F4F4F5]">
            YXB <span className="text-[#E05C36]">//</span> CMD
          </span>
          <span className="hidden sm:inline text-[10px] px-1 bg-zinc-900 border border-zinc-700 text-zinc-400">
            v3.0
          </span>
        </div>

        <span className="text-zinc-700 hidden sm:inline">│</span>

        {/* Interactive ~/workspace Breadcrumb -> Opens Browse Project Mega-Menu [p] */}
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_PROJECT_BROWSER' })}
          className={`group flex items-center gap-1.5 px-2.5 py-1 border transition-colors truncate ${
            state.projectBrowserOpen
              ? 'border-[#E05C36] bg-[#E05C36]/15 text-[#F4F4F5]'
              : 'border-zinc-800 bg-[#18181B]/70 hover:border-[#E05C36] text-zinc-300'
          }`}
          title="Press [p] or click to browse all ~/Documents/Github repositories"
        >
          <span className="text-[#E05C36] font-bold">[p]</span>
          <span className="text-zinc-500 hidden lg:inline">~/workspace/</span>
          <span className="text-[#F4F4F5] font-bold">
            {activeProject?.code ?? 'ROOT'}
          </span>
          <span className="ml-1 px-1.5 py-0.2 bg-[#0F0F11] border border-zinc-700 group-hover:border-[#E05C36] text-[10px] text-[#E05C36] font-semibold">
            Browse ({state.projects.length}) ▾
          </span>
        </button>
      </div>

      {/* Center: Filter Bar (i) & Regex Search (/) */}
      <div className="hidden lg:flex items-center gap-2 flex-1 max-w-md">
        <div
          className={`flex items-center flex-1 bg-[#18181B] border px-2 py-1 transition-colors ${
            state.inputMode === 'FILTER_BAR'
              ? 'border-[#E05C36] text-[#F4F4F5]'
              : 'border-zinc-800 text-zinc-400'
          }`}
          onClick={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'FILTER_BAR', keyHint: 'i' })}
        >
          <span className="text-[#E05C36] font-bold mr-1.5">[i]</span>
          <input
            ref={filterInputRef}
            type="text"
            value={state.filterQuery}
            onChange={(e) => dispatch({ type: 'SET_FILTER_QUERY', query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.currentTarget.blur();
                dispatch({ type: 'SET_INPUT_MODE', mode: 'NORMAL' });
              }
            }}
            placeholder="filter tasks..."
            className="bg-transparent outline-none w-full text-[#F4F4F5] placeholder-zinc-600 text-xs font-mono"
          />
        </div>

        <div
          className={`flex items-center flex-1 bg-[#18181B] border px-2 py-1 transition-colors ${
            regexError
              ? 'border-red-500'
              : state.inputMode === 'SEARCH_REGEX'
              ? 'border-[#E05C36]'
              : 'border-zinc-800'
          }`}
          onClick={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'SEARCH_REGEX', keyHint: '/' })}
        >
          <span className="text-[#E05C36] font-bold mr-1">[/]</span>
          <span className="text-zinc-500">/</span>
          <input
            ref={regexInputRef}
            type="text"
            value={state.regexQuery}
            onChange={(e) => dispatch({ type: 'SET_REGEX_QUERY', query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.currentTarget.blur();
                dispatch({ type: 'SET_INPUT_MODE', mode: 'NORMAL' });
              }
            }}
            placeholder="regex..."
            className="bg-transparent outline-none w-full text-[#F4F4F5] placeholder-zinc-600 text-xs font-mono px-0.5"
          />
          <span className="text-zinc-500">/i</span>
        </div>
      </div>

      {/* Right: Phone/Cloud Sync [s], Agent Protocol [g], Mode Switcher [t/c] */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_CLOUD_SYNC' })}
          className={`px-2 py-1 text-xs font-mono border transition-colors flex items-center gap-1 ${
            state.cloudSyncOpen
              ? 'bg-[#E05C36] text-[#0F0F11] border-[#E05C36] font-bold'
              : 'bg-[#18181B] border-zinc-800 text-zinc-300 hover:border-[#E05C36]'
          }`}
          title="Phone & GitHub Bidirectional Sync [s]"
        >
          <span className="text-[#E05C36] font-bold">[s]</span>
          <span className="hidden sm:inline">☁ SYNC</span>
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_AGENT_PROTOCOL' })}
          className={`px-2 py-1 text-xs font-mono border transition-colors flex items-center gap-1 ${
            state.agentProtocolOpen
              ? 'bg-[#E05C36] text-[#0F0F11] border-[#E05C36] font-bold'
              : 'bg-[#18181B] border-zinc-800 text-zinc-300 hover:border-[#E05C36]'
          }`}
          title="Global & Local `yxb` Agent CLI Protocol [g]"
        >
          <span className="text-[#E05C36] font-bold">[g]</span>
          <span className="hidden xl:inline">AGENT CLI</span>
        </button>

        <div className="flex items-center border border-zinc-800 bg-[#18181B]">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'SCHEDULE', keyHint: 't' })}
            className={`px-2 py-1 text-xs font-mono transition-colors flex items-center gap-1 ${
              state.activeMode === 'SCHEDULE'
                ? 'bg-[#E05C36] text-[#0F0F11] font-bold'
                : 'text-zinc-400 hover:text-[#F4F4F5]'
            }`}
          >
            <span>[t]</span>
            <span className="hidden sm:inline">SCHEDULE</span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'CLI_STREAM', keyHint: 'c' })}
            className={`px-2 py-1 text-xs font-mono transition-colors flex items-center gap-1 border-l border-zinc-800 ${
              state.activeMode === 'CLI_STREAM'
                ? 'bg-[#E05C36] text-[#0F0F11] font-bold'
                : 'text-zinc-400 hover:text-[#F4F4F5]'
            }`}
          >
            <span>[c]</span>
            <span className="hidden sm:inline">CLI</span>
          </button>
        </div>

        <div className="hidden 2xl:flex items-center gap-2 px-2 py-1 bg-[#18181B] border border-zinc-800 text-zinc-400">
          <span>
            DONE <strong className="text-[#F4F4F5]">{completedCount}/{allTasks.length}</strong>
          </span>
          <span className="text-zinc-700">│</span>
          <span className="text-[#E05C36]">
            ◆ <strong>{milestoneCount}</strong>
          </span>
        </div>
      </div>
    </header>
  );
};
