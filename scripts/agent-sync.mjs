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

function renderFullY2kHelpScreen(registry, scopedProj, phase = 0) {
  const scopeShort = scopedProj
    ? `LOCAL :: ${scopedProj.code} (${scopedProj.localPath})`
    : `GLOBAL :: ~/Documents/Github/* (${registry.projects.length} Repos)`;

  const topRail = emberGradientText(
    '╔══════════════════════════════════════════════════════════════════════════════════════════╗',
    phase,
    0.018,
    0
  );
  const midRail1 = emberGradientText(
    '╠══ 01 // 3-PANEL TOPOLOGY & ACTIVE CWD SCOPE ═════════════════════════════════════════════╣',
    phase,
    0.018,
    7
  );
  const midRail2 = emberGradientText(
    '╠══ 02 // SCOPED CLI COMMANDS (yxb <cmd>) ══════╦══ 03 // VIM & TUI KEYBINDINGS ═══════════╣',
    phase,
    0.018,
    13
  );
  const botRail = emberGradientText(
    '╚═══════════════════════════════════════════════╩══════════════════════════════════════════╝',
    phase,
    0.018,
    25
  );

  const e = (row) => emberGradientText('║', phase, 0.03, row);

  // Prominent 5-row Y2K Block-Art "YXB" Logo with Molten Ember Gradient
  const yxb1 = emberGradientText('██╗   ██╗██╗  ██╗██████╗ ', phase, 0.075, 1);
  const yxb2 = emberGradientText('╚██╗ ██╔╝╚██╗██╔╝██╔══██╗', phase, 0.075, 2);
  const yxb3 = emberGradientText(' ╚████╔╝  ╚███╔╝ ██████╦╝', phase, 0.075, 3);
  const yxb4 = emberGradientText('  ╚██╔╝   ██╔██╗ ██╔══██╗', phase, 0.075, 4);
  const yxb5 = emberGradientText('   ██║   ██╔╝ ██╗██████╦╝', phase, 0.075, 5);
  const yxbInline = emberGradientText('YXB', phase, 0.14, 2);
  const cmdTag = emberGradientText('// CMD [Y2K.SYS.v3.0]', phase + 0.2, 0.045, 1);

  return [
    topRail,
    `${e(1)}  ${C.bold}${yxb1}${C.reset}  ${C.bold}${cmdTag}${C.reset} ${C.zinc}:: SOVEREIGN AGENTIC SCHEDULER${C.reset}    ${e(1)}`,
    `${e(2)}  ${C.bold}${yxb2}${C.reset}  ${C.white}Scope    :${C.reset} ${emberGradientText(scopeShort.padEnd(44, ' '), phase, 0.03, 2)} ${e(2)}`,
    `${e(3)}  ${C.bold}${yxb3}${C.reset}  ${C.muted}Triggers :${C.reset} ${C.amber}yxb -?${C.reset} ${C.zinc}│${C.reset} ${C.amber}yxb -help${C.reset} ${C.zinc}│${C.reset} ${C.amber}yxb --help${C.reset} ${C.zinc}│${C.reset} ${C.amber}yxb help${C.reset}       ${e(3)}`,
    `${e(4)}  ${C.bold}${yxb4}${C.reset}  ${C.muted}Mirrors  :${C.reset} ${C.cyan}~/.local/bin/yxb${C.reset} ${C.zinc}◄─►${C.reset} ${C.green}<repo>/TASKS.md (11/11)${C.reset}    ${e(4)}`,
    `${e(5)}  ${C.bold}${yxb5}${C.reset}  ${C.muted}Cloud    :${C.reset} ${C.zinc}github.com/claw-h/dashboard (Phone & CLI Sync)${C.reset}  ${e(5)}`,
    midRail1,
    `${e(7)}  ${emberGradientText('[PANEL 01: REPO TREE]', phase, 0.03, 7)} ──▶ ${emberGradientText('[PANEL 02: L0..L3 DAG / CLI]', phase + 0.2, 0.03, 8)} ──▶ ${emberGradientText('[PANEL 03: TASK COMPOSER]', phase + 0.4, 0.03, 9)}   ${e(7)}`,
    `${e(8)}   • 11 GitHub Repos [p]     • Schedule [t] or REPL [c]     • Root L0 & Subtask L1..L3  ${e(8)}`,
    `${e(9)}   • Status Facets   [h]     • Regex [/] & Filter   [i]     • 1-Click Live Edit [a / e] ${e(9)}`,
    midRail2,
    `${e(11)} ${C.amber}yxb -?${C.reset} ${C.zinc}|${C.reset} ${C.amber}-help${C.reset}       Visual ${yxbInline} manual        ${e(11)} ${C.amber}[j / k]${C.reset}   Move cursor Down / Up          ${e(11)}`,
    `${e(12)} ${C.cyan}yxb status${C.reset} ${C.zinc}|${C.reset} ${C.cyan}tree${C.reset}    Current repo L0..L3 tree ${e(12)} ${C.amber}[h / l]${C.reset}   Focus/Collapse Left / Right    ${e(12)}`,
    `${e(13)} ${C.cyan}yxb status -g${C.reset}        All 11 repos audit table ${e(13)} ${C.amber}[J / K]${C.reset}   Shift task priority Down / Up  ${e(13)}`,
    `${e(14)} ${C.cyan}cd <repo-code>${C.reset}       Switch web CLI repo scope${e(14)} ${C.amber}[a]${C.reset}       Panel 3 Task/Subtask Composer  ${e(14)}`,
    `${e(15)} ${C.cyan}yxb add "<title>"${C.reset}    Add L0 Root Task (-p/-m) ${e(15)} ${C.amber}[e / d]${C.reset}   Edit task metadata / Delete    ${e(15)}`,
    `${e(16)} ${C.cyan}yxb sub <id> "<t>"${C.reset}   Add nested L1..L3 subtask${e(16)} ${C.amber}[Space]${C.reset}   Cycle TODO -> PROG -> DONE     ${e(16)}`,
    `${e(17)} ${C.cyan}yxb done <task-id>${C.reset}   Mark task ${C.green}[✓] COMPLETED${C.reset}  ${e(17)} ${C.amber}[m]${C.reset}       Toggle ◆ MILESTONE flag        ${e(17)}`,
    `${e(18)} ${C.cyan}yxb start${C.reset}${C.zinc}|${C.reset}${C.cyan}block <id>${C.reset} Mark ${C.clay}[~] PROG${C.reset} / ${C.crimson}[!] BLOCK${C.reset}${e(18)} ${C.amber}[p]${C.reset}       Browse 11 Projects Menu        ${e(18)}`,
    `${e(19)} ${C.cyan}yxb log "<summary>"${C.reset}  Log agent telemetry diff ${e(19)} ${C.amber}[g / s]${C.reset}   Agent CLI Modal / Cloud Sync   ${e(19)}`,
    `${e(20)} ${C.cyan}yxb sync${C.reset}             Write all 11 TASKS.md    ${e(20)} ${C.amber}[t / c]${C.reset}   Schedule Mode / CLI Stream     ${e(20)}`,
    `${e(21)} ${C.cyan}yxb pull${C.reset} ${C.zinc}|${C.reset} ${C.cyan}yxb push${C.reset}  GitHub Phone/Cloud Sync  ${e(21)} ${C.amber}[/ / Tab]${C.reset} Regex Search / Cycle Panels    ${e(21)}`,
    botRail,
  ];
}

async function printComprehensiveVisualHelp(registry, scopedProj) {
  const initialLines = renderFullY2kHelpScreen(registry, scopedProj, 0.25);
  const lineCount = initialLines.length;

  if (!process.stdout.isTTY) {
    console.log('\n' + initialLines.join('\n') + '\n');
    return;
  }

  // Interactive TTY: Render the entire 23-line single-screen manual so the YXB banner never scrolls off,
  // and animate the molten ember gradient across "YXB" & menu rails in place!
  const totalFrames = 26;
  const frameDelayMs = 45;
  process.stdout.write('\n\x1b[?25l');

  try {
    for (let f = 0; f < totalFrames; f++) {
      const phase = (f / totalFrames) * 1.5;
      const frameLines = renderFullY2kHelpScreen(registry, scopedProj, phase);
      if (f > 0) {
        process.stdout.write(`\x1b[${lineCount}A\r`);
      }
      process.stdout.write(frameLines.join('\n') + '\n');
      await new Promise((r) => setTimeout(r, frameDelayMs));
    }
  } finally {
    process.stdout.write('\x1b[?25h\n');
  }
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
