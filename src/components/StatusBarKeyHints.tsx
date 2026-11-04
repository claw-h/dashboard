import React from 'react';
import type { Dispatch } from 'react';
import type { ScheduleAction } from '../state/scheduleEngine';
import type { ScheduleState } from '../types/schedule';

interface StatusBarKeyHintsProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

const KEY_HINTS = [
  { key: 'p', label: 'Browse Projects' },
  { key: 'g', label: 'Agent Protocol' },
  { key: 'j/k', label: 'Up/Down' },
  { key: 'h/l', label: 'Left/Right' },
  { key: 'J/K', label: 'Priority' },
  { key: 'a', label: 'Add Node' },
  { key: 'e', label: 'Edit' },
  { key: 'd', label: 'Delete' },
  { key: 'm', label: 'Milestone' },
  { key: 't/c', label: 'Schedule/CLI' },
  { key: '/', label: 'Regex' },
  { key: 'Tab', label: 'Focus' },
];

export const StatusBarKeyHints: React.FC<StatusBarKeyHintsProps> = ({ state }) => {
  return (
    <footer className="h-8 bg-[#18181B] border-t border-zinc-800 px-3 flex items-center justify-between gap-3 text-[11px] select-none shrink-0">
      {/* Left: Vim Mode Indicator & Live Status Message */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`px-2 py-0.5 font-bold tracking-wider shrink-0 ${
            state.inputMode === 'NORMAL'
              ? 'bg-[#E05C36] text-[#0F0F11]'
              : 'bg-amber-400 text-[#0F0F11]'
          }`}
        >
          -- {state.inputMode} --
        </span>

        <span className="px-1.5 py-0.5 bg-[#0F0F11] border border-zinc-800 text-zinc-400 shrink-0">
          KEY: <strong className="text-[#E05C36]">{state.lastKeyPressed}</strong>
        </span>

        <span className="text-zinc-300 truncate">{state.statusMessage}</span>
      </div>

      {/* Right: Scholarly & Vim-Inspired Keybinding Legend */}
      <div className="hidden xl:flex items-center gap-2 shrink-0">
        {KEY_HINTS.map((item) => (
          <div key={item.key} className="flex items-center gap-1 text-[10px]">
            <kbd className="px-1 py-0.2 bg-[#0F0F11] border border-zinc-700 text-[#E05C36] font-bold">
              {item.key}
            </kbd>
            <span className="text-zinc-400">{item.label}</span>
          </div>
        ))}
      </div>
    </footer>
  );
};
