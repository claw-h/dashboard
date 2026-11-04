import React, { useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { selectTaskSubtree, type ScheduleAction } from '../state/scheduleEngine';
import type { Priority, ScheduleState, TaskStatus } from '../types/schedule';

interface RightInspectorPanelProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

function buildAsciiProgressBar(percent: number, width = 18): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = Math.max(0, width - filled);
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export const RightInspectorPanel: React.FC<RightInspectorPanelProps> = ({
  state,
  dispatch,
}) => {
  const isFocused = state.focusedPanel === 'RIGHT';
  const selectedTask = state.selectedTaskId ? state.tasks[state.selectedTaskId] : null;
  const subtree = selectTaskSubtree(state, state.selectedTaskId);

  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('HIGH');
  const [editStatus, setEditStatus] = useState<TaskStatus>('IN_PROGRESS');
  const [editDueDate, setEditDueDate] = useState('');
  const [editMinutes, setEditMinutes] = useState(30);
  const [editNotes, setEditNotes] = useState('');

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedTask) {
      setEditTitle(selectedTask.title);
      setEditPriority(selectedTask.priority);
      setEditStatus(selectedTask.status);
      setEditDueDate(selectedTask.dueDate);
      setEditMinutes(selectedTask.estimatedMinutes);
      setEditNotes(selectedTask.notes);
    }
  }, [selectedTask]);

  useEffect(() => {
    if (state.inputMode === 'INLINE_EDIT') {
      setTimeout(() => titleInputRef.current?.focus(), 10);
    }
  }, [state.inputMode]);

  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    dispatch({
      type: 'UPDATE_TASK_METADATA',
      taskId: selectedTask.id,
      title: editTitle,
      priority: editPriority,
      status: editStatus,
      dueDate: editDueDate,
      estimatedMinutes: editMinutes,
      notes: editNotes,
    });
  };

  // Compute global & project telemetry metrics
  const projectTasks = Object.values(state.tasks).filter(
    (t) => t.projectId === state.selectedProjectId
  );
  const completedInProj = projectTasks.filter((t) => t.status === 'COMPLETED').length;
  const blockedInProj = projectTasks.filter((t) => t.status === 'BLOCKED').length;
  const inProgressInProj = projectTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completionPct =
    projectTasks.length > 0 ? Math.round((completedInProj / projectTasks.length) * 100) : 0;

  const completedSubtree = subtree.filter((t) => t.status === 'COMPLETED').length;
  const subtreePct =
    subtree.length > 0
      ? Math.round((completedSubtree / subtree.length) * 100)
      : selectedTask?.status === 'COMPLETED'
      ? 100
      : 0;

  return (
    <aside
      onClick={() => dispatch({ type: 'SET_PANEL_FOCUS', panel: 'RIGHT' })}
      className={`w-80 xl:w-96 bg-[#0F0F11] border-l border-zinc-800 flex flex-col justify-between select-none shrink-0 transition-colors ${
        isFocused ? 'tui-box-shadow-active' : ''
      }`}
    >
      {/* Top Panel Title Strip */}
      <div className="h-8 px-3 border-b border-zinc-800 bg-[#18181B] flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1 font-bold ${
              isFocused ? 'bg-[#E05C36] text-[#0F0F11]' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            03
          </span>
          <span className="font-semibold tracking-wider text-[#F4F4F5]">
            CONTEXTUAL INSPECTOR
          </span>
        </div>
        <span className="text-[#E05C36] text-[11px]">[l] FOCUS</span>
      </div>

      {/* Main Inspector Body */}
      <div className="flex-1 overflow-y-auto tui-scroll p-3 space-y-4 text-xs">
        {!selectedTask ? (
          <div className="p-4 border border-zinc-800 bg-[#18181B]/40 text-zinc-500 text-center">
            No task currently selected. Use <kbd className="text-[#E05C36]">j</kbd> /{' '}
            <kbd className="text-[#E05C36]">k</kbd> to select a node.
          </div>
        ) : (
          <>
            {/* Selected Node Summary Card */}
            <div className="p-3 bg-[#18181B] border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#E05C36] font-bold">
                  NODE ID: {selectedTask.id} · DEPTH L{selectedTask.depth}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_MILESTONE' })}
                    className={`px-1.5 py-0.5 border text-[10px] ${
                      selectedTask.isMilestone
                        ? 'border-[#E05C36] bg-[#E05C36]/20 text-[#E05C36] font-bold'
                        : 'border-zinc-700 text-zinc-400 hover:text-[#F4F4F5]'
                    }`}
                  >
                    [m] {selectedTask.isMilestone ? '◆ MILESTONE' : '◇ Set Milestone'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'SET_INPUT_MODE',
                        mode: state.inputMode === 'INLINE_EDIT' ? 'NORMAL' : 'INLINE_EDIT',
                        keyHint: 'e',
                      })
                    }
                    className={`px-1.5 py-0.5 border text-[10px] ${
                      state.inputMode === 'INLINE_EDIT'
                        ? 'bg-[#E05C36] text-[#0F0F11] border-[#E05C36] font-bold'
                        : 'border-zinc-700 text-zinc-300 hover:border-[#E05C36]'
                    }`}
                  >
                    [e] Edit
                  </button>
                </div>
              </div>

              <div className="text-sm font-bold text-[#F4F4F5] leading-snug">
                {selectedTask.title}
              </div>

              <div className="text-[11px] text-zinc-400 leading-relaxed border-l-2 border-zinc-700 pl-2">
                {selectedTask.notes}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-zinc-800/80 text-[11px]">
                <div className="bg-[#0F0F11] px-2 py-1 border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[10px]">PRIORITY</span>
                  <span className="text-[#E05C36] font-bold">{selectedTask.priority}</span>
                </div>
                <div className="bg-[#0F0F11] px-2 py-1 border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[10px]">STATUS</span>
                  <span className="text-[#F4F4F5] font-semibold">{selectedTask.status}</span>
                </div>
                <div className="bg-[#0F0F11] px-2 py-1 border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[10px]">DUE DATE</span>
                  <span className="text-[#F4F4F5]">{selectedTask.dueDate}</span>
                </div>
                <div className="bg-[#0F0F11] px-2 py-1 border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[10px]">ESTIMATE</span>
                  <span className="text-[#F4F4F5]">{selectedTask.estimatedMinutes} mins</span>
                </div>
              </div>
            </div>

            {/* Inline Metadata Editor Form (Activated via `e`) */}
            {state.inputMode === 'INLINE_EDIT' && (
              <form
                onSubmit={handleSaveMetadata}
                className="p-3 bg-[#18181B] border-2 border-[#E05C36] space-y-2.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#E05C36] font-bold">── EDIT METADATA [e] ──</span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'NORMAL' })}
                    className="text-zinc-400 hover:text-[#F4F4F5]"
                  >
                    [Esc] Close
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase">Title</label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2 py-1 text-xs text-[#F4F4F5] outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as Priority)}
                      className="w-full bg-[#0F0F11] border border-zinc-700 px-2 py-1 text-xs text-[#F4F4F5] outline-none font-mono"
                    >
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                      className="w-full bg-[#0F0F11] border border-zinc-700 px-2 py-1 text-xs text-[#F4F4F5] outline-none font-mono"
                    >
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="QUEUED">QUEUED</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block">Due Date</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full bg-[#0F0F11] border border-zinc-700 px-2 py-1 text-xs text-[#F4F4F5] outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block">Est. Minutes</label>
                    <input
                      type="number"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(Number(e.target.value))}
                      className="w-full bg-[#0F0F11] border border-zinc-700 px-2 py-1 text-xs text-[#F4F4F5] outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 uppercase block">Notes</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2 py-1 text-xs text-[#F4F4F5] outline-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#E05C36] text-[#0F0F11] font-bold hover:bg-[#EA580C]"
                  >
                    SAVE METADATA ↵
                  </button>
                </div>
              </form>
            )}

            {/* Subtask Breakdown Tree (Up to 3 Levels Deep) */}
            <div className="p-3 bg-[#18181B]/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#F4F4F5]">
                  ├─ SUBTASK BREAKDOWN ({subtree.length})
                </span>
                <span className="text-[#E05C36] font-mono">{subtreePct}%</span>
              </div>

              <div className="text-[11px] text-[#E05C36] font-mono tracking-tight">
                [{buildAsciiProgressBar(subtreePct, 22)}]
              </div>

              {subtree.length === 0 ? (
                <div className="text-[11px] text-zinc-500 py-2">
                  No nested subtasks under this node. Press{' '}
                  <kbd className="px-1 bg-zinc-900 border border-zinc-700 text-[#E05C36]">a</kbd>{' '}
                  to spawn a child subtask (max depth L3).
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  {subtree.map((sub) => {
                    const relIndent = Math.max(0, sub.depth - selectedTask.depth - 1);
                    const isSubFocused =
                      isFocused && state.selectedRightSubtaskId === sub.id;
                    return (
                      <div
                        key={sub.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'SELECT_TASK', taskId: sub.id });
                        }}
                        style={{ paddingLeft: `${relIndent * 12 + 6}px` }}
                        className={`py-1 px-2 border-l-2 flex items-center justify-between gap-2 cursor-pointer text-[11px] ${
                          isSubFocused
                            ? 'border-[#E05C36] bg-[#18181B] text-[#F4F4F5]'
                            : 'border-zinc-700 bg-[#0F0F11]/70 text-zinc-300 hover:border-[#E05C36]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-zinc-500">L{sub.depth}</span>
                          <span
                            className={
                              sub.status === 'COMPLETED'
                                ? 'line-through text-zinc-500 truncate'
                                : 'truncate'
                            }
                          >
                            {sub.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {sub.status === 'COMPLETED'
                            ? '[✓]'
                            : sub.status === 'IN_PROGRESS'
                            ? '[~]'
                            : sub.status === 'BLOCKED'
                            ? '[!]'
                            : '[ ]'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Performance & Project Velocity Telemetry */}
        <div className="p-3 bg-[#18181B]/50 border border-zinc-800 space-y-2">
          <div className="text-[11px] font-bold text-[#F4F4F5] flex items-center justify-between">
            <span>└─ PROJECT TELEMETRY</span>
            <span className="text-[#E05C36]">{completionPct}% DONE</span>
          </div>

          <div className="text-[11px] text-emerald-400 font-mono">
            [{buildAsciiProgressBar(completionPct, 22)}]
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1">
            <div className="p-1.5 bg-[#0F0F11] border border-zinc-800">
              <span className="text-zinc-500 block">ACTIVE</span>
              <span className="text-[#E05C36] font-bold text-xs">{inProgressInProj}</span>
            </div>
            <div className="p-1.5 bg-[#0F0F11] border border-zinc-800">
              <span className="text-zinc-500 block">BLOCKED</span>
              <span className="text-red-400 font-bold text-xs">{blockedInProj}</span>
            </div>
            <div className="p-1.5 bg-[#0F0F11] border border-zinc-800">
              <span className="text-zinc-500 block">COMPLETED</span>
              <span className="text-emerald-400 font-bold text-xs">{completedInProj}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Footer */}
      <div className="p-2.5 border-t border-zinc-800 bg-[#18181B] flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'INLINE_EDIT', keyHint: 'e' })}
          className="px-2 py-1 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-200"
        >
          [e] Edit Node
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_MILESTONE' })}
          className="px-2 py-1 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-200"
        >
          [m] Milestone
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'DELETE_SELECTED_TASK' })}
          className="px-2 py-1 bg-red-950/40 border border-red-900/70 hover:border-red-500 text-red-300"
        >
          [d] Delete
        </button>
      </div>
    </aside>
  );
};
