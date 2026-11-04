#!/usr/bin/env node
/**
 * YXB // CMD — Global & Local CWD-Scoped CLI (`yxb` / `scripts/agent-sync.mjs`)
 *
 * Trigger comprehensive visual help manual with:
 *   yxb -?   |   yxb -help   |   yxb --help   |   yxb help
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.resolve(DASHBOARD_ROOT, 'src/data/workspaceRegistry.json');
const HOME_DIR = os.homedir();

// ANSI Color Codes for rich terminal visuals
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  clay: '\x1b[38;2;224;92;54m',
  orange: '\x1b[38;2;234;88;12m',
  white: '\x1b[38;2;244;244;245m',
  muted: '\x1b[38;2;161;161;170m',
  zinc: '\x1b[38;2;113;113;122m',
  green: '\x1b[38;2;52;211;153m',
  cyan: '\x1b[38;2;56;189;248m',
  amber: '\x1b[38;2;251;191;36m',
};

function expandTilde(p) {
  if (!p) return '';
  if (p.startsWith('~/')) return path.join(HOME_DIR, p.slice(2));
  return path.resolve(p);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (
      token === '-?' ||
      token === '?' ||
      token === '-help' ||
      token === '--help' ||
      token === '-h'
    ) {
      args.help = true;
    } else if (token === '-g') {
      args.global = true;
    } else if (token === '-m') {
      args.milestone = true;
    } else if (token === '-p' && argv[i + 1]) {
      args.priority = argv[++i];
    } else if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function loadRegistry() {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  return JSON.parse(raw);
}

function saveRegistry(data) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function nowTimeStr() {
  return new Date().toTimeString().slice(0, 8);
}

function resolveScopedProject(registry, explicitProjectArg) {
  if (explicitProjectArg) {
    const q = String(explicitProjectArg).toLowerCase();
    return (
      registry.projects.find(
        (p) =>
          p.id.toLowerCase() === q ||
          p.code.toLowerCase() === q ||
          p.name.toLowerCase().includes(q)
      ) || null
    );
  }

  const cwd = process.cwd().toLowerCase();
  const sorted = [...registry.projects].sort(
    (a, b) => expandTilde(b.localPath).length - expandTilde(a.localPath).length
  );
  for (const proj of sorted) {
    const abs = expandTilde(proj.localPath).toLowerCase();
    if (cwd === abs || cwd.startsWith(abs + path.sep)) {
      return proj;
    }
  }
  return null;
}

function probeGitStatus(localPath) {
  const abs = expandTilde(localPath);
  if (!fs.existsSync(abs)) {
    return null;
  }
  try {
    const isGit = fs.existsSync(path.join(abs, '.git'));
    if (!isGit) return null;

    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: abs,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    const porcelain = execSync('git status --porcelain', {
      cwd: abs,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const dirtyCount = porcelain ? porcelain.split('\n').length : 0;

    let lastCommit = '';
    try {
      lastCommit = execSync('git log -1 --pretty=%s', {
        cwd: abs,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
    } catch {
      lastCommit = 'Initial repository state';
    }

    return { branch, dirtyCount, lastCommit };
  } catch {
    return null;
  }
}

function writeProjectTasksMarkdown(registry, project) {
  const absDir = expandTilde(project.localPath);
  if (!fs.existsSync(absDir)) return false;

  const categories = registry.categories
    .filter((c) => c.projectId === project.id)
    .sort((a, b) => a.order - b.order);

  const projTasks = registry.tasks.filter((t) => t.projectId === project.id);
  const completedCount = projTasks.filter((t) => t.status === 'COMPLETED').length;
  const pct = projTasks.length > 0 ? Math.round((completedCount / projTasks.length) * 100) : 0;

  const lines = [
    `# ${project.code} // ${project.name} — Agentic Task Blueprint`,
    ``,
    `> **Auto-synced by \`YXB // CMD\`** (\`~/Documents/Github/dashboard\`).`,
    `> Local Path: \`${project.localPath}\` | Lifecycle: \`${project.lifecycle}\` | Completion: **${pct}% (${completedCount}/${projTasks.length})**`,
    ``,
    `## Quick Agent CLI Commands (Scoped to this Repository)`,
    `\`\`\`bash`,
    `yxb -?                                      # Launch visual YXB // CMD manual`,
    `yxb status                                  # View live L0..L3 task tree for ${project.code}`,
    `yxb add "New root task title" -p HIGH -m    # Add L0 parent task`,
    `yxb sub <parent-task-id> "Subtask title"    # Add nested subtask (L1..L3)`,
    `yxb done <task-id>                          # Mark task COMPLETED & sync dashboard`,
    `\`\`\``,
    ``,
    `---`,
    ``,
    `## Hierarchical Task Architecture (\`L0 -> L1 -> L2 -> L3\`)`,
    ``,
  ];

  const statusGlyph = (s) =>
    s === 'COMPLETED' ? '[x]' : s === 'IN_PROGRESS' ? '[~]' : s === 'BLOCKED' ? '[!]' : '[ ]';

  const renderSubtree = (parentId, indentLevel) => {
    const kids = projTasks
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.manualOrder - b.manualOrder);

    for (const node of kids) {
      const pad = '  '.repeat(indentLevel);
      const ms = node.isMilestone ? ' `◆ MILESTONE`' : '';
      lines.push(
        `${pad}- ${statusGlyph(node.status)} **[L${node.depth}]** \`${node.id}\` **${node.title}** _(${node.priority} · due ${node.dueDate})_${ms}`
      );
      if (node.notes) {
        lines.push(`${pad}  - _Notes:_ ${node.notes}`);
      }
      renderSubtree(node.id, indentLevel + 1);
    }
  };

  for (const cat of categories) {
    const catRootTasks = projTasks.filter((t) => t.categoryId === cat.id && t.parentId === null);
    lines.push(`### Category: ${cat.name} (\`${cat.slug}\`)`);
    if (catRootTasks.length === 0) {
      lines.push(`_No root tasks in this category yet._`);
    } else {
      for (const rootTask of catRootTasks) {
        const ms = rootTask.isMilestone ? ' `◆ MILESTONE`' : '';
        lines.push(
          `- ${statusGlyph(rootTask.status)} **[L0]** \`${rootTask.id}\` **${rootTask.title}** _(${rootTask.priority} · due ${rootTask.dueDate})_${ms}`
        );
        if (rootTask.notes) {
          lines.push(`  - _Notes:_ ${rootTask.notes}`);
        }
        renderSubtree(rootTask.id, 1);
      }
    }
    lines.push(``);
  }

  fs.writeFileSync(path.join(absDir, 'TASKS.md'), lines.join('\n'), 'utf8');
  return true;
}

function syncAllRepos(registry) {
  let syncedCount = 0;
  for (const proj of registry.projects) {
    const gitInfo = probeGitStatus(proj.localPath);
    if (gitInfo) {
      proj.gitBranch = gitInfo.branch;
      proj.gitDirtyCount = gitInfo.dirtyCount;
      proj.lastCommit = gitInfo.lastCommit;
    }
    if (writeProjectTasksMarkdown(registry, proj)) {
      syncedCount++;
    }
  }
  saveRegistry(registry);
  return syncedCount;
}

function printProjectTree(registry, proj) {
  const projTasks = registry.tasks.filter((t) => t.projectId === proj.id);
  const done = projTasks.filter((t) => t.status === 'COMPLETED').length;
  const pct = projTasks.length > 0 ? Math.round((done / projTasks.length) * 100) : 0;

  console.log(
    `\n${C.clay}◈ [${proj.code}]${C.reset} ${C.bold}${proj.name}${C.reset} ${C.muted}(${proj.localPath})${C.reset} — ${C.green}${pct}% (${done}/${projTasks.length} tasks)${C.reset}`
  );
  console.log(
    `  ${C.zinc}git: branch=${proj.gitBranch || 'main'} | dirty=${proj.gitDirtyCount ?? 0} | commit="${proj.lastCommit || 'n/a'}"${C.reset}`
  );

  const printChildren = (parentId, prefix) => {
    const kids = projTasks
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.manualOrder - b.manualOrder);
    kids.forEach((node, idx) => {
      const isLast = idx === kids.length - 1;
      const branch = isLast ? '└─' : '├─';
      const glyph =
        node.status === 'COMPLETED'
          ? `${C.green}[✓]${C.reset}`
          : node.status === 'IN_PROGRESS'
          ? `${C.clay}[~]${C.reset}`
          : node.status === 'BLOCKED'
          ? `\x1b[31m[!]${C.reset}`
          : `${C.zinc}[ ]${C.reset}`;
      const ms = node.isMilestone ? ` ${C.clay}◆ MILESTONE${C.reset}` : '';
      console.log(
        `${C.zinc}${prefix}${branch}${C.reset} ${glyph} ${C.muted}[L${node.depth}]${C.reset} ${C.cyan}(${node.id})${C.reset} ${C.white}${node.title}${C.reset} ${C.amber}[${node.priority}]${C.reset}${ms}`
      );
      printChildren(node.id, prefix + (isLast ? '   ' : '│  '));
    });
  };

  printChildren(null, '  ');
}

function printComprehensiveVisualHelp(registry, scopedProj) {
  const scopeLabel = scopedProj
    ? `LOCAL REPO -> ${scopedProj.code} (${scopedProj.localPath})`
    : `GLOBAL WORKSPACE -> ~/Documents/Github/* (${registry.projects.length} Repos)`;

  console.log(`
${C.clay}╔══════════════════════════════════════════════════════════════════════════════════════════╗${C.reset}
${C.clay}║${C.reset}  ${C.clay}◈${C.reset}  ${C.bold}${C.white}YXB // CMD v3.0 — SOVEREIGN AGENTIC COMMAND CENTER & HIERARCHICAL SCHEDULER${C.reset}          ${C.clay}║${C.reset}
${C.clay}║${C.reset}     ${C.muted}Comprehensive Visual CLI & TUI Architecture Manual  (Triggers: -? | -help | help)${C.reset}    ${C.clay}║${C.reset}
${C.clay}╚══════════════════════════════════════════════════════════════════════════════════════════╝${C.reset}

${C.bold}${C.white}┌─ 01. ACTIVE EXECUTION CONTEXT & TOPOLOGY ────────────────────────────────────────────────┐${C.reset}
${C.zinc}│${C.reset}  ${C.muted}Active CWD Scope :${C.reset} ${C.clay}${C.bold}${scopeLabel}${C.reset}
${C.zinc}│${C.reset}  ${C.muted}Global CLI Binary:${C.reset} ${C.cyan}~/.local/bin/yxb${C.reset} ${C.zinc}(Auto-scopes via process.cwd() inside any repo)${C.reset}
${C.zinc}│${C.reset}  ${C.muted}Canonical Ledger :${C.reset} ${C.cyan}~/Documents/Github/dashboard/src/data/workspaceRegistry.json${C.reset}
${C.zinc}│${C.reset}  ${C.muted}Per-Repo Mirrors :${C.reset} ${C.green}~/Documents/Github/<repo>/TASKS.md${C.reset} ${C.zinc}(11/11 auto-generated blueprints)${C.reset}
${C.zinc}│${C.reset}
${C.zinc}│${C.reset}  ${C.clay}┌────────────────────┐    ┌────────────────────────────────┐    ┌──────────────────────┐${C.reset}
${C.zinc}│${C.reset}  ${C.clay}│  PANEL 01 [h / p]  │    │      PANEL 02 [t / c / /]      │    │   PANEL 03 [a / l]   │${C.reset}
${C.zinc}│${C.reset}  ${C.clay}│  Workspace Tree &  │───▶│  Schedule DAG (L0→L1→L2→L3)    │───▶│  Unified Task/Subtask│${C.reset}
${C.zinc}│${C.reset}  ${C.clay}│  Status Facets     │    │  OR Interactive yxb CLI Stream │    │  Composer & Inspector│${C.reset}
${C.zinc}│${C.reset}  ${C.clay}└────────────────────┘    └────────────────────────────────┘    └──────────────────────┘${C.reset}
${C.bold}${C.white}└──────────────────────────────────────────────────────────────────────────────────────────┘${C.reset}

${C.bold}${C.white}┌─ 02. CLI COMMAND REFERENCE (LOCAL CWD-SCOPED & GLOBAL MULTI-REPO) ───────────────────────┐${C.reset}
${C.zinc}│${C.reset}
${C.zinc}│${C.reset}  ${C.clay}${C.bold}A. Inspection & Telemetry${C.reset}
${C.zinc}│${C.reset}    ${C.cyan}yxb -?${C.reset} ${C.zinc}|${C.reset} ${C.cyan}yxb -help${C.reset}                Display this comprehensive visual architecture manual
${C.zinc}│${C.reset}    ${C.cyan}yxb status${C.reset} ${C.zinc}|${C.reset} ${C.cyan}yxb tree${C.reset}             Print current repo's Git telemetry & L0..L3 task tree
${C.zinc}│${C.reset}    ${C.cyan}yxb status -g${C.reset}                     Global audit across all 11 ~/Documents/Github repos
${C.zinc}│${C.reset}    ${C.cyan}cd <repo-code>${C.reset}                    (Web CLI) Switch local scope (e.g. ${C.amber}cd portyxb${C.reset}, ${C.amber}cd aos-v3${C.reset})
${C.zinc}│${C.reset}
${C.zinc}│${C.reset}  ${C.clay}${C.bold}B. Hierarchical Task & Subtask Mutation (L0 -> L1 -> L2 -> L3)${C.reset}
${C.zinc}│${C.reset}    ${C.cyan}yxb add "<title>" [-p HIGH] [-m]${C.reset}  Create L0 Root Task in current repo (${C.amber}-m${C.reset} marks ◆ Milestone)
${C.zinc}│${C.reset}    ${C.cyan}yxb sub <parent-id> "<title>"${C.reset}     Spawn nested L1..L3 Subtask under <parent-id>
${C.zinc}│${C.reset}    ${C.cyan}yxb done <task-id>${C.reset}                Mark task ${C.green}[✓] COMPLETED${C.reset} & regenerate <repo>/TASKS.md
${C.zinc}│${C.reset}    ${C.cyan}yxb start <task-id>${C.reset}               Mark task ${C.clay}[~] IN_PROGRESS${C.reset}
${C.zinc}│${C.reset}    ${C.cyan}yxb block <task-id>${C.reset}               Mark task \x1b[31m[!] BLOCKED${C.reset}
${C.zinc}│${C.reset}    ${C.cyan}yxb log "<summary>"${C.reset}               Append architectural diff log to the YXB // CMD stream
${C.zinc}│${C.reset}
${C.zinc}│${C.reset}  ${C.clay}${C.bold}C. Project Registration & Bidirectional Phone / GitHub Cloud Sync${C.reset}
${C.zinc}│${C.reset}    ${C.cyan}yxb init-project --code "X" ...${C.reset}   Register a new ~/Documents/Github repo on the dashboard
${C.zinc}│${C.reset}    ${C.cyan}yxb sync${C.reset}                          Scan live Git branches & write TASKS.md to all 11 repos
${C.zinc}│${C.reset}    ${C.cyan}yxb pull${C.reset}                          Pull remote/phone edits from GitHub (claw-h/dashboard)
${C.zinc}│${C.reset}    ${C.cyan}yxb push${C.reset}                          Commit & push local registry state to GitHub
${C.bold}${C.white}└──────────────────────────────────────────────────────────────────────────────────────────┘${C.reset}

${C.bold}${C.white}┌─ 03. SCHOLARLY & VIM-INSPIRED KEYBINDING MATRIX (WEB DASHBOARD) ─────────────────────────┐${C.reset}
${C.zinc}│${C.reset}  ${C.amber}[j / k]${C.reset}   Move cursor Down / Up          ${C.amber}[a]${C.reset}       Focus Panel 3 Task/Subtask Composer
${C.zinc}│${C.reset}  ${C.amber}[h / l]${C.reset}   Focus/Collapse Left / Right    ${C.amber}[e]${C.reset}       Focus Panel 3 Live Metadata Editor
${C.zinc}│${C.reset}  ${C.amber}[J / K]${C.reset}   Shift task Down / Up priority  ${C.amber}[d]${C.reset}       Delete selected task & subtree
${C.zinc}│${C.reset}  ${C.amber}[p]${C.reset}       Open Browse Project (11 Repos) ${C.amber}[m]${C.reset}       Toggle ◆ MILESTONE flag on node
${C.zinc}│${C.reset}  ${C.amber}[g]${C.reset}       Open Agent CLI Protocol modal  ${C.amber}[s]${C.reset}       Open ☁ Phone & GitHub Sync Bridge
${C.zinc}│${C.reset}  ${C.amber}[t / c]${C.reset}   Schedule Mode / CLI Mode       ${C.amber}[/ / i]${C.reset}   Global Regex Search / Keyword Filter
${C.zinc}│${C.reset}  ${C.amber}[Space]${C.reset}   Cycle task status              ${C.amber}[Tab]${C.reset}     Cycle panel focus / Autocomplete CLI
${C.bold}${C.white}└──────────────────────────────────────────────────────────────────────────────────────────┘${C.reset}
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawFirst = (args._[0] || '').toLowerCase();
  const registry = loadRegistry();

  if (
    args.help ||
    rawFirst === 'help' ||
    rawFirst === '-help' ||
    rawFirst === '--help' ||
    rawFirst === '-?' ||
    rawFirst === '?'
  ) {
    const scoped = resolveScopedProject(registry, args.project);
    printComprehensiveVisualHelp(registry, scoped);
    return;
  }

  const cmd = rawFirst || (args.verify ? 'verify' : 'status');

  if (cmd === 'verify' || args.verify) {
    const synced = syncAllRepos(registry);
    console.log(
      `[YXB // CMD] Verified & synced ${registry.projects.length} projects (${synced} local TASKS.md written), ${registry.categories.length} categories, ${registry.tasks.length} tasks.`
    );
    return;
  }

  if (cmd === 'sync') {
    const synced = syncAllRepos(registry);
    console.log(
      `[YXB // CMD] Synced live Git telemetry & generated TASKS.md across ${synced}/${registry.projects.length} repositories.`
    );
    return;
  }

  if (cmd === 'pull') {
    try {
      execSync('git pull --rebase origin main', { cwd: DASHBOARD_ROOT, stdio: 'inherit' });
      const fresh = loadRegistry();
      syncAllRepos(fresh);
      console.log('[YXB // CMD] Pulled latest state from GitHub & updated all local TASKS.md files.');
    } catch (e) {
      console.error('[YXB // CMD] git pull failed:', e.message);
    }
    return;
  }

  if (cmd === 'push') {
    try {
      syncAllRepos(registry);
      execSync('git add src/data/workspaceRegistry.json', { cwd: DASHBOARD_ROOT });
      execSync(
        'git diff --cached --quiet || git commit -m "chore(yxb-cmd): sync workspaceRegistry.json via yxb push"',
        { cwd: DASHBOARD_ROOT, stdio: 'inherit' }
      );
      execSync('git push origin main', { cwd: DASHBOARD_ROOT, stdio: 'inherit' });
      console.log('[YXB // CMD] Pushed workspaceRegistry.json to GitHub (claw-h/dashboard@main).');
    } catch (e) {
      console.error('[YXB // CMD] git push failed:', e.message);
    }
    return;
  }

  if (cmd === 'status' || cmd === 'tree' || cmd === 'tasks') {
    const scoped = resolveScopedProject(registry, args.project);
    if (args.global || !scoped) {
      console.log(`=== YXB // CMD GLOBAL WORKSPACE (${registry.projects.length} REPOSITORIES) ===`);
      for (const p of registry.projects) {
        printProjectTree(registry, p);
      }
    } else {
      console.log(`=== YXB // CMD LOCAL SCOPE: ${scoped.code} (${process.cwd()}) ===`);
      printProjectTree(registry, scoped);
    }
    return;
  }

  if (cmd === 'init-project') {
    const name = args.name || args._[1];
    if (!name) {
      console.error('Error: --name is required for init-project');
      process.exit(1);
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = args.id || `proj-${slug}`;
    const code = (args.code || slug.slice(0, 8)).toUpperCase();
    const localPath = args.path || `~/Documents/Github/${slug}`;
    const stack = args.stack
      ? String(args.stack)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : ['Astro', 'TypeScript'];
    const description = args.desc || `Workspace repository at ${localPath}`;
    const lifecycle = args.lifecycle || 'ACTIVE';

    const existingIdx = registry.projects.findIndex((p) => p.id === id || p.code === code);
    const projectObj = {
      id,
      code,
      name,
      description,
      localPath,
      repoUrl: args.repo || undefined,
      stack,
      lifecycle,
      lastAgentSync: new Date().toISOString().slice(0, 16).replace('T', ' '),
      gitBranch: 'main',
      gitDirtyCount: 0,
      lastCommit: 'Initial registration with YXB // CMD',
      order: existingIdx >= 0 ? registry.projects[existingIdx].order : registry.projects.length,
      expanded: true,
    };

    if (existingIdx >= 0) {
      registry.projects[existingIdx] = projectObj;
    } else {
      registry.projects.push(projectObj);
    }

    const catId = `cat-${slug}-core`;
    if (!registry.categories.some((c) => c.projectId === id)) {
      registry.categories.push({
        id: catId,
        projectId: id,
        name: 'Core Architecture',
        slug: 'core-arch',
        order: 0,
      });
    }

    const taskId = `task-${slug}-100`;
    if (!registry.tasks.some((t) => t.id === taskId)) {
      const now = new Date().toISOString();
      registry.tasks.push({
        id: taskId,
        projectId: id,
        categoryId: catId,
        parentId: null,
        depth: 0,
        title: `Initialize ${name} architecture & sync with YXB // CMD`,
        notes: description,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        isMilestone: true,
        estimatedMinutes: 60,
        manualOrder: 0,
        expanded: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    registry.cliLogs.push({
      id: `log-${Date.now()}`,
      timestamp: nowTimeStr(),
      type: 'MUTATION',
      scope: 'GLOBAL',
      projectCode: code,
      toolName: 'AgentInitProject',
      summary: `Registered project [${code}] "${name}" at ${localPath}`,
      detail: `stack: [${stack.join(', ')}] | lifecycle: ${lifecycle}`,
      accent: true,
    });

    syncAllRepos(registry);
    console.log(`[YXB // CMD] Registered project ${code} (${id}) -> ${localPath}`);
    return;
  }

  if (cmd === 'add' || cmd === 'add-task') {
    const scoped = resolveScopedProject(registry, args.project) || registry.projects[0];
    const title = args.title || args._.slice(1).join(' ');
    if (!title) {
      console.error('Error: Task title is required (e.g. yxb add "Implement feature")');
      process.exit(1);
    }
    const defaultCat =
      registry.categories.find((c) => c.projectId === scoped.id)?.id || 'cat-cmd-core';
    const categoryId = args.category || defaultCat;
    const parentId = args.parent || null;
    let depth = 0;
    if (parentId) {
      const parentTask = registry.tasks.find((t) => t.id === parentId);
      depth = parentTask ? Math.min(3, parentTask.depth + 1) : 1;
    }
    const priority = (args.priority || 'HIGH').toUpperCase();
    const status = (args.status || 'IN_PROGRESS').toUpperCase();
    const isMilestone = Boolean(args.milestone);
    const now = new Date().toISOString();
    const id =
      args.id ||
      `task-${scoped.code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    registry.tasks.push({
      id,
      projectId: scoped.id,
      categoryId,
      parentId,
      depth,
      title,
      notes: args.notes || `Added via yxb CLI (${scoped.code} scope)`,
      priority,
      status,
      dueDate: args.due || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      isMilestone,
      estimatedMinutes: Number(args.est || 45),
      manualOrder: registry.tasks.filter((t) => t.projectId === scoped.id && t.parentId === parentId)
        .length,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    });

    scoped.lastAgentSync = now.slice(0, 16).replace('T', ' ');
    registry.cliLogs.push({
      id: `log-${Date.now()}`,
      timestamp: nowTimeStr(),
      type: 'MUTATION',
      scope: 'LOCAL',
      projectCode: scoped.code,
      toolName: 'CliAddTask',
      summary: `[${scoped.code}] Added L${depth} task "${title}" (${priority})`,
      detail: `id: ${id} | parent: ${parentId || 'ROOT'} | milestone: ${isMilestone}`,
      accent: true,
    });

    syncAllRepos(registry);
    console.log(`[YXB // CMD] Added [L${depth}] ${id} to ${scoped.code}: "${title}"`);
    return;
  }

  if (cmd === 'sub') {
    const parentId = args._[1];
    const title = args.title || args._.slice(2).join(' ');
    if (!parentId || !title) {
      console.error('Usage: yxb sub <parent-task-id> "Subtask title"');
      process.exit(1);
    }
    const parentTask = registry.tasks.find((t) => t.id === parentId);
    if (!parentTask) {
      console.error(`Error: Parent task "${parentId}" not found.`);
      process.exit(1);
    }
    const proj =
      registry.projects.find((p) => p.id === parentTask.projectId) || registry.projects[0];
    const actualParentId = parentTask.depth < 3 ? parentTask.id : parentTask.parentId;
    const depth = Math.min(3, parentTask.depth + 1);
    const now = new Date().toISOString();
    const id = `task-${proj.code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    registry.tasks.push({
      id,
      projectId: parentTask.projectId,
      categoryId: parentTask.categoryId,
      parentId: actualParentId,
      depth,
      title,
      notes: args.notes || `Nested L${depth} subtask under ${parentTask.id}`,
      priority: (args.priority || parentTask.priority).toUpperCase(),
      status: 'QUEUED',
      dueDate: args.due || parentTask.dueDate,
      isMilestone: Boolean(args.milestone),
      estimatedMinutes: Number(args.est || 25),
      manualOrder: registry.tasks.filter((t) => t.parentId === actualParentId).length,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    });

    syncAllRepos(registry);
    console.log(
      `[YXB // CMD] Added nested subtask [L${depth}] ${id} under ${parentTask.id}: "${title}"`
    );
    return;
  }

  if (cmd === 'done' || cmd === 'complete-task' || cmd === 'start' || cmd === 'block') {
    const taskId = args.id || args._[1];
    const task = registry.tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error(`Error: Task "${taskId}" not found`);
      process.exit(1);
    }
    const nextStatus =
      cmd === 'done' || cmd === 'complete-task'
        ? 'COMPLETED'
        : cmd === 'start'
        ? 'IN_PROGRESS'
        : 'BLOCKED';
    task.status = nextStatus;
    task.updatedAt = new Date().toISOString();
    const proj = registry.projects.find((p) => p.id === task.projectId);

    registry.cliLogs.push({
      id: `log-${Date.now()}`,
      timestamp: nowTimeStr(),
      type: 'DIFF',
      scope: 'LOCAL',
      projectCode: proj?.code,
      toolName: 'CliStatusTransition',
      summary: `[${proj?.code || task.projectId}] ${task.id} -> ${nextStatus}: "${task.title}"`,
      accent: true,
    });

    syncAllRepos(registry);
    console.log(`[YXB // CMD] Updated ${task.id} -> ${nextStatus}`);
    return;
  }

  if (cmd === 'log') {
    const scoped = resolveScopedProject(registry, args.project) || registry.projects[0];
    const summary = args.summary || args._.slice(1).join(' ') || 'Agent updated workspace';
    const toolName = args.tool || 'AgentSync';
    scoped.lastAgentSync = new Date().toISOString().slice(0, 16).replace('T', ' ');
    registry.cliLogs.push({
      id: `log-${Date.now()}`,
      timestamp: nowTimeStr(),
      type: 'DIFF',
      scope: 'LOCAL',
      projectCode: scoped.code,
      toolName,
      summary: `[${scoped.code}] ${summary}`,
      detail: args.detail || undefined,
      accent: true,
    });
    syncAllRepos(registry);
    console.log(`[YXB // CMD] Appended log entry to ${scoped.code}: ${summary}`);
    return;
  }

  printComprehensiveVisualHelp(registry, resolveScopedProject(registry, args.project));
}

main();
