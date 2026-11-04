import registryData from '../data/workspaceRegistry.json';
import type {
  Category,
  CliLogEntry,
  Project,
  ScheduleState,
  TaskNode,
  WorkspaceRegistryPayload,
} from '../types/schedule';

export const STORAGE_KEY = 'yxb_cmd_command_center_v2';

export function createInitialSeedState(): ScheduleState {
  const payload = registryData as unknown as WorkspaceRegistryPayload;

  const tasks: Record<string, TaskNode> = {};
  for (const t of payload.tasks) {
    tasks[t.id] = t;
  }

  const firstProject = payload.projects[0]?.id ?? 'proj-dashboard';
  const firstTask =
    payload.tasks.find((t) => t.projectId === firstProject && t.depth === 0)?.id ??
    payload.tasks[0]?.id ??
    null;

  return {
    projects: payload.projects,
    categories: payload.categories,
    tasks,
    selectedProjectId: firstProject,
    selectedCategoryId: 'ALL',
    selectedTaskId: firstTask,
    selectedLeftIndex: 0,
    selectedRightSubtaskId: null,
    activeMode: 'SCHEDULE',
    focusedPanel: 'CENTER',
    inputMode: 'NORMAL',
    projectBrowserOpen: false,
    agentProtocolOpen: false,
    leftPanelCollapsed: false,
    rightPanelExpanded: true,
    sortBy: 'MANUAL',
    statusFilter: 'ALL',
    filterQuery: '',
    regexQuery: '',
    lastKeyPressed: 'BOOT',
    statusMessage:
      'YXB // CMD READY — [p] Browse 11 Projects | [g] Agent Protocol | [j/k] Nav | [a] Add Task | [t/c] Mode',
    cliLogs: payload.cliLogs,
  };
}

/**
 * Loads state from LocalStorage and merges any newly registered projects, categories,
 * or tasks from `src/data/workspaceRegistry.json` (written by `scripts/agent-sync.mjs`).
 */
export function loadScheduleState(): ScheduleState {
  const seed = createInitialSeedState();
  if (typeof window === 'undefined') {
    return seed;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Partial<ScheduleState>;
    if (!parsed || !parsed.projects || !parsed.tasks || !parsed.categories) {
      return seed;
    }

    // Merge canonical registry projects with stored projects so new CLI-added repos always appear
    const projectMap = new Map<string, Project>();
    for (const p of seed.projects) {
      projectMap.set(p.id, p);
    }
    for (const p of parsed.projects) {
      const canonical = projectMap.get(p.id);
      projectMap.set(p.id, canonical ? { ...canonical, ...p, stack: canonical.stack, localPath: canonical.localPath } : p);
    }

    const categoryMap = new Map<string, Category>();
    for (const c of seed.categories) {
      categoryMap.set(c.id, c);
    }
    for (const c of parsed.categories) {
      categoryMap.set(c.id, c);
    }

    const mergedTasks: Record<string, TaskNode> = {
      ...seed.tasks,
      ...parsed.tasks,
    };

    const mergedLogs: CliLogEntry[] = [
      ...(parsed.cliLogs ?? []),
    ];
    for (const seedLog of seed.cliLogs) {
      if (!mergedLogs.some((l) => l.id === seedLog.id)) {
        mergedLogs.push(seedLog);
      }
    }

    const mergedProjects = Array.from(projectMap.values()).sort((a, b) => a.order - b.order);
    const selectedProjectId =
      parsed.selectedProjectId && projectMap.has(parsed.selectedProjectId)
        ? parsed.selectedProjectId
        : seed.selectedProjectId;

    return {
      ...seed,
      ...parsed,
      projects: mergedProjects,
      categories: Array.from(categoryMap.values()),
      tasks: mergedTasks,
      selectedProjectId,
      inputMode: 'NORMAL',
      projectBrowserOpen: false,
      agentProtocolOpen: false,
      lastKeyPressed: 'SYNC',
      statusMessage: `YXB // CMD — Synced ${mergedProjects.length} ~/Documents/Github repositories`,
      cliLogs: mergedLogs.slice(-60),
    };
  } catch {
    return seed;
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
    // Ignore storage quota errors
  }
}
