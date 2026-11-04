# YXB-CMD // YXB // CMD Agentic Console — Agentic Task Blueprint

> **Auto-synced by `YXB // CMD`** (`~/Documents/Github/dashboard`).
> Local Path: `~/Documents/Github/dashboard` | Lifecycle: `PRODUCTION` | Completion: **100% (7/7)**

## Quick Agent CLI Commands (Scoped to this Repository)
```bash
yxb status                                  # View live L0..L3 task tree for YXB-CMD
yxb add "New root task title" -p HIGH -m    # Add L0 parent task
yxb sub <parent-task-id> "Subtask title"    # Add nested subtask (L1..L3)
yxb done <task-id>                          # Mark task COMPLETED & sync dashboard
```

---

## Hierarchical Task Architecture (`L0 -> L1 -> L2 -> L3`)

### Category: TUI Core & Panel 3 Composer (`tui-core`)
- [x] **[L0]** `task-cmd-100` **Consolidate all Task & Subtask (L0..L3) creation and editing inside Panel 3** _(HIGH · due 2026-11-05)_ `◆ MILESTONE`
  - _Notes:_ Replace Panel 2 inline banner with unified Panel 3 Task & Subtask Composer + per-node [+] spawn buttons.
  - [x] **[L1]** `task-cmd-101` **Build Always-Ready Quick Composer at top of RightInspectorPanel.tsx** _(HIGH · due 2026-11-05)_
    - _Notes:_ Support 1-click toggle between [+ Subtask under selected (L1..L3)] and [+ Root Task (L0) in Category].
    - [x] **[L2]** `task-cmd-102` **Add inline [+] child-spawn, [✓] status toggle, and [×] delete on every subtask row** _(HIGH · due 2026-11-05)_
      - _Notes:_ Clicking [+] on an L1 subtask targets L2 immediately; clicking [+] on L2 targets L3.
      - [x] **[L3]** `task-cmd-103` **Add responsive Mobile 3-Tab Switcher ([01 REPOS] [02 WORKSPACE] [03 COMPOSER])** _(HIGH · due 2026-11-05)_ `◆ MILESTONE`
        - _Notes:_ Ensure zero horizontal overflow on 390px phone screens when editing tasks remotely.

### Category: Global CLI & Phone Cloud Sync (`agent-sync`)
- [x] **[L0]** `task-cmd-200` **Ship Global & Local CWD-Scoped `yxb` CLI + GitHub Phone Cloud Bridge** _(HIGH · due 2026-11-05)_ `◆ MILESTONE`
  - _Notes:_ Install ~/.local/bin/yxb, auto-detect current repo from process.cwd(), and sync TASKS.md across all 11 repos.
  - [x] **[L1]** `task-cmd-201` **Implement GitHub Contents API pull/push in src/state/githubSync.ts** _(HIGH · due 2026-11-05)_
    - _Notes:_ Allow phone browsers to commit workspaceRegistry.json updates directly to claw-h/dashboard@main.
  - [x] **[L1]** `task-cmd-202` **Auto-generate per-repository TASKS.md blueprints across ~/Documents/Github/*** _(HIGH · due 2026-11-05)_ `◆ MILESTONE`
    - _Notes:_ Write structured L0..L3 markdown trees into each repository root on `yxb sync`.

### Category: Workspace Repo Browser (`workspace-browser`)
_No root tasks in this category yet._
