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
    label: '1. Local CWD-Scoped Commands (Run inside any ~/Documents/Github/<repo>)',
    cmd: `cd ~/Documents/Github/portyxb
yxb status                                  # Auto-detects PORTYXB & prints L0..L3 tree
yxb add "Optimize WebGL2 shadow atlas" -p HIGH -m
yxb sub task-port-200 "Hoist temporary Matrix4 allocation"
yxb done task-port-201                      # Marks completed & updates portyxb/TASKS.md`,
  },
  {
    label: '2. Global Multi-Repo Scan & Bidirectional Phone/Cloud Sync',
    cmd: `yxb status -g                               # Print all 11 repositories & Git status
yxb sync                                    # Scan Git branches & write TASKS.md to all 11 repos
yxb pull                                    # Pull phone/remote edits from GitHub
yxb push                                    # Commit & push registry to GitHub (claw-h/dashboard)`,
  },
  {
    label: '3. Initialize & Register a Brand-New Repository on YXB // CMD',
    cmd: `yxb init-project \\
  --code "NEBULA" \\
  --name "Nebula Shader Engine" \\
  --path "~/Documents/Github/nebula" \\
  --stack "Astro,Three.js,GLSL" \\
  --desc "Real-time volumetric shader studio"`,
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
        <div className="px-4 py-2.5 bg-[#18181B] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#E05C36] text-[#0F0F11] font-bold">
              [g] GLOBAL &amp; LOCAL `yxb` AGENT CLI PROTOCOL
            </span>
            <span className="text-[#F4F4F5] font-bold hidden sm:inline">
              Per-Repo TASKS.md + CWD Auto-Scoping
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

        <div className="p-4 overflow-y-auto tui-scroll space-y-4">
          <div className="p-3 bg-[#18181B] border border-zinc-800 space-y-2">
            <div className="text-[#E05C36] font-bold">
              ┌── ACTIVE AGENT DISCOVERY &amp; PER-REPO `TASKS.md` MIRRORS ──┐
            </div>
            <p className="text-zinc-300 leading-relaxed text-[11px]">
              Every repository in <code className="text-[#E05C36]">~/Documents/Github/*</code> now
              contains an auto-synced <code className="text-[#E05C36]">TASKS.md</code> blueprint at
              its root, and the global <code className="text-[#E05C36]">yxb</code> binary (
              <code className="text-zinc-400">~/.local/bin/yxb</code>) automatically detects which
              repo you or an agent are inside via <code className="text-zinc-400">process.cwd()</code>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 bg-[#0F0F11] border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">~/.local/bin/yxb (Global Binary)</span>
                <span className="text-emerald-400 font-bold">● INSTALLED</span>
              </div>
              <div className="p-2 bg-[#0F0F11] border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">~/Documents/Github/*/TASKS.md</span>
                <span className="text-emerald-400 font-bold">● 11/11 SYNCED</span>
              </div>
              <div className="p-2 bg-[#0F0F11] border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">~/Documents/Github/AGENTS.md</span>
                <span className="text-emerald-400 font-bold">● ACTIVE</span>
              </div>
              <div className="p-2 bg-[#0F0F11] border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">~/.agents/skills/dashboard-sync</span>
                <span className="text-emerald-400 font-bold">● MOUNTED</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider">
              ├─ Global &amp; Local Scoped `yxb` CLI Reference
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

        <div className="px-4 py-2.5 bg-[#18181B] border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Canonical Ledger: ~/Documents/Github/dashboard/src/data/workspaceRegistry.json</span>
          <span className="text-[#E05C36] font-bold">YXB // CMD v3.0</span>
        </div>
      </div>
    </div>
  );
};
