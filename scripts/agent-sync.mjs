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

// ANSI Color Codes & Truecolor Y2K Molten Ember Gradient Engine
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  clay: '\x1b[38;2;224;92;54m',
  orange: '\x1b[38;2;234;88;12m',
  crimson: '\x1b[38;2;220;38;38m',
  emberDark: '\x1b[38;2;153;27;27m',
  white: '\x1b[38;2;244;244;245m',
  muted: '\x1b[38;2;161;161;170m',
  zinc: '\x1b[38;2;113;113;122m',
  green: '\x1b[38;2;52;211;153m',
  cyan: '\x1b[38;2;56;189;248m',
  amber: '\x1b[38;2;251;191;36m',
};

const EMBER_STOPS = [
  [140, 29, 25],   // deep cooling magma
  [205, 48, 32],   // crimson ember
  [224, 92, 54],   // signature clay
  [249, 128, 36],  // molten orange
  [253, 205, 75],  // hot amber core
  [234, 88, 12],   // lava crest
  [185, 38, 28],   // dark ember trough
];

function sampleEmberRgb(t) {
  const wrapped = ((t % 1) + 1) % 1;
  const scaled = wrapped * (EMBER_STOPS.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const a = EMBER_STOPS[idx];
  const b = EMBER_STOPS[Math.min(EMBER_STOPS.length - 1, idx + 1)];
  // Smoothstep interpolation for viscous lava feel
  const s = frac * frac * (3 - 2 * frac);
  return [
    Math.round(a[0] + (b[0] - a[0]) * s),
    Math.round(a[1] + (b[1] - a[1]) * s),
    Math.round(a[2] + (b[2] - a[2]) * s),
  ];
}

function emberGradientText(str, phase = 0, freq = 0.045, rowShift = 0) {
  let out = '';
  let visIdx = 0;
  for (const ch of str) {
    if (ch === ' ') {
      out += ch;
      visIdx++;
      continue;
    }
    const wave =
      Math.sin((visIdx * freq + rowShift * 0.22 - phase) * Math.PI * 2) * 0.5 + 0.5;
    const [r, g, b] = sampleEmberRgb(wave);
    out += `\x1b[38;2;${r};${g};${b}m${ch}`;
    visIdx++;
  }
  return out + C.reset;
}

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

function renderY2kEmberBanner(phase = 0) {
  const topBorder = emberGradientText(
    '╔══════════════════════════════════════════════════════════════════════════════════════════╗',
    phase,
    0.018,
    0
  );
  const botBorder = emberGradientText(
    '╚══════════════════════════════════════════════════════════════════════════════════════════╝',
    phase,
    0.018,
    6
  );
  const lEdge = (row) => emberGradientText('║', phase, 0.02, row);
  const rEdge = (row) => emberGradientText('║', phase, 0.02, row + 3);

  const yxbRow1 = emberGradientText('██╗   ██╗██╗  ██╗██████╗ ', phase, 0.065, 1);
  const yxbRow2 = emberGradientText('╚██╗ ██╔╝╚██╗██╔╝██╔══██╗', phase, 0.065, 2);
  const yxbRow3 = emberGradientText(' ╚████╔╝  ╚███╔╝ ██████╦╝', phase, 0.065, 3);
  const yxbRow4 = emberGradientText('  ╚██╔╝   ██╔██╗ ██╔══██╗', phase, 0.065, 4);
  const yxbRow5 = emberGradientText('   ██║   ██╔╝ ██╗██████╦╝', phase, 0.065, 5);

  const slashTag = emberGradientText('// CMD [Y2K.SYS.v3.0]', phase + 0.25, 0.04, 1);
  const pulseGlyph = emberGradientText('◈', phase * 2, 0.1, 2);

  return [
    topBorder,
    `${lEdge(1)}  ${C.bold}${yxbRow1}${C.reset}  ${C.bold}${slashTag}${C.reset} ${C.zinc}:: SOVEREIGN AGENTIC SCHEDULER${C.reset}     ${rEdge(1)}`,
    `${lEdge(2)}  ${C.bold}${yxbRow2}${C.reset}  ${pulseGlyph} ${C.white}Local & Global CWD-Scoped Command Center${C.reset}             ${rEdge(2)}`,
    `${lEdge(3)}  ${C.bold}${yxbRow3}${C.reset}  ${C.muted}Triggers :${C.reset} ${C.amber}yxb -?${C.reset} ${C.zinc}│${C.reset} ${C.amber}yxb -help${C.reset} ${C.zinc}│${C.reset} ${C.amber}yxb --help${C.reset} ${C.zinc}│${C.reset} ${C.amber}yxb help${C.reset}        ${rEdge(3)}`,
    `${lEdge(4)}  ${C.bold}${yxbRow4}${C.reset}  ${C.muted}Daemon   :${C.reset} ${C.cyan}~/.local/bin/yxb${C.reset} ${C.zinc}◄──►${C.reset} ${C.green}<repo>/TASKS.md (11/11)${C.reset}   ${rEdge(4)}`,
    `${lEdge(5)}  ${C.bold}${yxbRow5}${C.reset}  ${C.muted}Remote   :${C.reset} ${C.zinc}github.com/claw-h/dashboard (Phone & CLI Sync)${C.reset}   ${rEdge(5)}`,
    botBorder,
  ].join('\n');
}

function buildHelpMenuBody(registry, scopedProj, phase = 0.35) {
  const scopeLabel = scopedProj
    ? `LOCAL REPO -> ${scopedProj.code} (${scopedProj.localPath})`
    : `GLOBAL WORKSPACE -> ~/Documents/Github/* (${registry.projects.length} Repos)`;

  const sec1Top = emberGradientText(
    '┌─ 01 // ACTIVE EXECUTION CONTEXT & 3-PANEL TOPOLOGY ──────────────────────────────────────┐',
    phase,
    0.016,
    1
  );
  const sec2Top = emberGradientText(
    '┌─ 02 // CLI COMMAND REFERENCE (LOCAL CWD-SCOPED & GLOBAL MULTI-REPO) ─────────────────────┐',
    phase,
    0.016,
    2
  );
  const sec3Top = emberGradientText(
    '┌─ 03 // SCHOLARLY & VIM-INSPIRED KEYBINDING MATRIX (WEB DASHBOARD) ───────────────────────┐',
    phase,
    0.016,
    3
  );
  const secBot = (row) =>
    emberGradientText(
      '└──────────────────────────────────────────────────────────────────────────────────────────┘',
      phase,
      0.016,
      row
    );
  const bar = emberGradientText('│', phase, 0.05, 2);
  const yxbTag = emberGradientText('YXB', phase, 0.12, 1);

  return `
${sec1Top}
${bar}  ${C.muted}Active CWD Scope :${C.reset} ${emberGradientText(scopeLabel, phase, 0.03, 1)}
${bar}  ${C.muted}Global CLI Binary:${C.reset} ${C.cyan}~/.local/bin/yxb${C.reset} ${C.zinc}(Auto-scopes via process.cwd() inside any repo)${C.reset}
${bar}  ${C.muted}Canonical Ledger :${C.reset} ${C.cyan}~/Documents/Github/dashboard/src/data/workspaceRegistry.json${C.reset}
${bar}  ${C.muted}Per-Repo Mirrors :${C.reset} ${C.green}~/Documents/Github/<repo>/TASKS.md${C.reset} ${C.zinc}(11/11 auto-generated blueprints)${C.reset}
${bar}
${bar}  ${emberGradientText('┌────────────────────┐    ┌────────────────────────────────┐    ┌──────────────────────┐', phase, 0.02, 2)}
${bar}  ${emberGradientText('│  PANEL 01 [h / p]  │    │      PANEL 02 [t / c / /]      │    │   PANEL 03 [a / l]   │', phase, 0.02, 3)}
${bar}  ${emberGradientText('│  Workspace Tree &  │───▶│  Schedule DAG (L0→L1→L2→L3)    │───▶│  Unified Task/Subtask│', phase, 0.02, 4)}
${bar}  ${emberGradientText('│  Status Facets     │    │  OR Interactive yxb CLI Stream │    │  Composer & Inspector│', phase, 0.02, 5)}
${bar}  ${emberGradientText('└────────────────────┘    └────────────────────────────────┘    └──────────────────────┘', phase, 0.02, 6)}
${secBot(2)}

${sec2Top}
${bar}
${bar}  ${emberGradientText('▸ A. Inspection & Telemetry', phase, 0.05, 1)}
${bar}    ${C.amber}yxb -?${C.reset} ${C.zinc}|${C.reset} ${C.amber}yxb -help${C.reset}                Display this ${yxbTag} visual architecture manual
${bar}    ${C.cyan}yxb status${C.reset} ${C.zinc}|${C.reset} ${C.cyan}yxb tree${C.reset}             Print current repo's Git telemetry & L0..L3 task tree
${bar}    ${C.cyan}yxb status -g${C.reset}                     Global audit across all 11 ~/Documents/Github repos
${bar}    ${C.cyan}cd <repo-code>${C.reset}                    (Web CLI) Switch local scope (e.g. ${C.amber}cd portyxb${C.reset}, ${C.amber}cd aos-v3${C.reset})
${bar}
${bar}  ${emberGradientText('▸ B. Hierarchical Task & Subtask Mutation (L0 -> L1 -> L2 -> L3)', phase, 0.04, 2)}
${bar}    ${C.cyan}yxb add "<title>" [-p HIGH] [-m]${C.reset}  Create L0 Root Task in current repo (${C.amber}-m${C.reset} marks ◆ Milestone)
${bar}    ${C.cyan}yxb sub <parent-id> "<title>"${C.reset}     Spawn nested L1..L3 Subtask under <parent-id>
${bar}    ${C.cyan}yxb done <task-id>${C.reset}                Mark task ${C.green}[✓] COMPLETED${C.reset} & regenerate <repo>/TASKS.md
${bar}    ${C.cyan}yxb start <task-id>${C.reset}               Mark task ${C.clay}[~] IN_PROGRESS${C.reset}
${bar}    ${C.cyan}yxb block <task-id>${C.reset}               Mark task ${C.crimson}[!] BLOCKED${C.reset}
${bar}    ${C.cyan}yxb log "<summary>"${C.reset}               Append architectural diff log to the ${yxbTag} // CMD stream
${bar}
${bar}  ${emberGradientText('▸ C. Project Registration & Bidirectional Phone / GitHub Cloud Sync', phase, 0.04, 3)}
${bar}    ${C.cyan}yxb init-project --code "X" ...${C.reset}   Register a new ~/Documents/Github repo on the dashboard
${bar}    ${C.cyan}yxb sync${C.reset}                          Scan live Git branches & write TASKS.md to all 11 repos
${bar}    ${C.cyan}yxb pull${C.reset}                          Pull remote/phone edits from GitHub (claw-h/dashboard)
${bar}    ${C.cyan}yxb push${C.reset}                          Commit & push local registry state to GitHub
${secBot(4)}

${sec3Top}
${bar}  ${C.amber}[j / k]${C.reset}   Move cursor Down / Up          ${C.amber}[a]${C.reset}       Focus Panel 3 Task/Subtask Composer
${bar}  ${C.amber}[h / l]${C.reset}   Focus/Collapse Left / Right    ${C.amber}[e]${C.reset}       Focus Panel 3 Live Metadata Editor
${bar}  ${C.amber}[J / K]${C.reset}   Shift task Down / Up priority  ${C.amber}[d]${C.reset}       Delete selected task & subtree
${bar}  ${C.amber}[p]${C.reset}       Open Browse Project (11 Repos) ${C.amber}[m]${C.reset}       Toggle ◆ MILESTONE flag on node
${bar}  ${C.amber}[g]${C.reset}       Open Agent CLI Protocol modal  ${C.amber}[s]${C.reset}       Open ☁ Phone & GitHub Sync Bridge
${bar}  ${C.amber}[t / c]${C.reset}   Schedule Mode / CLI Mode       ${C.amber}[/ / i]${C.reset}   Global Regex Search / Keyword Filter
${bar}  ${C.amber}[Space]${C.reset}   Cycle task status              ${C.amber}[Tab]${C.reset}     Cycle panel focus / Autocomplete CLI
${secBot(6)}
`;
}

async function printComprehensiveVisualHelp(registry, scopedProj) {
  if (!process.stdout.isTTY) {
    console.log('\n' + renderY2kEmberBanner(0.28) + buildHelpMenuBody(registry, scopedProj, 0.28));
    return;
  }

  // Interactive TTY: Play a smooth 22-frame (~1.05s) molten ember wave across the Y2K "YXB" banner
  const totalFrames = 22;
  const frameDelayMs = 46;
  process.stdout.write('\n\x1b[?25l'); // Hide cursor during ember pulse

  try {
    for (let f = 0; f < totalFrames; f++) {
      const phase = (f / totalFrames) * 1.35;
      const banner = renderY2kEmberBanner(phase);
      if (f > 0) {
        process.stdout.write('\x1b[7A\r'); // Move up 7 lines to redraw banner in place
      }
      process.stdout.write(banner + '\n');
      await new Promise((r) => setTimeout(r, frameDelayMs));
    }
  } finally {
    process.stdout.write('\x1b[?25h'); // Restore cursor
  }

  process.stdout.write(buildHelpMenuBody(registry, scopedProj, 0.35) + '\n');
}

async function main() {
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
    await printComprehensiveVisualHelp(registry, scoped);
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

  await printComprehensiveVisualHelp(registry, resolveScopedProject(registry, args.project));
}

main();
