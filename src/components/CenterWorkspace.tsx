import React from 'react';
import type { Dispatch } from 'react';
import type { ScheduleAction } from '../state/scheduleEngine';
import type { ScheduleState, VisibleTaskRow } from '../types/schedule';
import { CliStreamWorkspace } from './CliStreamWorkspace';
import { ScheduleWorkspace } from './ScheduleWorkspace';

interface CenterWorkspaceProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
  rows: VisibleTaskRow[];
  regexError: string | null;
}

export const CenterWorkspace: React.FC<CenterWorkspaceProps> = ({
  state,
  dispatch,
  rows,
  regexError,
}) => {
  const isFocused = state.focusedPanel === 'CENTER';

  return (
    <main
      onClick={() => dispatch({ type: 'SET_PANEL_FOCUS', panel: 'CENTER' })}
      className={`flex-1 flex flex-col min-w-0 min-h-0 bg-[#0F0F11] transition-colors ${
        isFocused ? 'tui-box-shadow-active' : ''
      }`}
    >
      {/* Top Panel Title Strip */}
      <div className="h-8 px-3 border-b border-zinc-800 bg-[#18181B] flex items-center justify-between text-[11px] select-none shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`px-1 font-bold ${
              isFocused ? 'bg-[#E05C36] text-[#0F0F11]' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            02
          </span>
          <span className="font-semibold tracking-wider text-[#F4F4F5]">
            {state.activeMode === 'SCHEDULE'
              ? 'MAIN WORKSPACE // HIERARCHICAL SCHEDULE ENGINE'
              : 'MAIN WORKSPACE // CLAUDE CODE TUI STREAM'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-zinc-400">
          <span>
            MODE:{' '}
            <strong className="text-[#E05C36]">
              {state.activeMode === 'SCHEDULE' ? 'SCHEDULE [t]' : 'CLI_STREAM [c]'}
            </strong>
          </span>
        </div>
      </div>

      {/* Active Mode Viewport */}
      <div className="flex-1 min-h-0">
        {state.activeMode === 'SCHEDULE' ? (
          <ScheduleWorkspace
            state={state}
            dispatch={dispatch}
            rows={rows}
            regexError={regexError}
          />
        ) : (
          <CliStreamWorkspace state={state} dispatch={dispatch} />
        )}
      </div>
    </main>
  );
};
