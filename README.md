# Claude Code TUI Command Center & Scheduling Engine

A local, web-based command center dashboard built with **Astro**, **React (`@astrojs/react`)**, and **Tailwind CSS (`@astrojs/tailwind`)** that meticulously mimics the Terminal User Interface (TUI) aesthetic of Claude Code, combined with a 3-level hierarchical scheduling engine.

## Visual & Architectural Highlights

- **Claude Code TUI Palette**: Deep charcoal/pitch-black surfaces (`#0F0F11`, `#18181B`), crisp terminal-white typography (`#F4F4F5`), 1px solid box-drawing style borders (`#27272A` / `border-zinc-800`), and signature clay/orange (`#E05C36` / `#EA580C`) focus cursors and active mode badges.
- **Persistent 3-Column Split View (`100dvh`)**:
  - **Left Panel (`01`)**: Collapsible Project Tree, Category Filters, and Status/Milestone Facets.
  - **Center Panel (`02`)**: Dual-mode workspace switching instantaneously between **Schedule Mode (`t`)** and **CLI Stream Mode (`c`)**.
  - **Right Panel (`03`)**: Contextual Inspector featuring a 3-level Subtask Breakdown tree, ASCII completion bars (`█░`), inline metadata editor (`e`), and project velocity metrics.
- **Hierarchical Task Architecture**:
  - Strict relational hierarchy: `Project -> Category -> Parent Tasks (L0) -> Nested Subtasks (L1 -> L2 -> L3)`.
  - In-memory sorting engine (`Manual Order`, `Priority`, `Due Date`, `Status`) + sibling priority reordering (`Shift+J` / `Shift+K`).
  - Automatic LocalStorage persistence (`claude_code_tui_command_center_v1`) with cross-tab synchronization.

## Scholarly & Vim-Inspired Keybindings

| Key | Action |
| :--- | :--- |
| `j` / `k` | Move cursor Down / Up in the active panel |
| `h` / `l` | Collapse/Focus Left Panel / Expand/Focus Right Inspector Panel |
| `J` / `K` (`Shift+j/k`) | Move selected task Down / Up in sibling priority order |
| `a` | Open minimalist inline TUI prompt to add Task or nested Subtask |
| `d` | Delete selected task and its descendant subtask tree |
| `e` | Open inline metadata editor for selected task |
| `t` / `c` | Switch Center Workspace between **Schedule Mode** (`t`) and **CLI Stream Mode** (`c`) |
| `i` | Focus keyword/status filter bar |
| `/` | Focus live global Regular Expression (`/regex/i`) search bar |
| `m` | Toggle **Milestone** (`◆ MILESTONE`) badge on selected task |
| `Tab` | Cycle panel focus sequentially (`LEFT` → `CENTER` → `RIGHT`) |
| `Space` / `Enter` | Cycle task status / Expand or collapse nested subtasks |

## Quick Start

```bash
npm install
npm run dev
```
