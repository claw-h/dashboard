import React, { useEffect, useState } from 'react';
import type { Dispatch } from 'react';
import {
  getStoredGitHubConfig,
  pullRegistryFromGitHub,
  pushRegistryToGitHub,
  saveGitHubConfig,
  serializeStateToRegistryPayload,
} from '../state/githubSync';
import type { ScheduleAction } from '../state/scheduleEngine';
import type { ScheduleState, WorkspaceRegistryPayload } from '../types/schedule';

interface CloudSyncModalProps {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ state, dispatch }) => {
  const [repo, setRepo] = useState('claw-h/dashboard');
  const [token, setToken] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.cloudSyncOpen) {
      const cfg = getStoredGitHubConfig();
      setRepo(cfg.repo);
      setToken(cfg.token);
      setStatusMsg('');
    }
  }, [state.cloudSyncOpen]);

  if (!state.cloudSyncOpen) return null;

  const handlePull = async () => {
    setLoading(true);
    setStatusMsg('Pulling latest workspaceRegistry.json from GitHub...');
    saveGitHubConfig(token, repo);
    const res = await pullRegistryFromGitHub(repo, token);
    setLoading(false);
    setStatusMsg(res.message);
    if (res.ok && res.payload) {
      dispatch({
        type: 'APPLY_REMOTE_REGISTRY',
        payload: res.payload,
        sourceLabel: `${repo}@main`,
      });
    }
  };

  const handlePush = async () => {
    setLoading(true);
    setStatusMsg('Committing & pushing state to GitHub...');
    saveGitHubConfig(token, repo);
    const res = await pushRegistryToGitHub(
      state,
      repo,
      token,
      `chore(yxb-cmd): sync ${Object.keys(state.tasks).length} tasks from YXB // CMD web/phone UI`
    );
    setLoading(false);
    setStatusMsg(res.message);
  };

  const handleExportJson = () => {
    const payload = serializeStateToRegistryPayload(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspaceRegistry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Downloaded workspaceRegistry.json fork snapshot.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as WorkspaceRegistryPayload;
        if (parsed && parsed.projects && parsed.tasks) {
          dispatch({
            type: 'APPLY_REMOTE_REGISTRY',
            payload: parsed,
            sourceLabel: file.name,
          });
        }
      } catch {
        setStatusMsg('Invalid JSON registry file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={() => dispatch({ type: 'TOGGLE_CLOUD_SYNC', open: false })}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#0F0F11] border-2 border-[#E05C36] shadow-2xl flex flex-col font-mono text-xs select-none"
      >
        <div className="px-4 py-2.5 bg-[#18181B] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#E05C36] text-[#0F0F11] font-bold">
              ☁ PHONE &amp; GITHUB SYNC BRIDGE
            </span>
            <span className="text-[#F4F4F5] font-bold">Bidirectional State Sync</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_CLOUD_SYNC', open: false })}
            className="px-2 py-0.5 border border-zinc-700 text-zinc-400 hover:text-[#F4F4F5]"
          >
            [Esc] Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Edit tasks from your phone or remote browser and commit directly to{' '}
            <code className="text-[#E05C36]">src/data/workspaceRegistry.json</code> in your GitHub
            repo. On your Mac, run <code className="text-[#E05C36]">yxb pull</code> or{' '}
            <code className="text-[#E05C36]">yxb push</code> in any terminal to sync local{' '}
            <code className="text-[#E05C36]">TASKS.md</code> files across all 11 repositories.
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase block mb-1">
                GitHub Repository (owner/repo)
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full bg-[#18181B] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase block mb-1">
                GitHub Personal Access Token (Required only for Phone -&gt; GitHub Push)
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_... or github_pat_... (stored locally on this device)"
                className="w-full bg-[#18181B] border border-zinc-700 focus:border-[#E05C36] px-2.5 py-1.5 text-xs text-[#F4F4F5] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={handlePull}
              className="py-2 px-3 bg-[#18181B] border border-[#E05C36] text-[#E05C36] hover:bg-[#E05C36] hover:text-[#0F0F11] font-bold transition-colors"
            >
              ↓ PULL LATEST FROM GITHUB
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handlePush}
              className="py-2 px-3 bg-[#E05C36] hover:bg-[#EA580C] text-[#0F0F11] font-bold transition-colors"
            >
              ↑ COMMIT &amp; PUSH TO GITHUB
            </button>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-200 text-[11px]"
            >
              ⇩ Export Registry JSON Snapshot
            </button>

            <label className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-[#E05C36] text-zinc-200 text-[11px] cursor-pointer">
              ⇧ Import Snapshot JSON
              <input
                type="file"
                accept="application/json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>

          {statusMsg && (
            <div className="p-2.5 bg-[#18181B] border border-zinc-700 text-[#E05C36] text-[11px]">
              {statusMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
