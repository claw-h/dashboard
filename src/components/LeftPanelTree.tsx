import React from 'react';
import type { Dispatch } from 'react';
import { selectLeftNavItems, type ScheduleAction } from '../state/scheduleEngine';
import type { ScheduleState, StatusFilter } from '../types/schedule';

interface LeftPanelTreeProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

const STATUS_FACETS: { id: StatusFilter; label: string; glyph: string }[] = [
  { id: 'ALL', label: 'All Tasks', glyph: '❖' },
  { id: 'IN_PROGRESS', label: 'In Progress', glyph: '[~]' },
  { id: 'BLOCKED', label: 'Blocked', glyph: '[!]' },
  { id: 'COMPLETED', label: 'Completed', glyph: '[✓]' },
  { id: 'MILESTONES', label: 'Milestones', glyph: '◆' },
];

export const LeftPanelTree: React.FC<LeftPanelTreeProps> = ({ state, dispatch }) => {
  const isFocused = state.focusedPanel === 'LEFT';
  const navItems = selectLeftNavItems(state);

  if (state.leftPanelCollapsed) {
    return (
      <aside
        onClick={() => dispatch({ type: 'FOCUS_LEFT_OR_TOGGLE' })}
        className="w-10 bg-[#0F0F11] border-r border-zinc-800 flex flex-col items-center py-3 justify-between cursor-pointer hover:bg-[#18181B] transition-colors select-none shrink-0"
        title="Press [h] or click to expand Left Navigation Panel"
      >
        <span className="text-[#E05C36] font-bold text-xs">[h]</span>
        <div className="[writing-mode:vertical-rl] rotate-180 text-[11px] tracking-widest text-zinc-400 uppercase font-mono">
          PROJECTS &amp; FILTERS
        </div>
        <span className="text-zinc-500 text-xs">»</span>
      </aside>
    );
  }

  return (
    <aside
      onClick={() => dispatch({ type: 'SET_PANEL_FOCUS', panel: 'LEFT' })}
      className={`w-64 xl:w-72 bg-[#0F0F11] border-r border-zinc-800 flex flex-col justify-between select-none shrink-0 transition-colors ${
        isFocused ? 'tui-box-shadow-active' : ''
      }`}
    >
      {/* Top Panel Header */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="h-8 px-3 border-b border-zinc-800 bg-[#18181B] flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              className={`px-1 font-bold ${
                isFocused
                  ? 'bg-[#E05C36] text-[#0F0F11]'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              01
            </span>
            <span className="font-semibold tracking-wider text-[#F4F4F5]">
              PROJECT TREE
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'FOCUS_LEFT_OR_TOGGLE' });
            }}
            className="text-zinc-400 hover:text-[#E05C36] text-[11px]"
            title="Press [h] to focus/collapse"
          >
            [h] «
          </button>
        </div>

        {/* Project & Category Tree */}
        <div className="p-2 overflow-y-auto tui-scroll flex-1 space-y-0.5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-1.5 py-1">
            ┌─ Workspace Hierarchy
          </div>

          {navItems.map((item, idx) => {
            const isCursorRow = isFocused && state.selectedLeftIndex === idx;
            const isSelectedScope =
              item.projectId === state.selectedProjectId &&
              ((item.kind === 'CATEGORY' && item.categoryId === state.selectedCategoryId) ||
                (item.kind === 'CATEGORY_ALL' && state.selectedCategoryId === 'ALL') ||
                (item.kind === 'PROJECT' && state.selectedCategoryId === 'ALL'));

            if (item.kind === 'PROJECT') {
              return (
                <button
                  key={`proj-${item.projectId}`}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'SELECT_PROJECT_CATEGORY',
                      projectId: item.projectId,
                      categoryId: 'ALL',
                    })
                  }
                  className={`w-full text-left px-2 py-1.5 text-xs flex items-center justify-between border-l-2 transition-colors ${
                    isCursorRow
                      ? 'border-[#E05C36] bg-[#18181B] text-[#F4F4F5]'
                      : isSelectedScope
                      ? 'border-[#EA580C] bg-[#18181B]/70 text-[#F4F4F5]'
                      : 'border-transparent text-zinc-300 hover:bg-[#18181B]/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[#E05C36] font-bold">▾</span>
                    <span className="font-bold text-[#F4F4F5]">{item.code}</span>
                    <span className="text-zinc-500 truncate text-[11px]">{item.label}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {item.count}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={`cat-${item.projectId}-${item.categoryId}`}
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'SELECT_PROJECT_CATEGORY',
                    projectId: item.projectId,
                    categoryId: item.categoryId ?? 'ALL',
                  })
                }
                className={`w-full text-left pl-5 pr-2 py-1 text-xs flex items-center justify-between border-l-2 transition-colors ${
                  isCursorRow
                    ? 'border-[#E05C36] bg-[#18181B] text-[#F4F4F5]'
                    : item.projectId === state.selectedProjectId &&
                      item.categoryId === state.selectedCategoryId
                    ? 'border-[#E05C36]/80 bg-[#18181B]/60 text-[#E05C36] font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-[#F4F4F5] hover:bg-[#18181B]/30'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-zinc-600">├─</span>
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="text-[10px] text-zinc-500">{item.count}</span>
              </button>
            );
          })}

          {/* Status & Milestone Facet Filters */}
          <div className="pt-3 mt-2 border-t border-zinc-800/80">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-1.5 py-1">
              ├─ Status &amp; Milestone Facets
            </div>
            <div className="space-y-0.5">
              {STATUS_FACETS.map((facet) => {
                const active = state.statusFilter === facet.id;
                return (
                  <button
                    key={facet.id}
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'SET_STATUS_FILTER', statusFilter: facet.id })
                    }
                    className={`w-full text-left px-2.5 py-1 text-xs flex items-center justify-between border-l-2 transition-colors ${
                      active
                        ? 'border-[#E05C36] bg-[#18181B] text-[#E05C36] font-semibold'
                        : 'border-transparent text-zinc-400 hover:text-[#F4F4F5] hover:bg-[#18181B]/40'
                    }`}
                  >
                    <span>{facet.label}</span>
                    <span className={active ? 'text-[#E05C36]' : 'text-zinc-500'}>
                      {facet.glyph}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Storage & Quick Reset Footer */}
      <div className="p-2.5 border-t border-zinc-800 bg-[#18181B]/60 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between text-zinc-400">
          <span>STORAGE ENGINE</span>
          <span className="text-emerald-400 font-semibold">● LOCALSTORAGE SYNC</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>MAX SUBTASK DEPTH: 3</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET_SEED_DATA' })}
            className="text-zinc-400 hover:text-[#E05C36] underline"
          >
            [reset seed]
          </button>
        </div>
      </div>
    </aside>
  );
};
