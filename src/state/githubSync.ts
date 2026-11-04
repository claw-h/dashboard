import type { ScheduleState, WorkspaceRegistryPayload } from '../types/schedule';

const GH_TOKEN_KEY = 'yxb_cmd_github_pat_v1';
const GH_REPO_KEY = 'yxb_cmd_github_repo_v1';
const DEFAULT_REPO = 'claw-h/dashboard';
const REGISTRY_FILE_PATH = 'src/data/workspaceRegistry.json';

export function getStoredGitHubConfig(): { token: string; repo: string } {
  if (typeof window === 'undefined') {
    return { token: '', repo: DEFAULT_REPO };
  }
  return {
    token: window.localStorage.getItem(GH_TOKEN_KEY) ?? '',
    repo: window.localStorage.getItem(GH_REPO_KEY) || DEFAULT_REPO,
  };
}

export function saveGitHubConfig(token: string, repo: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GH_TOKEN_KEY, token.trim());
  window.localStorage.setItem(GH_REPO_KEY, repo.trim() || DEFAULT_REPO);
}

function encodeBase64UTF8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function decodeBase64UTF8(base64: string): string {
  const clean = base64.replace(/\s/g, '');
  const binary = window.atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function serializeStateToRegistryPayload(
  state: ScheduleState
): WorkspaceRegistryPayload {
  return {
    schemaVersion: 3,
    updatedAt: new Date().toISOString(),
    projects: state.projects,
    categories: state.categories,
    tasks: Object.values(state.tasks),
    cliLogs: state.cliLogs.slice(-60),
  };
}

/**
 * Pulls the latest `src/data/workspaceRegistry.json` directly from GitHub (`claw-h/dashboard`)
 * so a phone or remote browser can sync the latest state from the Mac (or vice versa).
 */
export async function pullRegistryFromGitHub(
  repo = DEFAULT_REPO,
  token = ''
): Promise<{ ok: boolean; payload?: WorkspaceRegistryPayload; sha?: string; message: string }> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
    };
    if (token.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${REGISTRY_FILE_PATH}?ref=main&t=${Date.now()}`,
      { headers }
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `GitHub API returned ${res.status}: ${res.statusText}`,
      };
    }
    const data = await res.json();
    const decoded = decodeBase64UTF8(data.content);
    const payload = JSON.parse(decoded) as WorkspaceRegistryPayload;
    return {
      ok: true,
      payload,
      sha: data.sha,
      message: `Pulled ${payload.projects.length} projects & ${payload.tasks.length} tasks from ${repo}@main`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Failed to pull from GitHub',
    };
  }
}

/**
 * Commits & pushes the current dashboard state directly to `src/data/workspaceRegistry.json`
 * on GitHub (`claw-h/dashboard`), enabling full phone-to-Mac editing from anywhere.
 */
export async function pushRegistryToGitHub(
  state: ScheduleState,
  repo = DEFAULT_REPO,
  token = '',
  commitMessage = 'chore(yxb-cmd): sync workspace registry from YXB // CMD'
): Promise<{ ok: boolean; message: string; commitUrl?: string }> {
  if (!token.trim()) {
    return {
      ok: false,
      message: 'GitHub Personal Access Token required to push commits from browser/phone.',
    };
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    };

    // 1. Fetch current file SHA
    const getRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${REGISTRY_FILE_PATH}?ref=main`,
      { headers }
    );

    let sha: string | undefined;
    if (getRes.ok) {
      const getJson = await getRes.json();
      sha = getJson.sha;
    }

    const payload = serializeStateToRegistryPayload(state);
    const jsonString = JSON.stringify(payload, null, 2) + '\n';
    const contentBase64 = encodeBase64UTF8(jsonString);

    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${REGISTRY_FILE_PATH}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: commitMessage,
          content: contentBase64,
          sha,
          branch: 'main',
        }),
      }
    );

    if (!putRes.ok) {
      const errText = await putRes.text();
      return {
        ok: false,
        message: `GitHub PUT failed (${putRes.status}): ${errText.slice(0, 120)}`,
      };
    }

    const putData = await putRes.json();
    return {
      ok: true,
      commitUrl: putData?.commit?.html_url,
      message: `Committed & synced ${payload.tasks.length} tasks to ${repo}@main`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Failed to push to GitHub',
    };
  }
}
