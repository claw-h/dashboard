import type {
  Category,
  CliLogEntry,
  Project,
  ScheduleState,
  TaskNode,
} from '../types/schedule';

export const STORAGE_KEY = 'claude_code_tui_command_center_v1';

export function createInitialSeedState(): ScheduleState {
  const projects: Project[] = [
    {
      id: 'proj-core',
      code: 'CLAUDE-TUI',
      name: 'Claude Code Core Engine',
      description: 'Autonomous terminal agent runtime, tool dispatch & AST diff scheduler',
      order: 0,
      expanded: true,
    },
    {
      id: 'proj-infra',
      code: 'SYNAPSE-OS',
      name: 'Distributed Compute Mesh',
      description: 'Low-latency worker orchestration, edge sandboxes & telemetry pipeline',
      order: 1,
      expanded: true,
    },
    {
      id: 'proj-design',
      code: 'SPEC-SYS',
      name: 'Monospace Design System',
      description: 'Box-drawing primitives, Vim keybinding matrix & accessibility audit',
      order: 2,
      expanded: true,
    },
  ];

  const categories: Category[] = [
    { id: 'cat-runtime', projectId: 'proj-core', name: 'Agent Runtime', slug: 'agent-runtime', order: 0 },
    { id: 'cat-scheduler', projectId: 'proj-core', name: 'Task Scheduler', slug: 'task-scheduler', order: 1 },
    { id: 'cat-tui', projectId: 'proj-core', name: 'TUI Renderer', slug: 'tui-renderer', order: 2 },
    { id: 'cat-sandbox', projectId: 'proj-infra', name: 'MicroVM Sandbox', slug: 'microvm-sandbox', order: 0 },
    { id: 'cat-telemetry', projectId: 'proj-infra', name: 'Telemetry Stream', slug: 'telemetry-stream', order: 1 },
    { id: 'cat-keymaps', projectId: 'proj-design', name: 'Vim Keymaps', slug: 'vim-keymaps', order: 0 },
  ];

  const now = '2026-11-04T23:00:00Z';

  const taskList: TaskNode[] = [
    // Parent Task 1 (depth 0)
    {
      id: 'task-100',
      projectId: 'proj-core',
      categoryId: 'cat-scheduler',
      parentId: null,
      depth: 0,
      title: 'Implement deterministic 3-level hierarchical task DAG',
      notes: 'Enforce strict parent -> child depth bounds (0..3) with O(1) sibling priority swaps via Shift+J / Shift+K.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: '2026-11-06',
      isMilestone: true,
      estimatedMinutes: 120,
      manualOrder: 0,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },
    // Subtask Level 1 (depth 1)
    {
      id: 'task-101',
      projectId: 'proj-core',
      categoryId: 'cat-scheduler',
      parentId: 'task-100',
      depth: 1,
      title: 'Build normalized TaskNode lookup store & memoized tree flattener',
      notes: 'Flatten expanded branches into linear row cursor indices for instantaneous j/k navigation.',
      priority: 'HIGH',
      status: 'COMPLETED',
      dueDate: '2026-11-05',
      isMilestone: false,
      estimatedMinutes: 45,
      manualOrder: 0,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },
    // Subtask Level 2 (depth 2)
    {
      id: 'task-102',
      projectId: 'proj-core',
      categoryId: 'cat-scheduler',
      parentId: 'task-101',
      depth: 2,
      title: 'Add box-drawing connector calc (├─, └─, │) for nested branches',
      notes: 'Compute ancestor continuation pipes accurately across arbitrary sibling counts.',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      dueDate: '2026-11-05',
      isMilestone: false,
      estimatedMinutes: 25,
      manualOrder: 0,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },
    // Subtask Level 3 (depth 3 - max depth)
    {
      id: 'task-103',
      projectId: 'proj-core',
      categoryId: 'cat-scheduler',
      parentId: 'task-102',
      depth: 3,
      title: 'Verify depth-3 leaf cap guard on inline task creation (key: a)',
      notes: 'When cursor rests on a depth-3 leaf, pressing `a` spawns a depth-3 sibling to preserve invariant.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: '2026-11-06',
      isMilestone: true,
      estimatedMinutes: 20,
      manualOrder: 0,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },
    // Second Subtask Level 1 under task-100
    {
      id: 'task-104',
      projectId: 'proj-core',
      categoryId: 'cat-scheduler',
      parentId: 'task-100',
      depth: 1,
      title: 'Wire LocalStorage atomic persistence with cross-tab storage sync',
      notes: 'Serialize schedule state under `claude_code_tui_command_center_v1` with schema validation.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      dueDate: '2026-11-06',
      isMilestone: false,
      estimatedMinutes: 30,
      manualOrder: 1,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },

    // Parent Task 2 (depth 0)
    {
      id: 'task-200',
      projectId: 'proj-core',
      categoryId: 'cat-runtime',
      parentId: null,
      depth: 0,
      title: 'Streamline AST Patch Verification & Subagent Tool Dispatch',
      notes: 'Execute parallel read-only context sweeps and stream diff telemetry directly into CLI workspace.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: '2026-11-07',
      isMilestone: true,
      estimatedMinutes: 90,
      manualOrder: 1,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-201',
      projectId: 'proj-core',
      categoryId: 'cat-runtime',
      parentId: 'task-200',
      depth: 1,
      title: 'Implement non-blocking regex search filter (`/`) with syntax guard',
      notes: 'Highlight matching tokens in clay-orange (#E05C36) while retaining ancestor context nodes.',
      priority: 'HIGH',
      status: 'COMPLETED',
      dueDate: '2026-11-05',
      isMilestone: false,
      estimatedMinutes: 35,
      manualOrder: 0,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-202',
      projectId: 'proj-core',
      categoryId: 'cat-runtime',
      parentId: 'task-200',
      depth: 1,
      title: 'Resolve pty stream backpressure on 10k-line diff buffers',
      notes: 'Blocked pending upstream ring-buffer allocation benchmark on arm64.',
      priority: 'MEDIUM',
      status: 'BLOCKED',
      dueDate: '2026-11-08',
      isMilestone: false,
      estimatedMinutes: 60,
      manualOrder: 1,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },

    // Parent Task 3 (depth 0)
    {
      id: 'task-300',
      projectId: 'proj-core',
      categoryId: 'cat-tui',
      parentId: null,
      depth: 0,
      title: 'Calibrate Claude Code Charcoal & Clay-Orange (#E05C36) Palette',
      notes: 'Ensure 1px solid #27272A borders, zero-scroll 100dvh frame, and crisp JetBrains Mono ligatures.',
      priority: 'LOW',
      status: 'QUEUED',
      dueDate: '2026-11-09',
      isMilestone: false,
      estimatedMinutes: 40,
      manualOrder: 2,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },

    // Project 2 Tasks
    {
      id: 'task-400',
      projectId: 'proj-infra',
      categoryId: 'cat-sandbox',
      parentId: null,
      depth: 0,
      title: 'Harden ephemeral Firecracker snapshot restore (<12ms cold boot)',
      notes: 'Pre-warm memory pages for deterministic build & test verification runs.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: '2026-11-06',
      isMilestone: true,
      estimatedMinutes: 110,
      manualOrder: 0,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-401',
      projectId: 'proj-infra',
      categoryId: 'cat-sandbox',
      parentId: 'task-400',
      depth: 1,
      title: 'Configure seccomp-bpf syscall whitelist for headless build workers',
      notes: 'Restrict raw socket creation while permitting loopback dev server probes.',
      priority: 'MEDIUM',
      status: 'QUEUED',
      dueDate: '2026-11-07',
      isMilestone: false,
      estimatedMinutes: 50,
      manualOrder: 0,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },

    // Project 3 Tasks
    {
      id: 'task-500',
      projectId: 'proj-design',
      categoryId: 'cat-keymaps',
      parentId: null,
      depth: 0,
      title: 'Audit Scholarly Vim Modal Keybinding Matrix (j/k/h/l/J/K/a/d/e/m)',
      notes: 'Verify zero collision between NORMAL mode navigation and inline terminal prompt inputs.',
      priority: 'HIGH',
      status: 'COMPLETED',
      dueDate: '2026-11-04',
      isMilestone: true,
      estimatedMinutes: 45,
      manualOrder: 0,
      expanded: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const tasks: Record<string, TaskNode> = {};
  for (const t of taskList) {
    tasks[t.id] = t;
  }

  const cliLogs: CliLogEntry[] = [
    {
      id: 'log-1',
      timestamp: '23:00:01',
      type: 'SYSTEM',
      summary: 'Claude Code TUI Command Center v2.4.0 initialized (client:load hydration complete)',
      detail: 'cwd: ~/Documents/Github/dashboard | theme: dark-charcoal (#0F0F11) | accent: clay (#E05C36)',
      accent: true,
    },
    {
      id: 'log-2',
      timestamp: '23:00:02',
      type: 'TOOL_CALL',
      toolName: 'ReadScheduleStore',
      summary: 'Loaded 3 projects, 6 categories, 11 hierarchical tasks (max depth: 3)',
      detail: 'storage_key: "claude_code_tui_command_center_v1" | status: SYNCED',
    },
    {
      id: 'log-3',
      timestamp: '23:00:04',
      type: 'DIFF',
      toolName: 'KeymapBinder',
      summary: 'Bound global modal listeners: [j/k] nav, [h/l] panels, [J/K] priority order, [a/d/e] CRUD, [t/c] mode, [/] regex, [m] milestone',
      detail: '+ useKeybindings(window) -> active_mode: NORMAL | focus: CENTER',
    },
  ];

  return {
    projects,
    categories,
    tasks,
    selectedProjectId: 'proj-core',
    selectedCategoryId: 'ALL',
    selectedTaskId: 'task-100',
    selectedLeftIndex: 0,
    selectedRightSubtaskId: null,
    activeMode: 'SCHEDULE',
    focusedPanel: 'CENTER',
    inputMode: 'NORMAL',
    leftPanelCollapsed: false,
    rightPanelExpanded: true,
    sortBy: 'MANUAL',
    statusFilter: 'ALL',
    filterQuery: '',
    regexQuery: '',
    lastKeyPressed: 'BOOT',
    statusMessage: 'READY — Press [j/k] to navigate, [a] to add task/subtask, [t/c] to switch mode, [/] regex search',
    cliLogs,
  };
}

export function loadScheduleState(): ScheduleState {
  if (typeof window === 'undefined') {
    return createInitialSeedState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSeedState();
    const parsed = JSON.parse(raw) as Partial<ScheduleState>;
    if (!parsed || !parsed.projects || !parsed.tasks || !parsed.categories) {
      return createInitialSeedState();
    }
    const seed = createInitialSeedState();
    return {
      ...seed,
      ...parsed,
      inputMode: 'NORMAL',
      lastKeyPressed: 'HYDRATED',
      statusMessage: 'Restored session state from LocalStorage (claude_code_tui_command_center_v1)',
    };
  } catch {
    return createInitialSeedState();
  }
}

export function saveScheduleState(state: ScheduleState): void {
  if (typeof window === 'undefined') return;
  try {
    const serializable: Partial<ScheduleState> = {
      projects: state.projects,
      categories: state.categories,
      tasks: state.tasks,
      selectedProjectId: state.selectedProjectId,
      selectedCategoryId: state.selectedCategoryId,
      selectedTaskId: state.selectedTaskId,
      activeMode: state.activeMode,
      focusedPanel: state.focusedPanel,
      leftPanelCollapsed: state.leftPanelCollapsed,
      rightPanelExpanded: state.rightPanelExpanded,
      sortBy: state.sortBy,
      statusFilter: state.statusFilter,
      cliLogs: state.cliLogs.slice(-60),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}
