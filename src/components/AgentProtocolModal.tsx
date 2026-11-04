import React, { useState } from 'react';
import type { Dispatch } from 'react';
import type { ScheduleAction } from '../state/scheduleEngine';
import type { ScheduleState } from '../types/schedule';

interface AgentProtocolModalProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

const CLI_SNIPPETS = [
  {
    label: '1. Initialize a New Project in ~/Documents/Github on YXB // CMD',
    cmd: `node ~/Documents/Github/dashboard/scripts/agent-sync.mjs init-project \\
  --code "NEBULA" \\
  --name "Nebula Shader Engine" \\
  --path "~/Documents/Github/nebula" \\
  --stack "Astro,Three.js,GLSL" \\
  --desc "Real-time volumetric shader studio"`,
  },
  {
    label: '2. Add a Task or Nested Subtask (L0..L3) from any Agent Session',
    cmd: `node ~/Documents/Github/dashboard/scripts/agent-sync.mjs add-task \\
  --project "proj-portyxb" \\
  --title "Implement offscreen WebGL2 render target pool" \\
  --priority "HIGH" \\
  --milestone`,
  },
  {
    label: '3. Log an Agent Architectural Change or Completed Task',
    cmd: `node ~/Documents/Github/dashboard/scripts/agent-sync.mjs log \\
  --project "proj-aos" \\
  --tool "AgentCommit" \\
  --summary "Completed 6-Sector 3D character & shader upgrade"`,
  },
];

export const AgentProtocolModal: React.FC<AgentProtocolModalProps> = ({
  state,
  dispatch,
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!state.agentProtocolOpen) return null;

  const copyText = (text: string, idx: number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={() => dispatch({ type: 'TOGGLE_AGENT_PROTOCOL', open: false })}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[#0F0F11] border-2 border-[#E05C36] shadow-2xl flex flex-col max-h-[85dvh] font-mono text-xs select-none"
      >
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#18181B] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#E05C36] text-[#0F0F11] font-bold">
              [g] GLOBAL AGENT CONTEXT PROTOCOL
            </span>
            <span className="text-[#F4F4F5] font-bold">
              YXB // CMD Automatic Multi-Agent Telemetry
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_AGENT_PROTOCOL', open: false })}
            className="px-2 py-0.5 border border-zinc-700 text-zinc-400 hover:text-[#F4F4F5]"
          >
            [Esc] Close
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto tui-scroll space-y-4">
          {/* Active Global Rules Status */}
          <div className="p-3 bg-[#18181B] border border-zinc-800 space-y-2">
            <div className="text-[#E05C36] font-bold">
              ┌── ACTIVE HIERARCHICAL AGENT DISCOVERY HOOKS ──┐
            </div>
            <p className="text-zinc-300 leading-relaxed text-[11px]">
              All future coding agents (Antigravity, Claude Code, Cursor, Codex) operating inside{' '}
              <code className="text-[#E05C36]">~/Documents/Github/*</code> automatically inherit the
              root rules below and synchronize new projects, tasks, and architectural changes to
              this dashboard:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 bg-[#0F0F11] border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">~/Documents/Github/AGENTS.md</span>
                <span className="text-emerald-400 font-bold">● ACTIVE</span>
              </div>
              <div className="p-2 bg-[#0F0F11] border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">~/Documents/Github/GEMINI.md</span>
                <span className="text-emerald-400 font-bold">● ACTIVE</span>
              </div>
              <div className="p-2 bg-[#0F0F11] border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">~/Documents/Github/CLAUDE.md</span>
                <span className="text-emerald-400 font-bold">● ACTIVE</span>
              </div>
              <div className="p-2 bg-[#0F0F11] border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">~/.agents/skills/dashboard-sync</span>
                <span className="text-emerald-400 font-bold">● MOUNTED</span>
              </div>
            </div>
          </div>

          {/* CLI Commands for Future Agents */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider">
              ├─ Headless Agent CLI Sync Commands (scripts/agent-sync.mjs)
            </div>

            {CLI_SNIPPETS.map((item, idx) => (
              <div
                key={item.label}
                className="p-3 bg-[#18181B]/70 border border-zinc-800 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-semibold text-[11px]">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => copyText(item.cmd, idx)}
                    className="px-2 py-0.5 bg-[#0F0F11] border border-zinc-700 hover:border-[#E05C36] text-[10px] text-[#E05C36]"
                  >
                    {copiedIdx === idx ? '✓ COPIED' : 'COPY CMD'}
                  </button>
                </div>
                <pre className="p-2 bg-[#0F0F11] border border-zinc-800/90 text-zinc-300 text-[11px] overflow-x-auto font-mono select-all">
                  {item.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#18181B] border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Canonical Ledger: ~/Documents/Github/dashboard/src/data/workspaceRegistry.json</span>
          <span className="text-[#E05C36] font-bold">YXB // CMD v2.5</span>
        </div>
      </div>
    </div>
  );
};
