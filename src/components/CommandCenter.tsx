import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { useKeybindings } from '../hooks/useKeybindings';
import {
  scheduleReducer,
  selectVisibleTaskRows,
} from '../state/scheduleEngine';
import {
  createInitialSeedState,
  loadScheduleState,
  saveScheduleState,
  STORAGE_KEY,
} from '../state/storage';
import { AgentProtocolModal } from './AgentProtocolModal';
import { CenterWorkspace } from './CenterWorkspace';
import { CloudSyncModal } from './CloudSyncModal';
import { LeftPanelTree } from './LeftPanelTree';
import { ProjectBrowserDropdown } from './ProjectBrowserDropdown';
import { RightInspectorPanel } from './RightInspectorPanel';
import { StatusBarKeyHints } from './StatusBarKeyHints';
import { TopHeaderBar } from './TopHeaderBar';

export const CommandCenter: React.FC = () => {
  const [state, dispatch] = useReducer(scheduleReducer, undefined, createInitialSeedState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from LocalStorage & merge canonical ~/Documents/Github registry on mount
  useEffect(() => {
    const stored = loadScheduleState();
    dispatch({ type: 'SYNC_FROM_STORAGE', state: stored });
    setHydrated(true);
  }, []);

  // Persist to LocalStorage whenever domain state changes
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      saveScheduleState(state);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [state, hydrated]);

  // Cross-tab LocalStorage synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.tasks) {
            dispatch({
              type: 'SYNC_FROM_STORAGE',
              state: { ...state, ...parsed },
            });
          }
        } catch {
          // Ignore malformed external storage events
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [state]);

  // Attach global Vim & scholarly keyboard interceptor
  useKeybindings(state, dispatch);

  // Memoize visible flattened rows & regex compilation
  const { rows, regexError } = useMemo(
    () => selectVisibleTaskRows(state),
    [
      state.tasks,
      state.selectedProjectId,
      state.selectedCategoryId,
      state.sortBy,
      state.statusFilter,
      state.filterQuery,
      state.regexQuery,
    ]
  );

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#0F0F11] text-[#F4F4F5] font-mono relative">
      {/* Top YXB // CMD Session, Browse Project Breadcrumb & Filter Header */}
      <TopHeaderBar state={state} dispatch={dispatch} regexError={regexError} />

      {/* Browse Project [p] Mega-Dropdown attached to ~/workspace breadcrumb */}
      <ProjectBrowserDropdown state={state} dispatch={dispatch} />

      {/* Global Agent Context Protocol Modal [g] */}
      <AgentProtocolModal state={state} dispatch={dispatch} />

      {/* Phone & GitHub Cloud Sync Modal [s] */}
      <CloudSyncModal state={state} dispatch={dispatch} />

      {/* Desktop 3-Column Split View + Responsive Mobile Single-Panel View */}
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        {/* Column 1: Left Project & Category Tree */}
        <div
          className={`${
            state.focusedPanel === 'LEFT' ? 'flex w-full md:w-auto' : 'hidden md:flex'
          } h-full min-h-0`}
        >
          <LeftPanelTree state={state} dispatch={dispatch} />
        </div>

        {/* Column 2: Center Schedule / CLI Stream Workspace */}
        <div
          className={`${
            state.focusedPanel === 'CENTER' ? 'flex flex-1' : 'hidden md:flex md:flex-1'
          } h-full min-h-0 min-w-0`}
        >
          <CenterWorkspace
            state={state}
            dispatch={dispatch}
            rows={rows}
            regexError={regexError}
          />
        </div>

        {/* Column 3: Unified Task & Subtask Composer + Inspector */}
        <div
          className={`${
            state.focusedPanel === 'RIGHT' ? 'flex w-full md:w-auto' : 'hidden md:flex'
          } h-full min-h-0`}
        >
          <RightInspectorPanel state={state} dispatch={dispatch} />
        </div>
      </div>

      {/* Mobile / Phone Touch Navigation Bar (<768px) */}
      <nav className="flex md:hidden h-10 bg-[#18181B] border-t border-zinc-800 text-xs shrink-0">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_PANEL_FOCUS', panel: 'LEFT' })}
          className={`flex-1 flex items-center justify-center gap-1 border-r border-zinc-800 ${
            state.focusedPanel === 'LEFT'
              ? 'bg-[#E05C36] text-[#0F0F11] font-bold'
              : 'text-zinc-400'
          }`}
        >
          <span>[01] REPOS</span>
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_PANEL_FOCUS', panel: 'CENTER' })}
          className={`flex-1 flex items-center justify-center gap-1 border-r border-zinc-800 ${
            state.focusedPanel === 'CENTER'
              ? 'bg-[#E05C36] text-[#0F0F11] font-bold'
              : 'text-zinc-400'
          }`}
        >
          <span>[02] WORKSPACE</span>
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_PANEL_FOCUS', panel: 'RIGHT' })}
          className={`flex-1 flex items-center justify-center gap-1 ${
            state.focusedPanel === 'RIGHT'
              ? 'bg-[#E05C36] text-[#0F0F11] font-bold'
              : 'text-zinc-400'
          }`}
        >
          <span>[03] + ADD / EDIT</span>
        </button>
      </nav>

      {/* Bottom Vim Keybinding Status Bar */}
      <StatusBarKeyHints state={state} dispatch={dispatch} />
    </div>
  );
};

export default CommandCenter;
