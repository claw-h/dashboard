import React, { useEffect, useRef, useState } from 'react';
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
  { id: 'MANUAL', label: 'Manual Order', hint: 'J/K' },
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
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlinePriority, setInlinePriority] = useState<Priority>('HIGH');
  const [inlineDueDate, setInlineDueDate] = useState('2026-11-08');
  const [inlineAsSubtask, setInlineAsSubtask] = useState(true);

  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const selectedRowRef = useRef<HTMLDivElement | null>(null);

  const selectedTask = state.selectedTaskId ? state.tasks[state.selectedTaskId] : null;
  const activeProject = state.projects.find((p) => p.id === state.selectedProjectId);

  useEffect(() => {
    if (state.inputMode === 'INLINE_ADD') {
      setInlineTitle('');
      setInlineAsSubtask(Boolean(selectedTask));
      setTimeout(() => inlineInputRef.current?.focus(), 10);
    }
  }, [state.inputMode, selectedTask]);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [state.selectedTaskId]);

  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'ADD_TASK_INLINE',
      title: inlineTitle,
      priority: inlinePriority,
      dueDate: inlineDueDate,
      asSubtask: inlineAsSubtask,
    });
    setInlineTitle('');
  };

  const categoryMap = new Map(state.categories.map((c) => [c.id, c.name]));

  // Compute target depth preview for inline prompt
  const previewDepth =
    inlineAsSubtask && selectedTask
      ? Math.min(3, selectedTask.depth + 1)
      : 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0F0F11] select-none">
      {/* Sub-header: Sorting & Ordering Engine Toolbar */}
      <div className="px-3 py-2 bg-[#18181B]/80 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#E05C36] font-bold">▸</span>
          <span className="font-bold text-[#F4F4F5]">{activeProject?.name}</span>
          <span className="text-zinc-600">│</span>
          <span className="text-zinc-400">
            {rows.length} visible node{rows.length === 1 ? '' : 's'}
          </span>
          {regexError && (
            <span className="px-1.5 py-0.5 bg-red-950/80 border border-red-700 text-red-300 text-[11px]">
              REGEX ERR: {regexError}
            </span>
          )}
        </div>

        {/* Sorting & Priority Ordering Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 text-[11px] mr-1">SORT ENGINE:</span>
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
                {opt.label} <span className="text-[10px] opacity-70">[{opt.hint}]</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'INLINE_ADD', keyHint: 'a' })}
            className="ml-2 px-2.5 py-0.5 text-[11px] bg-[#E05C36] text-[#0F0F11] font-bold hover:bg-[#EA580C] transition-colors"
          >
            [a] + NEW NODE
          </button>
        </div>
      </div>

      {/* Inline Minimalist Terminal Prompt (Activated via `a`) */}
      {state.inputMode === 'INLINE_ADD' && (
        <form
          onSubmit={handleInlineSubmit}
          className="px-3 py-2.5 bg-[#18181B] border-b-2 border-[#E05C36] flex flex-col gap-2 text-xs"
        >
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-[#E05C36] text-[#0F0F11] font-bold">
                INLINE PROMPT [a]
              </span>
              <span className="text-zinc-300">
                Target:{' '}
                <strong className="text-[#E05C36]">
                  {previewDepth === 0
                    ? 'Root Parent Task (L0)'
                    : `Nested Subtask L${previewDepth} under "${selectedTask?.title.slice(0, 36)}..."`}
                </strong>
              </span>
              {selectedTask && selectedTask.depth === 3 && inlineAsSubtask && (
                <span className="text-amber-400 text-[10px]">
                  (Max depth L3 reached — spawning sibling at L3)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedTask && (
                <button
                  type="button"
                  onClick={() => setInlineAsSubtask((prev) => !prev)}
                  className="px-2 py-0.5 border border-zinc-700 bg-[#0F0F11] text-zinc-300 hover:border-[#E05C36]"
                >
                  [Tab] Mode: {inlineAsSubtask ? `Subtask (L${previewDepth})` : 'Root Task (L0)'}
                </button>
              )}
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'NORMAL' })}
                className="text-zinc-400 hover:text-[#F4F4F5]"
              >
                [Esc] Cancel
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#E05C36] font-bold text-sm">&gt;</span>
            <input
              ref={inlineInputRef}
              type="text"
              value={inlineTitle}
              onChange={(e) => setInlineTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && selectedTask) {
                  e.preventDefault();
                  setInlineAsSubtask((prev) => !prev);
                }
              }}
              placeholder="Enter task or subtask specification and press [Enter]..."
              className="flex-1 bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-[#F4F4F5] placeholder-zinc-600 outline-none font-mono text-xs"
            />

            <select
              value={inlinePriority}
              onChange={(e) => setInlinePriority(e.target.value as Priority)}
              className="bg-[#0F0F11] border border-zinc-700 px-2 py-1.5 text-xs text-[#F4F4F5] outline-none font-mono"
            >
              <option value="HIGH">PRI: HIGH</option>
              <option value="MEDIUM">PRI: MEDIUM</option>
              <option value="LOW">PRI: LOW</option>
            </select>

            <input
              type="date"
              value={inlineDueDate}
              onChange={(e) => setInlineDueDate(e.target.value)}
              className="bg-[#0F0F11] border border-zinc-700 px-2 py-1 text-xs text-[#F4F4F5] outline-none font-mono"
            />

            <button
              type="submit"
              className="px-3 py-1.5 bg-[#E05C36] text-[#0F0F11] font-bold hover:bg-[#EA580C]"
            >
              COMMIT ↵
            </button>
          </div>
        </form>
      )}

      {/* Column Legend Header */}
      <div className="px-3 py-1.5 border-b border-zinc-800/80 bg-[#0F0F11] text-[10px] uppercase tracking-wider text-zinc-500 flex items-center justify-between">
        <span>HIERARCHICAL NODE (PROJECT → CATEGORY → TASK → L1..L3 SUBTASKS)</span>
        <div className="flex items-center gap-4 pr-1">
          <span>PRIORITY</span>
          <span>DUE DATE</span>
          <span>STATUS</span>
        </div>
      </div>

      {/* Hierarchical Task Tree List */}
      <div className="flex-1 overflow-y-auto tui-scroll divide-y divide-zinc-900/80">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs space-y-2">
            <div className="text-[#E05C36] font-bold">── NO MATCHING SCHEDULE NODES ──</div>
            <div>
              Press <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300">a</kbd> to
              create a new task or clear active filters.
            </div>
          </div>
        ) : (
          rows.map((row, index) => {
            const { task, hasChildren, childCount, completedChildCount, isLastSibling, ancestorLines } =
              row;
            const isSelected = task.id === state.selectedTaskId;
            const statusBadge = getStatusBadge(task.status);
            const categoryName = categoryMap.get(task.categoryId) ?? 'General';

            return (
              <div
                key={task.id}
                ref={isSelected ? selectedRowRef : null}
                onClick={() => dispatch({ type: 'SELECT_TASK', taskId: task.id })}
                className={`group px-3 py-2 flex items-center justify-between gap-3 cursor-pointer border-l-2 transition-colors text-xs ${
                  isSelected
                    ? 'border-[#E05C36] bg-[#18181B]'
                    : 'border-transparent hover:bg-[#18181B]/50'
                }`}
              >
                {/* Left: Tree Indentation, Box-Drawing Connectors, Status & Title */}
                <div className="flex items-center min-w-0 flex-1">
                  {/* Line number index */}
                  <span
                    className={`w-6 text-[10px] text-right mr-2.5 shrink-0 ${
                      isSelected ? 'text-[#E05C36] font-bold' : 'text-zinc-600'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  {/* Box-drawing ancestor continuation pipes */}
                  {ancestorLines.map((drawPipe, depthIdx) => (
                    <span
                      key={depthIdx}
                      className="w-5 text-zinc-700 font-mono select-none shrink-0"
                    >
                      {drawPipe ? '│  ' : '   '}
                    </span>
                  ))}

                  {/* Current depth branch connector */}
                  {task.depth > 0 && (
                    <span className="w-5 text-zinc-600 font-mono select-none shrink-0">
                      {isLastSibling ? '└─ ' : '├─ '}
                    </span>
                  )}

                  {/* Expand/Collapse toggle for parent tasks */}
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

                  {/* Interactive Status Checkbox [ ] / [~] / [✓] / [!] */}
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

                  {/* Depth Level Tag */}
                  <span
                    className={`text-[10px] px-1 mr-2 border shrink-0 ${
                      task.depth === 0
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-300 font-semibold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                    }`}
                  >
                    L{task.depth}
                  </span>

                  {/* Category Pill on Root Tasks */}
                  {task.depth === 0 && (
                    <span className="hidden md:inline-block text-[10px] text-zinc-400 bg-zinc-900/90 border border-zinc-800 px-1.5 py-0.2 mr-2 shrink-0">
                      {categoryName}
                    </span>
                  )}

                  {/* Task Title */}
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

                  {/* Milestone Flag [m] */}
                  {task.isMilestone && (
                    <span className="ml-2 px-1.5 py-0.2 text-[10px] bg-[#E05C36]/20 border border-[#E05C36] text-[#E05C36] font-bold shrink-0">
                      ◆ MILESTONE
                    </span>
                  )}

                  {/* Subtask Rollup Counter */}
                  {hasChildren && (
                    <span className="ml-2 text-[10px] text-zinc-500 shrink-0">
                      [{completedChildCount}/{childCount} subtasks]
                    </span>
                  )}
                </div>

                {/* Right: Priority Reorder Controls (J/K), Priority Pill, Due Date & Status */}
                <div className="flex items-center gap-2 shrink-0">
                  {isSelected && (
                    <div className="hidden sm:flex items-center gap-0.5 mr-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'REORDER_TASK_PRIORITY', direction: 'UP' });
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-[#E05C36] hover:text-[#E05C36]"
                        title="Shift+K: Move task UP in priority order"
                      >
                        ▲ K
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
                        ▼ J
                      </button>
                    </div>
                  )}

                  <span
                    className={`text-[10px] px-1.5 py-0.5 border w-16 text-center ${getPriorityStyle(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>

                  <span className="text-[11px] text-zinc-400 font-mono w-20 text-right">
                    {task.dueDate}
                  </span>

                  <span
                    className={`hidden xl:inline-block text-[10px] px-1.5 py-0.5 border w-24 text-center ${statusBadge.className}`}
                  >
                    {statusBadge.label}
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
