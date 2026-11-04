import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { ScheduleAction } from '../state/scheduleEngine';
import type { ScheduleState } from '../types/schedule';

interface CliStreamWorkspaceProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

interface CliSuggestion {
  cmd: string;
  desc: string;
}

export const CliStreamWorkspace: React.FC<CliStreamWorkspaceProps> = ({
  state,
  dispatch,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<string[]>([
    'yxb status',
    'yxb status -g',
    'cd portyxb',
    'yxb help',
  ]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeProject = state.projects.find((p) => p.id === state.selectedProjectId);
  const projectTasks = useMemo(
    () =>
      Object.values(state.tasks).filter(
        (t) => t.projectId === state.selectedProjectId
      ),
    [state.tasks, state.selectedProjectId]
  );

  // Auto-focus CLI prompt when switching to CLI_STREAM mode
  useEffect(() => {
    if (state.activeMode === 'CLI_STREAM') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 25);
    }
  }, [state.activeMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.cliLogs.length]);

  // Contextual autocomplete suggestions based on current input prefix
  const suggestions = useMemo<CliSuggestion[]>(() => {
    const raw = commandInput.replace(/^yxb\s+/i, '').trimStart();
    const lower = raw.toLowerCase();

    if (lower.startsWith('cd ')) {
      const q = lower.slice(3).trim();
      return state.projects
        .filter(
          (p) =>
            !q ||
            p.code.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q)
        )
        .slice(0, 6)
        .map((p) => ({
          cmd: `cd ${p.code.toLowerCase()}`,
          desc: `Switch local scope to ${p.name} (${p.localPath})`,
        }));
    }

    if (lower.startsWith('done ') || lower.startsWith('sub ')) {
      const isSub = lower.startsWith('sub ');
      const prefixCmd = isSub ? 'sub' : 'done';
      const q = lower.slice(prefixCmd.length + 1).trim();
      return projectTasks
        .filter(
          (t) =>
            (!isSub ? t.status !== 'COMPLETED' : t.depth < 3) &&
            (!q || t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q))
        )
        .slice(0, 5)
        .map((t) => ({
          cmd: isSub ? `sub ${t.id} ` : `done ${t.id}`,
          desc: `[L${t.depth}] ${t.title.slice(0, 48)}`,
        }));
    }

    const baseCommands: CliSuggestion[] = [
      {
        cmd: 'status',
        desc: `Print L0..L3 task tree & Git status for ${activeProject?.code ?? 'current repo'}`,
      },
      {
        cmd: 'status -g',
        desc: 'Global audit across all 11 ~/Documents/Github repositories',
      },
      {
        cmd: 'cd ',
        desc: 'Switch local repository scope (e.g. cd portyxb, cd aos-v3)',
      },
      {
        cmd: 'add ',
        desc: `Create new L0 Root Task in ${activeProject?.code ?? 'current repo'}`,
      },
      {
        cmd: 'sub ',
        desc: 'Spawn nested L1..L3 subtask under a task ID',
      },
      {
        cmd: 'done ',
        desc: 'Mark a task ID as COMPLETED',
      },
      {
        cmd: 'protocol',
        desc: 'Open Global & Local `yxb` Agent Protocol reference',
      },
      {
        cmd: 'clear',
        desc: 'Clear terminal stream buffer (Ctrl+L)',
      },
    ];

    if (!lower) return baseCommands.slice(0, 5);
    return baseCommands.filter(
      (item) =>
        item.cmd.toLowerCase().includes(lower) ||
        item.desc.toLowerCase().includes(lower)
    );
  }, [commandInput, state.projects, projectTasks, activeProject?.code]);

  useEffect(() => {
    setSelectedSuggestionIdx(0);
  }, [suggestions.length, commandInput]);

  const executeCommand = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;
    dispatch({ type: 'EXECUTE_CLI_COMMAND', rawCommand: trimmed });
    setHistory((prev) => [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 30));
    setHistoryIdx(-1);
    setCommandInput('');
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(commandInput);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+L clears terminal buffer immediately
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      executeCommand('clear');
      return;
    }

    // Tab autocompletes the highlighted suggestion
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      const chosen = suggestions[selectedSuggestionIdx] ?? suggestions[0];
      if (chosen) {
        setCommandInput(chosen.cmd);
      }
      return;
    }

    // Up arrow cycles command history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = Math.min(history.length - 1, historyIdx + 1);
      setHistoryIdx(nextIdx);
      setCommandInput(history[nextIdx]);
      return;
    }

    // Down arrow steps forward in command history
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setCommandInput('');
        return;
      }
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      setCommandInput(history[nextIdx]);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0F0F11] text-xs font-mono">
      {/* CLI Stream Header Banner with Local vs Global Scope Switcher */}
      <div className="px-3 py-2 bg-[#18181B] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#E05C36] font-bold">◈</span>
          <span className="font-bold text-[#F4F4F5]">
            YXB // CMD — INTERACTIVE TERMINAL
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

        {/* One-Click Quick Command Pills */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <button
            type="button"
            onClick={() => executeCommand('status')}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-200 transition-colors"
          >
            ▸ status
          </button>
          <button
            type="button"
            onClick={() => executeCommand('status -g')}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-200 transition-colors"
          >
            ▸ status -g
          </button>
          <button
            type="button"
            onClick={() => executeCommand('clear')}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            clear
          </button>
        </div>
      </div>

      {/* Stream Output Entries */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto tui-scroll p-3 space-y-2.5 cursor-text"
      >
        <div className="p-2.5 border border-zinc-800 bg-[#18181B]/60 text-zinc-400 text-[11px] leading-relaxed space-y-1">
          <div className="text-[#F4F4F5] font-bold flex items-center justify-between">
            <span>
              ┌── Active Scope:{' '}
              <span className="text-[#E05C36]">
                {state.cliScope === 'LOCAL'
                  ? `${activeProject?.code} (${activeProject?.localPath})`
                  : 'GLOBAL (~/Documents/Github/* — 11 Repositories)'}
              </span>{' '}
              ──┐
            </span>
            <span className="text-emerald-400 text-[10px]">
              ⎇ {activeProject?.gitBranch ?? 'main'} · ~/.local/bin/yxb
            </span>
          </div>
          <div>
            Use <kbd className="px-1 bg-zinc-900 border border-zinc-700 text-[#E05C36]">Tab</kbd>{' '}
            to autocomplete commands/IDs,{' '}
            <kbd className="px-1 bg-zinc-900 border border-zinc-700 text-[#E05C36]">↑/↓</kbd> for
            command history, or click any task ID in the output below to inspect it in Panel 3.
          </div>
        </div>

        {state.cliLogs.map((entry) => (
          <div
            key={entry.id}
            className={`animate-cli-entry border-l-2 pl-3 py-1.5 space-y-1.5 ${
              entry.accent
                ? 'border-[#E05C36] bg-[#18181B]/45'
                : 'border-zinc-700 bg-[#18181B]/20'
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
              <pre className="text-[11px] text-zinc-300 pl-2.5 py-1 border-l border-zinc-800 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {entry.detail.split('\n').map((line, lineIdx) => {
                  // Make task IDs (e.g. task-port-100) interactive inside CLI output!
                  const taskIdMatch = line.match(/\b(task-[a-z0-9-]+)\b/i);
                  const matchedTaskId = taskIdMatch ? taskIdMatch[1] : null;
                  const exists = matchedTaskId && state.tasks[matchedTaskId];

                  if (exists && matchedTaskId) {
                    return (
                      <div
                        key={lineIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'SELECT_TASK', taskId: matchedTaskId });
                        }}
                        className="hover:bg-[#18181B] hover:text-[#E05C36] px-1 -mx-1 cursor-pointer transition-colors flex items-center justify-between group"
                        title="Click to inspect & edit this task in Panel 3"
                      >
                        <span>{line}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#E05C36] font-bold">
                          [Inspect in Panel 3 →]
                        </span>
                      </div>
                    );
                  }
                  return <div key={lineIdx}>{line}</div>;
                })}
              </pre>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Live Autocomplete Suggestion Bar (Tab or Click to fill) */}
      {suggestions.length > 0 && (
        <div className="px-3 py-1.5 bg-[#0F0F11] border-t border-zinc-800/90 flex items-center gap-2 overflow-x-auto tui-scroll">
          <span className="text-[10px] text-zinc-500 shrink-0">[Tab] Complete:</span>
          {suggestions.map((sug, idx) => (
            <button
              key={sug.cmd}
              type="button"
              onClick={() => {
                if (sug.cmd.endsWith(' ')) {
                  setCommandInput(sug.cmd);
                  inputRef.current?.focus();
                } else {
                  executeCommand(sug.cmd);
                }
              }}
              className={`px-2 py-0.5 text-[11px] border shrink-0 flex items-center gap-1.5 transition-colors ${
                idx === selectedSuggestionIdx
                  ? 'border-[#E05C36] bg-[#E05C36]/15 text-[#F4F4F5]'
                  : 'border-zinc-800 bg-[#18181B] text-zinc-400 hover:text-[#F4F4F5]'
              }`}
            >
              <span className="text-[#E05C36] font-bold">{sug.cmd.trim()}</span>
              <span className="text-[10px] text-zinc-500 hidden sm:inline">
                {sug.desc.slice(0, 34)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom Interactive CLI Input Box */}
      <form
        onSubmit={handleCommandSubmit}
        className="p-2.5 bg-[#18181B] border-t border-zinc-800 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'SET_CLI_SCOPE',
              scope: state.cliScope === 'LOCAL' ? 'GLOBAL' : 'LOCAL',
            })
          }
          className="px-2 py-1 bg-[#0F0F11] border border-zinc-700 hover:border-[#E05C36] text-[#E05C36] font-bold text-xs shrink-0 transition-colors"
          title="Click to toggle LOCAL vs GLOBAL CLI scope"
        >
          yxb ({state.cliScope === 'LOCAL' ? activeProject?.code : 'GLOBAL'}) &gt;
        </button>

        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onFocus={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'CLI_INPUT' })}
            onBlur={() => dispatch({ type: 'SET_INPUT_MODE', mode: 'NORMAL' })}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type command (Tab to complete, ↑/↓ history, Ctrl+L clear)..."
            className="w-full bg-[#0F0F11] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] placeholder-zinc-600 outline-none font-mono"
          />
        </div>

        <button
          type="submit"
          className="px-3.5 py-1.5 bg-[#E05C36] text-[#0F0F11] font-bold hover:bg-[#EA580C] text-xs transition-colors"
        >
          RUN ↵
        </button>
      </form>
    </div>
  );
};
