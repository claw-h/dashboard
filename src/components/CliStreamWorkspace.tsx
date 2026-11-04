import React, { useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { ScheduleAction } from '../state/scheduleEngine';
import type { ScheduleState } from '../types/schedule';

interface CliStreamWorkspaceProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

export const CliStreamWorkspace: React.FC<CliStreamWorkspaceProps> = ({
  state,
  dispatch,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.cliLogs.length]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    dispatch({ type: 'EXECUTE_CLI_COMMAND', rawCommand: commandInput });
    setCommandInput('');
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0F0F11] text-xs font-mono">
      {/* CLI Stream Header Banner */}
      <div className="px-3 py-2 bg-[#18181B] border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#E05C36] font-bold">◈</span>
          <span className="font-bold text-[#F4F4F5]">
            YXB // CMD — INTERACTIVE AGENT TELEMETRY &amp; DIFF STREAM
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <button
            type="button"
            onClick={() => dispatch({ type: 'EXECUTE_CLI_COMMAND', rawCommand: '/projects' })}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-300"
          >
            /projects
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'EXECUTE_CLI_COMMAND', rawCommand: '/stats' })}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-300"
          >
            /stats
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'EXECUTE_CLI_COMMAND', rawCommand: '/help' })}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-300"
          >
            /help
          </button>
        </div>
      </div>

      {/* Stream Output Entries */}
      <div className="flex-1 overflow-y-auto tui-scroll p-3 space-y-2.5">
        <div className="p-2.5 border border-zinc-800 bg-[#18181B]/60 text-zinc-400 text-[11px] leading-relaxed">
          <div className="text-[#F4F4F5] font-bold mb-1">
            ┌── YXB // CMD Sovereign Agent Session (tty001 · ~/Documents/Github) ──┐
          </div>
          <div>
            Every schedule mutation, priority shift (<span className="text-[#E05C36]">J/K</span>),
            milestone toggle (<span className="text-[#E05C36]">m</span>), project mount (
            <span className="text-[#E05C36]">p</span>), and headless agent CLI sync streams
            structured telemetry here.
          </div>
        </div>

        {state.cliLogs.map((entry) => (
          <div
            key={entry.id}
            className={`border-l-2 pl-3 py-1 space-y-1 ${
              entry.accent
                ? 'border-[#E05C36] bg-[#18181B]/50'
                : 'border-zinc-700 bg-transparent'
            }`}
          >
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-500">[{entry.timestamp}]</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] font-bold border ${
                  entry.type === 'MUTATION'
                    ? 'border-[#E05C36]/60 text-[#E05C36] bg-[#E05C36]/10'
                    : entry.type === 'TOOL_CALL'
                    ? 'border-sky-800 text-sky-300 bg-sky-950/30'
                    : entry.type === 'DIFF'
                    ? 'border-emerald-800 text-emerald-300 bg-emerald-950/30'
                    : 'border-zinc-700 text-zinc-300 bg-zinc-900'
                }`}
              >
                {entry.toolName ?? entry.type}
              </span>
              <span className="text-[#F4F4F5] font-medium">{entry.summary}</span>
            </div>
            {entry.detail && (
              <div className="text-[11px] text-zinc-400 pl-2 border-l border-zinc-800 font-mono">
                {entry.detail}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Bottom Interactive CLI Input Box */}
      <form
        onSubmit={handleCommandSubmit}
        className="p-2.5 bg-[#18181B] border-t border-zinc-800 flex items-center gap-2"
      >
        <span className="text-[#E05C36] font-bold">yxb &gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={commandInput}
          onFocus={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'CLI_INPUT' })}
          onBlur={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'NORMAL' })}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Type /projects, /protocol, /stats, /add <task title>, or /clear..."
          className="flex-1 bg-[#0F0F11] border border-zinc-800 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] placeholder-zinc-600 outline-none font-mono"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-[#E05C36] text-[#0F0F11] font-bold hover:bg-[#EA580C] text-xs"
        >
          RUN ↵
        </button>
      </form>
    </div>
  );
};
