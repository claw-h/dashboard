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

  const activeProject = state.projects.find((p) => p.id === state.selectedProjectId);

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
      {/* CLI Stream Header Banner with Local vs Global Scope Switcher */}
      <div className="px-3 py-2 bg-[#18181B] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#E05C36] font-bold">◈</span>
          <span className="font-bold text-[#F4F4F5]">
            YXB // CMD — GLOBAL &amp; LOCAL SCOPED CLI
          </span>
          <div className="flex items-center border border-zinc-700 bg-[#0F0F11] ml-1">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_CLI_SCOPE', scope: 'LOCAL' })}
              className={`px-2 py-0.5 text-[10px] transition-colors ${
                state.cliScope === 'LOCAL'
                  ? 'bg-[#E05C36] text-[#0F0F11] font-bold'
                  : 'text-zinc-400 hover:text-[#F4F4F5]'
              }`}
            >
              LOCAL ({activeProject?.code ?? 'REPO'})
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_CLI_SCOPE', scope: 'GLOBAL' })}
              className={`px-2 py-0.5 text-[10px] border-l border-zinc-700 transition-colors ${
                state.cliScope === 'GLOBAL'
                  ? 'bg-[#E05C36] text-[#0F0F11] font-bold'
                  : 'text-zinc-400 hover:text-[#F4F4F5]'
              }`}
            >
              GLOBAL (11 REPOS)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <button
            type="button"
            onClick={() => dispatch({ type: 'EXECUTE_CLI_COMMAND', rawCommand: 'yxb status' })}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-300"
          >
            yxb status
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'EXECUTE_CLI_COMMAND', rawCommand: 'yxb status -g' })}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-300"
          >
            yxb status -g
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'EXECUTE_CLI_COMMAND', rawCommand: 'yxb help' })}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-300"
          >
            yxb help
          </button>
        </div>
      </div>

      {/* Stream Output Entries */}
      <div className="flex-1 overflow-y-auto tui-scroll p-3 space-y-2.5">
        <div className="p-2.5 border border-zinc-800 bg-[#18181B]/60 text-zinc-400 text-[11px] leading-relaxed space-y-1">
          <div className="text-[#F4F4F5] font-bold flex items-center justify-between">
            <span>
              ┌── Active Terminal Scope:{' '}
              <span className="text-[#E05C36]">
                {state.cliScope === 'LOCAL'
                  ? `${activeProject?.code} (${activeProject?.localPath})`
                  : 'GLOBAL (~/Documents/Github/* — 11 Repositories)'}
              </span>{' '}
              ──┐
            </span>
            <span className="text-emerald-400 text-[10px]">binary: ~/.local/bin/yxb</span>
          </div>
          <div>
            In any macOS terminal inside <code className="text-zinc-200">~/Documents/Github/&lt;repo&gt;</code>,
            run <code className="text-[#E05C36]">yxb status</code>,{' '}
            <code className="text-[#E05C36]">yxb add &quot;Title&quot;</code>,{' '}
            <code className="text-[#E05C36]">yxb sub &lt;id&gt; &quot;Title&quot;</code>, or{' '}
            <code className="text-[#E05C36]">yxb sync</code>.
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
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-zinc-500">[{entry.timestamp}]</span>
              {entry.scope && (
                <span className="px-1 py-0.2 text-[9px] bg-zinc-900 border border-zinc-700 text-zinc-400">
                  {entry.scope === 'LOCAL' ? entry.projectCode ?? 'LOCAL' : 'GLOBAL'}
                </span>
              )}
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
              <div className="text-[11px] text-zinc-400 pl-2 border-l border-zinc-800 font-mono break-words">
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
        <span className="text-[#E05C36] font-bold shrink-0">
          yxb ({state.cliScope === 'LOCAL' ? activeProject?.code : 'GLOBAL'}) &gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={commandInput}
          onFocus={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'CLI_INPUT' })}
          onBlur={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'NORMAL' })}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="status | status -g | cd portyxb | add <title> | sub <id> <title> | done <id>..."
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
