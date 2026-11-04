import React, { useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { selectTaskSubtree, type ScheduleAction } from '../state/scheduleEngine';
import type { Priority, ScheduleState, TaskStatus } from '../types/schedule';

interface RightInspectorPanelProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

function buildAsciiProgressBar(percent: number, width = 20): string {
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
  const projectCategories = state.categories
    .filter((c) => c.projectId === state.selectedProjectId)
    .sort((a, b) => a.order - b.order);

  // Panel 3 Unified Composer State
  const [composerTitle, setComposerTitle] = useState('');
  const [composerNotes, setComposerNotes] = useState('');
  const [composerPriority, setComposerPriority] = useState<Priority>('HIGH');
  const [composerDueDate, setComposerDueDate] = useState('2026-11-10');
  const [composerMilestone, setComposerMilestone] = useState(false);
  const [composerCategoryId, setComposerCategoryId] = useState<string>('');

  // Selected Node Live Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editMinutes, setEditMinutes] = useState(45);

  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const editTitleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (projectCategories.length > 0) {
      setComposerCategoryId(
        state.selectedCategoryId !== 'ALL'
          ? state.selectedCategoryId
          : selectedTask?.categoryId ?? projectCategories[0].id
      );
    }
  }, [state.selectedProjectId, state.selectedCategoryId, selectedTask?.categoryId]);

  useEffect(() => {
    if (selectedTask) {
      setEditTitle(selectedTask.title);
      setEditNotes(selectedTask.notes);
      setEditDueDate(selectedTask.dueDate);
      setEditMinutes(selectedTask.estimatedMinutes);
    }
  }, [selectedTask]);

  useEffect(() => {
    if (state.inputMode === 'INLINE_ADD') {
      setTimeout(() => {
        composerInputRef.current?.focus();
      }, 15);
    } else if (state.inputMode === 'INLINE_EDIT') {
      setTimeout(() => {
        editTitleInputRef.current?.focus();
        editTitleInputRef.current?.select();
      }, 15);
    }
  }, [state.inputMode, state.composerTargetParentId, state.composerMode]);

  const targetParentNode =
    state.composerMode === 'SUBTASK' && state.composerTargetParentId
      ? state.tasks[state.composerTargetParentId] ?? selectedTask
      : selectedTask;

  const previewDepth =
    state.composerMode === 'SUBTASK' && targetParentNode
      ? Math.min(3, targetParentNode.depth + 1)
      : 0;

  const handleComposerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerTitle.trim()) return;
    dispatch({
      type: 'ADD_TASK_PANEL3',
      title: composerTitle,
      notes: composerNotes,
      priority: composerPriority,
      dueDate: composerDueDate,
      isMilestone: composerMilestone,
      categoryId: composerCategoryId,
      mode: state.composerMode,
      targetParentId: targetParentNode?.id ?? null,
    });
    setComposerTitle('');
    setComposerNotes('');
    setComposerMilestone(false);
  };

  const handleSaveInspectorText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    dispatch({
      type: 'UPDATE_TASK_METADATA',
      taskId: selectedTask.id,
      title: editTitle,
      priority: selectedTask.priority,
      status: selectedTask.status,
      dueDate: editDueDate,
      estimatedMinutes: editMinutes,
      notes: editNotes,
    });
  };

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
      className={`w-full md:w-80 xl:w-[410px] bg-[#0F0F11] border-l border-zinc-800 flex flex-col justify-between select-none shrink-0 transition-colors ${
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
            TASK COMPOSER &amp; INSPECTOR
          </span>
        </div>
        <span className="text-[#E05C36] text-[11px]">[a] ADD · [l] FOCUS</span>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto tui-scroll p-3 space-y-3.5 text-xs">
        {/* SECTION 1: UNIFIED PANEL 3 TASK & SUBTASK COMPOSER */}
        <form
          onSubmit={handleComposerSubmit}
          className={`p-3 border transition-colors space-y-2.5 ${
            state.inputMode === 'INLINE_ADD'
              ? 'bg-[#18181B] border-2 border-[#E05C36]'
              : 'bg-[#18181B]/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#E05C36] flex items-center gap-1.5">
              <span>┌─ [a] ADD TASK / SUBTASK</span>
              <span className="px-1.5 py-0.2 bg-[#E05C36] text-[#0F0F11] text-[10px] font-bold">
                TARGET: L{previewDepth}
              </span>
            </span>
            {state.inputMode === 'INLINE_ADD' && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'NORMAL' })}
                className="text-[10px] text-zinc-400 hover:text-[#F4F4F5]"
              >
                [Esc]
              </button>
            )}
          </div>

          {/* 1-Click Mode Toggle: Subtask (L1..L3) vs Root Task (L0) */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={!selectedTask}
              onClick={() =>
                dispatch({
                  type: 'FOCUS_PANEL3_COMPOSER',
                  mode: 'SUBTASK',
                  targetParentId: targetParentNode?.id ?? selectedTask?.id ?? null,
                })
              }
              className={`py-1 px-2 text-[11px] border text-left truncate transition-colors ${
                state.composerMode === 'SUBTASK' && selectedTask
                  ? 'border-[#E05C36] bg-[#E05C36]/20 text-[#E05C36] font-bold'
                  : 'border-zinc-800 bg-[#0F0F11] text-zinc-400 hover:text-[#F4F4F5] disabled:opacity-40'
              }`}
            >
              ↳ Child Subtask (L{selectedTask ? Math.min(3, (targetParentNode?.depth ?? 0) + 1) : 1})
            </button>

            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'FOCUS_PANEL3_COMPOSER',
                  mode: 'ROOT',
                  targetParentId: null,
                })
              }
              className={`py-1 px-2 text-[11px] border text-left truncate transition-colors ${
                state.composerMode === 'ROOT' || !selectedTask
                  ? 'border-[#E05C36] bg-[#E05C36]/20 text-[#E05C36] font-bold'
                  : 'border-zinc-800 bg-[#0F0F11] text-zinc-400 hover:text-[#F4F4F5]'
              }`}
            >
              + Root Task (L0)
            </button>
          </div>

          {/* Parent or Category Context Indicator */}
          {state.composerMode === 'SUBTASK' && targetParentNode ? (
            <div className="px-2 py-1 bg-[#0F0F11] border border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between gap-2">
              <span className="truncate">
                Parent [L{targetParentNode.depth}]:{' '}
                <strong className="text-[#F4F4F5]">{targetParentNode.title}</strong>
              </span>
              {targetParentNode.depth === 3 && (
                <span className="text-amber-400 shrink-0">(Max L3 sibling)</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 shrink-0">CATEGORY:</span>
              <select
                value={composerCategoryId}
                onChange={(e) => setComposerCategoryId(e.target.value)}
                className="flex-1 bg-[#0F0F11] border border-zinc-700 px-2 py-1 text-[11px] text-[#F4F4F5] outline-none font-mono"
              >
                {projectCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title Input */}
          <div>
            <input
              ref={composerInputRef}
              type="text"
              value={composerTitle}
              onFocus={() => {
                if (state.inputMode !== 'INLINE_ADD') {
                  dispatch({ type: 'SET_INPUT_MODE', mode: 'INLINE_ADD', keyHint: 'a' });
                }
              }}
              onChange={(e) => setComposerTitle(e.target.value)}
              placeholder={
                state.composerMode === 'SUBTASK' && targetParentNode
                  ? `New L${previewDepth} subtask title...`
                  : 'New L0 Root Task title...'
              }
              className="w-full bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] placeholder-zinc-600 outline-none font-mono"
            />
          </div>

          {/* Optional Implementation Notes */}
          <div>
            <input
              type="text"
              value={composerNotes}
              onFocus={() => {
                if (state.inputMode !== 'INLINE_ADD') {
                  dispatch({ type: 'SET_INPUT_MODE', mode: 'INLINE_ADD', keyHint: 'a' });
                }
              }}
              onChange={(e) => setComposerNotes(e.target.value)}
              placeholder="Implementation notes / file references (optional)..."
              className="w-full bg-[#0F0F11] border border-zinc-800 focus:border-[#E05C36] px-2.5 py-1 text-[11px] text-zinc-300 placeholder-zinc-600 outline-none font-mono"
            />
          </div>

          {/* Priority Pills, Milestone Toggle & Due Date */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              {(['HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((pri) => (
                <button
                  key={pri}
                  type="button"
                  onClick={() => setComposerPriority(pri)}
                  className={`px-2 py-0.5 text-[10px] border transition-colors ${
                    composerPriority === pri
                      ? 'border-[#E05C36] bg-[#E05C36] text-[#0F0F11] font-bold'
                      : 'border-zinc-800 bg-[#0F0F11] text-zinc-400 hover:text-[#F4F4F5]'
                  }`}
                >
                  {pri}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setComposerMilestone((prev) => !prev)}
                className={`px-2 py-0.5 text-[10px] border transition-colors ${
                  composerMilestone
                    ? 'border-[#E05C36] bg-[#E05C36]/20 text-[#E05C36] font-bold'
                    : 'border-zinc-800 bg-[#0F0F11] text-zinc-400'
                }`}
                title="Mark new node as Milestone"
              >
                ◆ MS
              </button>
            </div>

            <input
              type="date"
              value={composerDueDate}
              onChange={(e) => setComposerDueDate(e.target.value)}
              className="bg-[#0F0F11] border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 outline-none font-mono"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-1.5 bg-[#E05C36] hover:bg-[#EA580C] text-[#0F0F11] font-bold text-xs tracking-wide transition-colors"
          >
            + CREATE {state.composerMode === 'SUBTASK' && targetParentNode ? `SUBTASK (L${previewDepth})` : 'ROOT TASK (L0)'} ↵
          </button>
        </form>

        {/* SECTION 2: INTERACTIVE SUBTASK TREE BUILDER (L1 -> L2 -> L3) */}
        {selectedTask && (
          <div className="p-3 bg-[#18181B]/60 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#F4F4F5]">
                ├─ SUBTASK TREE ({subtree.length})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#E05C36] font-mono">{subtreePct}%</span>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'FOCUS_PANEL3_COMPOSER',
                      mode: 'SUBTASK',
                      targetParentId: selectedTask.id,
                    })
                  }
                  className="px-1.5 py-0.2 bg-zinc-900 border border-[#E05C36]/60 text-[#E05C36] text-[10px] hover:bg-[#E05C36] hover:text-[#0F0F11] font-bold"
                >
                  + Add Child
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#E05C36] font-mono tracking-tight">
              [{buildAsciiProgressBar(subtreePct, 24)}]
            </div>

            {subtree.length === 0 ? (
              <div className="text-[11px] text-zinc-500 py-2">
                No nested subtasks under <strong className="text-zinc-300">{selectedTask.id}</strong>.
                Use the Composer above to add an L{Math.min(3, selectedTask.depth + 1)} subtask.
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                {subtree.map((sub) => {
                  const relIndent = Math.max(0, sub.depth - selectedTask.depth - 1);
                  const isTargetParent =
                    state.composerMode === 'SUBTASK' && state.composerTargetParentId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      style={{ marginLeft: `${relIndent * 12}px` }}
                      className={`py-1.5 px-2 border-l-2 flex items-center justify-between gap-1.5 text-[11px] transition-colors ${
                        isTargetParent
                          ? 'border-[#E05C36] bg-[#18181B] text-[#F4F4F5]'
                          : 'border-zinc-700 bg-[#0F0F11]/80 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      <div
                        onClick={() => dispatch({ type: 'SELECT_TASK', taskId: sub.id })}
                        className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="text-[10px] px-1 bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                          L{sub.depth}
                        </span>
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

                      {/* Inline Quick Actions on Every Subtask Row: [+] Spawn Child, [✓] Status, [×] Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        {sub.depth < 3 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({
                                type: 'FOCUS_PANEL3_COMPOSER',
                                mode: 'SUBTASK',
                                targetParentId: sub.id,
                              });
                            }}
                            className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-[#E05C36] text-[10px] font-bold"
                            title={`Add nested L${sub.depth + 1} subtask under "${sub.title}"`}
                          >
                            +L{sub.depth + 1}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'CYCLE_TASK_STATUS', taskId: sub.id });
                          }}
                          className={`px-1 py-0.2 border text-[10px] font-mono ${
                            sub.status === 'COMPLETED'
                              ? 'border-emerald-800 text-emerald-400 bg-emerald-950/30'
                              : sub.status === 'IN_PROGRESS'
                              ? 'border-[#E05C36]/60 text-[#E05C36]'
                              : 'border-zinc-800 text-zinc-400'
                          }`}
                          title="Cycle subtask status"
                        >
                          {sub.status === 'COMPLETED'
                            ? '✓'
                            : sub.status === 'IN_PROGRESS'
                            ? '~'
                            : sub.status === 'BLOCKED'
                            ? '!'
                            : '·'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'DELETE_TASK_BY_ID', taskId: sub.id });
                          }}
                          className="px-1 py-0.2 text-zinc-500 hover:text-red-400 text-[10px]"
                          title="Delete subtask"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: LIVE SELECTED NODE INSPECTOR & DIRECT EDITOR ([e]) */}
        {selectedTask && (
          <form
            onSubmit={handleSaveInspectorText}
            className="p-3 bg-[#18181B] border border-zinc-800 space-y-2.5"
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#E05C36] font-bold">
                └─ INSPECTING: {selectedTask.id} (L{selectedTask.depth})
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'TOGGLE_MILESTONE' })}
                className={`px-1.5 py-0.5 border ${
                  selectedTask.isMilestone
                    ? 'border-[#E05C36] bg-[#E05C36]/20 text-[#E05C36] font-bold'
                    : 'border-zinc-700 text-zinc-400 hover:text-[#F4F4F5]'
                }`}
              >
                [m] {selectedTask.isMilestone ? '◆ MILESTONE' : '◇ Milestone'}
              </button>
            </div>

            {/* Direct Status Selector Pills */}
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase block">STATUS (1-CLICK)</span>
              <div className="grid grid-cols-4 gap-1">
                {(['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'] as TaskStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'SET_TASK_STATUS', taskId: selectedTask.id, status: st })
                    }
                    className={`py-1 text-[10px] border text-center transition-colors ${
                      selectedTask.status === st
                        ? 'border-[#E05C36] bg-[#E05C36] text-[#0F0F11] font-bold'
                        : 'border-zinc-800 bg-[#0F0F11] text-zinc-400 hover:text-[#F4F4F5]'
                    }`}
                  >
                    {st === 'IN_PROGRESS' ? 'ACTIVE' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Priority Selector Pills */}
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase block">PRIORITY (1-CLICK)</span>
              <div className="grid grid-cols-3 gap-1">
                {(['HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((pri) => (
                  <button
                    key={pri}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'SET_TASK_PRIORITY',
                        taskId: selectedTask.id,
                        priority: pri,
                      })
                    }
                    className={`py-1 text-[10px] border text-center transition-colors ${
                      selectedTask.priority === pri
                        ? 'border-[#E05C36] bg-[#E05C36]/20 text-[#E05C36] font-bold'
                        : 'border-zinc-800 bg-[#0F0F11] text-zinc-400 hover:text-[#F4F4F5]'
                    }`}
                  >
                    {pri}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Title & Notes */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] text-zinc-500 uppercase block">
                TITLE &amp; ARCHITECTURAL NOTES [e]
              </label>
              <input
                ref={editTitleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-[#0F0F11] border border-zinc-800 focus:border-[#E05C36] px-2 py-1 text-xs text-[#F4F4F5] outline-none font-mono"
              />
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full bg-[#0F0F11] border border-zinc-800 focus:border-[#E05C36] px-2 py-1 text-[11px] text-zinc-300 outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="bg-[#0F0F11] border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300 outline-none font-mono"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DELETE_TASK_BY_ID', taskId: selectedTask.id })}
                  className="px-2 py-1 bg-red-950/40 border border-red-900/70 hover:border-red-500 text-red-300 text-[10px]"
                >
                  [d] Delete
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-[#E05C36] hover:text-[#0F0F11] text-[#F4F4F5] font-bold text-[10px] transition-colors"
                >
                  Save Text ↵
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </aside>
  );
};
