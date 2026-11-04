import registryData from '../data/workspaceRegistry.json';
import type {
  Category,
  CliLogEntry,
  Project,
  ScheduleState,
  TaskNode,
  WorkspaceRegistryPayload,
} from '../types/schedule';

export const STORAGE_KEY = 'yxb_cmd_command_center_v3';

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
    composerTargetParentId: firstTask,
    composerMode: 'SUBTASK',
    activeMode: 'SCHEDULE',
    cliScope: 'LOCAL',
    focusedPanel: 'CENTER',
    inputMode: 'NORMAL',
    projectBrowserOpen: false,
    agentProtocolOpen: false,
    cloudSyncOpen: false,
    leftPanelCollapsed: false,
    rightPanelExpanded: true,
    sortBy: 'MANUAL',
    statusFilter: 'ALL',
    filterQuery: '',
    regexQuery: '',
    lastKeyPressed: 'BOOT',
    statusMessage:
      'YXB // CMD v3.0 — [p] Browse 11 Repos | [a] Panel 3 Composer | [g] Agent CLI | [t/c] Mode',
    cliLogs: payload.cliLogs,
  };
}

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

    const projectMap = new Map<string, Project>();
    for (const p of seed.projects) {
      projectMap.set(p.id, p);
    }
    for (const p of parsed.projects) {
      const canonical = projectMap.get(p.id);
      projectMap.set(
        p.id,
        canonical
          ? {
              ...canonical,
              ...p,
              stack: canonical.stack,
              localPath: canonical.localPath,
              gitBranch: canonical.gitBranch ?? p.gitBranch,
              gitDirtyCount: canonical.gitDirtyCount ?? p.gitDirtyCount,
              lastCommit: canonical.lastCommit ?? p.lastCommit,
            }
          : p
      );
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

    const mergedLogs: CliLogEntry[] = [...(parsed.cliLogs ?? [])];
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
      cloudSyncOpen: false,
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
      cliScope: state.cliScope,
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
