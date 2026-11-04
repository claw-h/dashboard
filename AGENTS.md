# YXB // CMD — Global Agentic Workspace & Telemetry Rules

This directory (`/Users/yashbhardwaj/Documents/Github`) is governed by **YXB // CMD**, the sovereign local TUI Command Center and Hierarchical Scheduling Engine located at `/Users/yashbhardwaj/Documents/Github/dashboard`.

All AI coding agents (Antigravity, Claude Code, Cursor, Codex, and subagents) operating in `/Users/yashbhardwaj/Documents/Github` or any of its child repositories MUST follow this protocol:

## 1. Initializing New Projects in `~/Documents/Github`
Whenever you create or initialize a new project/repository inside `/Users/yashbhardwaj/Documents/Github/<repo>`, you MUST register it on the **YXB // CMD** dashboard so it appears immediately in the `~/workspace` **Browse Project (`[p]`)** menu:

```bash
node /Users/yashbhardwaj/Documents/Github/dashboard/scripts/agent-sync.mjs init-project \
  --code "<SHORT_CODE>" \
  --name "<Project Name>" \
  --path "~/Documents/Github/<repo>" \
  --stack "<Comma,Separated,Tech,Stack>" \
  --desc "<One-line architectural summary>"
```

## 2. Tracking Tasks, Milestones & Subtasks (`L0..L3`)
When planning or executing a feature, refactor, or architectural milestone in any repository under `~/Documents/Github/*`, record the task or subtask on the dashboard:

```bash
node /Users/yashbhardwaj/Documents/Github/dashboard/scripts/agent-sync.mjs add-task \
  --project "<project-id-or-code>" \
  --title "<Task or Subtask Title>" \
  --priority "HIGH" \
  --milestone
```

When completing a tracked task:

```bash
node /Users/yashbhardwaj/Documents/Github/dashboard/scripts/agent-sync.mjs complete-task \
  --id "<task-id>"
```

## 3. Logging Architectural Changes to the `YXB // CMD` Stream
After completing significant code changes in any repository under `~/Documents/Github/*`, append a structured telemetry entry to the dashboard stream:

```bash
node /Users/yashbhardwaj/Documents/Github/dashboard/scripts/agent-sync.mjs log \
  --project "<project-id-or-code>" \
  --tool "AgentCommit" \
  --summary "<Concise summary of what was built or fixed>" \
  --detail "<Modified files or verification results>"
```

## 4. Canonical Registry Location
- Registry JSON: `/Users/yashbhardwaj/Documents/Github/dashboard/src/data/workspaceRegistry.json`
- CLI Utility: `/Users/yashbhardwaj/Documents/Github/dashboard/scripts/agent-sync.mjs`
