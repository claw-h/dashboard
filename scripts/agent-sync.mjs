#!/usr/bin/env node
/**
 * YXB // CMD — Headless Multi-Agent Sync CLI
 * Allows any future AI agent (Antigravity, Claude Code, Cursor, Codex) to:
 *   1. Initialize & register new projects in ~/Documents/Github on the dashboard
 *   2. Add hierarchical tasks/subtasks (L0..L3) to any registered project
 *   3. Mark tasks completed or log architectural diffs to the CLI stream
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, '../src/data/workspaceRegistry.json');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || (args.verify ? 'verify' : 'help');
  const registry = loadRegistry();

  if (cmd === 'verify' || args.verify) {
    console.log(
      `[YXB // CMD] Registry verified: ${registry.projects.length} projects, ${registry.categories.length} categories, ${registry.tasks.length} tasks.`
    );
    process.exit(0);
  }

  if (cmd === 'init-project') {
    const name = args.name;
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

    const taskId = `task-${slug}-init`;
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
      toolName: 'AgentInitProject',
      summary: `Registered project [${code}] "${name}" at ${localPath}`,
      detail: `stack: [${stack.join(', ')}] | lifecycle: ${lifecycle}`,
      accent: true,
    });

    saveRegistry(registry);
    console.log(`[YXB // CMD] Registered project ${code} (${id}) -> ${localPath}`);
    return;
  }

  if (cmd === 'add-task') {
    const projectId = args.project || 'proj-dashboard';
    const title = args.title;
    if (!title) {
      console.error('Error: --title is required for add-task');
      process.exit(1);
    }
    const proj = registry.projects.find((p) => p.id === projectId || p.code === projectId);
    const resolvedProjId = proj ? proj.id : projectId;
    const defaultCat =
      registry.categories.find((c) => c.projectId === resolvedProjId)?.id || 'cat-cmd-core';
    const categoryId = args.category || defaultCat;
    const parentId = args.parent || null;
    const depth = Math.min(3, Math.max(0, Number(args.depth || (parentId ? 1 : 0))));
    const priority = args.priority || 'HIGH';
    const status = args.status || 'IN_PROGRESS';
    const isMilestone = Boolean(args.milestone);
    const now = new Date().toISOString();
    const id = args.id || `task-agent-${Date.now().toString().slice(-5)}`;

    registry.tasks.push({
      id,
      projectId: resolvedProjId,
      categoryId,
      parentId,
      depth,
      title,
      notes: args.notes || `Added by autonomous agent via scripts/agent-sync.mjs`,
      priority,
      status,
      dueDate: args.due || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      isMilestone,
      estimatedMinutes: Number(args.est || 45),
      manualOrder: registry.tasks.filter((t) => t.projectId === resolvedProjId).length,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    });

    if (proj) {
      proj.lastAgentSync = now.slice(0, 16).replace('T', ' ');
    }

    registry.cliLogs.push({
      id: `log-${Date.now()}`,
      timestamp: nowTimeStr(),
      type: 'MUTATION',
      toolName: 'AgentAddTask',
      summary: `[${resolvedProjId}] Added L${depth} task "${title}" (${priority})`,
      detail: `id: ${id} | status: ${status} | milestone: ${isMilestone}`,
      accent: true,
    });

    saveRegistry(registry);
    console.log(`[YXB // CMD] Added task ${id} to ${resolvedProjId}: "${title}"`);
    return;
  }

  if (cmd === 'complete-task') {
    const taskId = args.id;
    const task = registry.tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error(`Error: Task ${taskId} not found`);
      process.exit(1);
    }
    task.status = 'COMPLETED';
    task.updatedAt = new Date().toISOString();
    registry.cliLogs.push({
      id: `log-${Date.now()}`,
      timestamp: nowTimeStr(),
      type: 'DIFF',
      toolName: 'AgentCompleteTask',
      summary: `Completed task "${task.title}" (${task.id})`,
      accent: true,
    });
    saveRegistry(registry);
    console.log(`[YXB // CMD] Marked task ${task.id} as COMPLETED`);
    return;
  }

  if (cmd === 'log') {
    const projectId = args.project || 'proj-dashboard';
    const summary = args.summary || 'Agent updated workspace';
    const toolName = args.tool || 'AgentSync';
    const proj = registry.projects.find((p) => p.id === projectId || p.code === projectId);
    if (proj) {
      proj.lastAgentSync = new Date().toISOString().slice(0, 16).replace('T', ' ');
    }
    registry.cliLogs.push({
      id: `log-${Date.now()}`,
      timestamp: nowTimeStr(),
      type: 'DIFF',
      toolName,
      summary: `[${proj ? proj.code : projectId}] ${summary}`,
      detail: args.detail || undefined,
      accent: true,
    });
    saveRegistry(registry);
    console.log(`[YXB // CMD] Appended agent log entry: ${summary}`);
    return;
  }

  console.log(`YXB // CMD Agent Sync CLI
Usage:
  node scripts/agent-sync.mjs --verify
  node scripts/agent-sync.mjs init-project --code "CODE" --name "Name" --path "~/Documents/Github/repo" --stack "Astro,TS" --desc "..."
  node scripts/agent-sync.mjs add-task --project "proj-id" --title "Task title" --priority "HIGH" [--milestone]
  node scripts/agent-sync.mjs complete-task --id "task-id"
  node scripts/agent-sync.mjs log --project "proj-id" --summary "Summary of change"`);
}

main();
