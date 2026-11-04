import React, { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { ScheduleAction } from '../state/scheduleEngine';
import type {
  Priority,
  ScheduleState,
  SortCriterion,
  TaskStatus,
  VisibleTaskRow,
} from '../types/schedule';

interface ScheduleWorkspaceProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
  rows: VisibleTaskRow[];
  regexError: string | null;
}

const SORT_OPTIONS: { id: SortCriterion; label: string; hint: string }[] = [
  { id: 'MANUAL', label: 'Manual', hint: 'J/K' },
  { id: 'PRIORITY', label: 'Priority', hint: 'H>M>L' },
  { id: 'DUE_DATE', label: 'Due Date', hint: 'ISO' },
  { id: 'STATUS', label: 'Status', hint: 'STATE' },
];

function getStatusBadge(status: TaskStatus): {
  glyph: string;
  label: string;
  className: string;
} {
  switch (status) {
    case 'COMPLETED':
      return {
        glyph: '[✓]',
        label: 'COMPLETED',
        className: 'text-emerald-400 border-emerald-900/70 bg-emerald-950/30',
      };
    case 'IN_PROGRESS':
      return {
        glyph: '[~]',
        label: 'IN_PROGRESS',
        className: 'text-[#E05C36] border-[#E05C36]/50 bg-[#E05C36]/10',
      };
    case 'BLOCKED':
      return {
        glyph: '[!]',
        label: 'BLOCKED',
        className: 'text-red-400 border-red-900/70 bg-red-950/30',
      };
    case 'QUEUED':
    default:
      return {
        glyph: '[ ]',
        label: 'QUEUED',
        className: 'text-zinc-400 border-zinc-800 bg-zinc-900/60',
      };
  }
}

function getPriorityStyle(priority: Priority): string {
  switch (priority) {
    case 'HIGH':
      return 'text-[#E05C36] border-[#E05C36]/60 bg-[#E05C36]/10 font-bold';
    case 'MEDIUM':
      return 'text-amber-300 border-amber-800/60 bg-amber-950/30';
    case 'LOW':
      return 'text-zinc-400 border-zinc-800 bg-zinc-900';
  }
}

export const ScheduleWorkspace: React.FC<ScheduleWorkspaceProps> = ({
  state,
  dispatch,
  rows,
  regexError,
}) => {
  const selectedRowRef = useRef<HTMLDivElement | null>(null);
  const activeProject = state.projects.find((p) => p.id === state.selectedProjectId);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [state.selectedTaskId]);

  const categoryMap = new Map(state.categories.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0F0F11] select-none">
      {/* Sub-header: Active Project Git Telemetry & Sorting Toolbar */}
      <div className="px-3 py-2 bg-[#18181B]/80 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#E05C36] font-bold">▸</span>
          <span className="font-bold text-[#F4F4F5] truncate">{activeProject?.name}</span>
          {activeProject?.gitBranch && (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-[10px] text-emerald-400">
              <span>⎇ {activeProject.gitBranch}</span>
              {activeProject.gitDirtyCount ? (
                <span className="text-amber-400">±{activeProject.gitDirtyCount}</span>
              ) : null}
            </span>
          )}
          <span className="text-zinc-600 hidden md:inline">│</span>
          <span className="text-zinc-400 text-[11px] hidden md:inline">
            {rows.length} node{rows.length === 1 ? '' : 's'}
          </span>
          {regexError && (
            <span className="px-1.5 py-0.5 bg-red-950/80 border border-red-700 text-red-300 text-[11px]">
              REGEX ERR: {regexError}
            </span>
          )}
        </div>

        {/* Sorting & Panel 3 Composer Trigger */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 text-[10px] mr-0.5 hidden sm:inline">SORT:</span>
          {SORT_OPTIONS.map((opt) => {
            const active = state.sortBy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_SORT_BY', sortBy: opt.id })}
                className={`px-2 py-0.5 text-[11px] border transition-colors ${
                  active
                    ? 'border-[#E05C36] bg-[#E05C36]/15 text-[#E05C36] font-bold'
                    : 'border-zinc-800 bg-[#0F0F11] text-zinc-400 hover:text-[#F4F4F5]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() =>
              dispatch({
                type: 'FOCUS_PANEL3_COMPOSER',
                mode: 'ROOT',
                targetParentId: null,
              })
            }
            className="ml-1 px-2.5 py-0.5 text-[11px] bg-[#E05C36] text-[#0F0F11] font-bold hover:bg-[#EA580C] transition-colors"
            title="Focus Panel 3 Task & Subtask Composer [a]"
          >
            [a] + ADD IN PANEL 3 →
          </button>
        </div>
      </div>

      {/* Column Legend Header */}
      <div className="px-3 py-1.5 border-b border-zinc-800/80 bg-[#0F0F11] text-[10px] uppercase tracking-wider text-zinc-500 flex items-center justify-between">
        <span>HIERARCHICAL NODE (PROJECT → CATEGORY → L0 TASK → L1..L3 SUBTASKS)</span>
        <div className="flex items-center gap-4 pr-1">
          <span className="hidden sm:inline">ACTIONS</span>
          <span>PRIORITY</span>
          <span className="hidden sm:inline">DUE DATE</span>
        </div>
      </div>

      {/* Hierarchical Task Tree List */}
      <div className="flex-1 overflow-y-auto tui-scroll divide-y divide-zinc-900/80">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs space-y-2">
            <div className="text-[#E05C36] font-bold">── NO MATCHING SCHEDULE NODES ──</div>
            <div>
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#E05C36]">
                a
              </kbd>{' '}
              to create a new Task or Subtask in Panel 3.
            </div>
          </div>
        ) : (
          rows.map((row, index) => {
            const {
              task,
              hasChildren,
              childCount,
              completedChildCount,
              isLastSibling,
              ancestorLines,
            } = row;
            const isSelected = task.id === state.selectedTaskId;
            const statusBadge = getStatusBadge(task.status);
            const categoryName = categoryMap.get(task.categoryId) ?? 'Core';

            return (
              <div
                key={task.id}
                ref={isSelected ? selectedRowRef : null}
                onClick={() => dispatch({ type: 'SELECT_TASK', taskId: task.id })}
                className={`group px-3 py-2 flex items-center justify-between gap-2 cursor-pointer border-l-2 transition-colors text-xs ${
                  isSelected
                    ? 'border-[#E05C36] bg-[#18181B]'
                    : 'border-transparent hover:bg-[#18181B]/50'
                }`}
              >
                {/* Left: Tree Indentation, Box-Drawing Connectors, Status & Title */}
                <div className="flex items-center min-w-0 flex-1">
                  <span
                    className={`w-6 text-[10px] text-right mr-2.5 shrink-0 ${
                      isSelected ? 'text-[#E05C36] font-bold' : 'text-zinc-600'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  {ancestorLines.map((drawPipe, depthIdx) => (
                    <span
                      key={depthIdx}
                      className="w-5 text-zinc-700 font-mono select-none shrink-0"
                    >
                      {drawPipe ? '│  ' : '   '}
                    </span>
                  ))}

                  {task.depth > 0 && (
                    <span className="w-5 text-zinc-600 font-mono select-none shrink-0">
                      {isLastSibling ? '└─ ' : '├─ '}
                    </span>
                  )}

                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'TOGGLE_TASK_EXPAND', taskId: task.id });
                      }}
                      className="mr-1.5 text-[#E05C36] hover:text-[#EA580C] font-bold shrink-0"
                      title="Toggle nested subtasks (Enter)"
                    >
                      {task.expanded ? '▾' : '▸'}
                    </button>
                  ) : (
                    <span className="mr-1.5 text-zinc-600 shrink-0">·</span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'CYCLE_TASK_STATUS', taskId: task.id });
                    }}
                    className={`mr-2 font-mono text-[11px] px-1 border shrink-0 ${statusBadge.className}`}
                    title="Cycle task status (Space)"
                  >
                    {statusBadge.glyph}
                  </button>

                  <span
                    className={`text-[10px] px-1 mr-2 border shrink-0 ${
                      task.depth === 0
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-300 font-semibold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                    }`}
                  >
                    L{task.depth}
                  </span>

                  {task.depth === 0 && (
                    <span className="hidden lg:inline-block text-[10px] text-zinc-400 bg-zinc-900/90 border border-zinc-800 px-1.5 py-0.2 mr-2 shrink-0">
                      {categoryName}
                    </span>
                  )}

                  <span
                    className={`truncate ${
                      task.status === 'COMPLETED'
                        ? 'line-through text-zinc-500'
                        : isSelected
                        ? 'text-[#F4F4F5] font-semibold'
                        : 'text-zinc-200'
                    }`}
                  >
                    {task.title}
                  </span>

                  {task.isMilestone && (
                    <span className="ml-2 px-1.5 py-0.2 text-[10px] bg-[#E05C36]/20 border border-[#E05C36] text-[#E05C36] font-bold shrink-0">
                      ◆ MILESTONE
                    </span>
                  )}

                  {hasChildren && (
                    <span className="ml-2 text-[10px] text-zinc-500 shrink-0">
                      [{completedChildCount}/{childCount}]
                    </span>
                  )}
                </div>

                {/* Right: Quick +Subtask in Panel 3, Priority Reorder (J/K), Priority Pill & Due Date */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {task.depth < 3 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'SELECT_TASK', taskId: task.id });
                        dispatch({
                          type: 'FOCUS_PANEL3_COMPOSER',
                          mode: 'SUBTASK',
                          targetParentId: task.id,
                        });
                      }}
                      className="opacity-70 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-[#E05C36] font-bold"
                      title={`Add L${task.depth + 1} child subtask in Panel 3`}
                    >
                      +L{task.depth + 1}
                    </button>
                  )}

                  {isSelected && (
                    <div className="hidden sm:flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'REORDER_TASK_PRIORITY', direction: 'UP' });
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-[#E05C36] hover:text-[#E05C36]"
                        title="Shift+K: Move task UP in priority order"
                      >
                        ▲K
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'REORDER_TASK_PRIORITY', direction: 'DOWN' });
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-[#E05C36] hover:text-[#E05C36]"
                        title="Shift+J: Move task DOWN in priority order"
                      >
                        ▼J
                      </button>
                    </div>
                  )}

                  <span
                    className={`text-[10px] px-1.5 py-0.5 border w-14 text-center ${getPriorityStyle(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>

                  <span className="hidden sm:inline-block text-[11px] text-zinc-400 font-mono w-20 text-right">
                    {task.dueDate}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
