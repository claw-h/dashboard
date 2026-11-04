# YXB // CMD — Global Agentic Workspace & Telemetry Rules

This directory (`/Users/yashbhardwaj/Documents/Github`) is governed by **YXB // CMD**, the sovereign local TUI Command Center and Hierarchical Scheduling Engine located at `/Users/yashbhardwaj/Documents/Github/dashboard`.

All AI coding agents (Antigravity, Claude Code, Cursor, Codex, and subagents) operating in `/Users/yashbhardwaj/Documents/Github` or any of its child repositories MUST follow this protocol:

## 1. Local Per-Repo Blueprint (`TASKS.md`) & Scoped CLI (`yxb`)
Every repository in `~/Documents/Github/<repo>` has an auto-synced **`TASKS.md`** blueprint in its root folder, and the global **`yxb`** CLI (`~/.local/bin/yxb`) automatically detects which repository you are inside via `process.cwd()`:

```bash
yxb status                                  # View current repo's Git status & L0..L3 task tree
yxb add "New root task title" -p HIGH -m    # Add L0 parent task to current repo
yxb sub <parent-task-id> "Subtask title"    # Add nested subtask (L1..L3) under <parent-task-id>
yxb done <task-id>                          # Mark task COMPLETED & regenerate <repo>/TASKS.md
yxb log "Concise summary of code changes"   # Append telemetry diff entry for current repo
```

## 2. Initializing New Projects in `~/Documents/Github`
Whenever you create or initialize a new project/repository inside `/Users/yashbhardwaj/Documents/Github/<repo>`, register it immediately on **YXB // CMD** so it appears in the `~/workspace` **Browse Project (`[p]`)** menu and receives its own `TASKS.md`:

```bash
yxb init-project \
  --code "<SHORT_CODE>" \
  --name "<Project Name>" \
  --path "~/Documents/Github/<repo>" \
  --stack "<Comma,Separated,Tech,Stack>" \
  --desc "<One-line architectural summary>"
```

## 3. Global Sync & Phone/GitHub Cloud Bridge
```bash
yxb status -g                               # View all 11+ repositories in ~/Documents/Github
yxb sync                                    # Probe live Git branches & update all TASKS.md files
yxb pull                                    # Pull remote/phone task edits from GitHub
yxb push                                    # Commit & push registry to GitHub (claw-h/dashboard)
```
