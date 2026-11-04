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
    <header className="h-11 bg-[#0F0F11] border-b border-zinc-800 px-3 flex items-center justify-between gap-3 text-xs select-none shrink-0">
      {/* Left: Brand & Session Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#18181B] border border-zinc-800">
          <span className="text-[#E05C36] font-bold">✻</span>
          <span className="font-bold tracking-wider text-[#F4F4F5]">CLAUDE CODE</span>
          <span className="text-zinc-500">v2.4</span>
        </div>

        <span className="text-zinc-600">│</span>

        <div className="hidden sm:flex items-center gap-1 text-zinc-400 truncate">
          <span className="text-zinc-500">~/workspace/</span>
          <span className="text-[#F4F4F5] font-semibold">
            {activeProject?.code.toLowerCase() ?? 'root'}
          </span>
          {state.selectedCategoryId !== 'ALL' && (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-[#E05C36]">
                {state.categories.find((c) => c.id === state.selectedCategoryId)?.slug}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Center: Filter Bar (i) & Regex Search (/) */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        {/* Filter Input [i] */}
        <div
          className={`flex items-center flex-1 bg-[#18181B] border px-2 py-1 transition-colors ${
            state.inputMode === 'FILTER_BAR'
              ? 'border-[#E05C36] text-[#F4F4F5]'
              : 'border-zinc-800 text-zinc-400'
          }`}
          onClick={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'FILTER_BAR', keyHint: 'i' })}
        >
          <span className="text-[#E05C36] font-bold mr-1.5">[i]</span>
          <span className="text-zinc-500 mr-1">filter:</span>
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
            placeholder="keyword / status..."
            className="bg-transparent outline-none w-full text-[#F4F4F5] placeholder-zinc-600 text-xs font-mono"
          />
          {state.filterQuery && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'SET_FILTER_QUERY', query: '' });
              }}
              className="text-zinc-500 hover:text-[#E05C36] ml-1"
              title="Clear filter"
            >
              ×
            </button>
          )}
        </div>

        {/* Global Regex Input [/] */}
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
            placeholder="regex pattern..."
            className="bg-transparent outline-none w-full text-[#F4F4F5] placeholder-zinc-600 text-xs font-mono px-0.5"
          />
          <span className="text-zinc-500">/i</span>
          {state.regexQuery && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'SET_REGEX_QUERY', query: '' });
              }}
              className="text-zinc-500 hover:text-[#E05C36] ml-1"
              title="Clear regex"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right: Workspace Mode Switcher (t / c) & Telemetry Counters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-zinc-800 bg-[#18181B]">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'SCHEDULE', keyHint: 't' })}
            className={`px-2.5 py-1 text-xs font-mono transition-colors flex items-center gap-1 ${
              state.activeMode === 'SCHEDULE'
                ? 'bg-[#E05C36] text-[#0F0F11] font-bold'
                : 'text-zinc-400 hover:text-[#F4F4F5]'
            }`}
          >
            <span>[t]</span>
            <span>SCHEDULE</span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'CLI_STREAM', keyHint: 'c' })}
            className={`px-2.5 py-1 text-xs font-mono transition-colors flex items-center gap-1 border-l border-zinc-800 ${
              state.activeMode === 'CLI_STREAM'
                ? 'bg-[#E05C36] text-[#0F0F11] font-bold'
                : 'text-zinc-400 hover:text-[#F4F4F5]'
            }`}
          >
            <span>[c]</span>
            <span>CLI STREAM</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-2 py-1 bg-[#18181B] border border-zinc-800 text-zinc-400">
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
