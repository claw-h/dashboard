import type {
  ActivePanel,
  Category,
  CliLogEntry,
  CliScopeMode,
  InputMode,
  Priority,
  Project,
  ProjectLifecycle,
  ScheduleState,
  SortCriterion,
  StatusFilter,
  TaskNode,
  TaskStatus,
  VisibleTaskRow,
  WorkspaceMode,
  WorkspaceRegistryPayload,
} from '../types/schedule';
import { createInitialSeedState } from './storage';

const PRIORITY_WEIGHT: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const STATUS_WEIGHT: Record<TaskStatus, number> = {
  IN_PROGRESS: 0,
  BLOCKED: 1,
  QUEUED: 2,
  COMPLETED: 3,
};

function nowTimeStr(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function appendLog(
  state: ScheduleState,
  entry: Omit<CliLogEntry, 'id' | 'timestamp'>
): CliLogEntry[] {
  const next: CliLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowTimeStr(),
    ...entry,
  };
  return [...state.cliLogs.slice(-59), next];
}

export function compareTasks(a: TaskNode, b: TaskNode, sortBy: SortCriterion): number {
  if (sortBy === 'PRIORITY') {
    const diff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (diff !== 0) return diff;
  } else if (sortBy === 'DUE_DATE') {
    const diff = a.dueDate.localeCompare(b.dueDate);
    if (diff !== 0) return diff;
  } else if (sortBy === 'STATUS') {
    const diff = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
    if (diff !== 0) return diff;
  }
  if (a.manualOrder !== b.manualOrder) {
    return a.manualOrder - b.manualOrder;
  }
  return a.createdAt.localeCompare(b.createdAt);
}

export function buildMatcher(regexQuery: string, filterQuery: string): {
  matches: (task: TaskNode) => boolean;
  regexError: string | null;
} {
  let regex: RegExp | null = null;
  let regexError: string | null = null;

  if (regexQuery.trim()) {
    try {
      regex = new RegExp(regexQuery.trim(), 'i');
    } catch (err) {
      regexError = err instanceof Error ? err.message : 'Invalid regular expression';
    }
  }

  const normalizedFilter = filterQuery.trim().toLowerCase();

  return {
    regexError,
    matches: (task: TaskNode) => {
      const haystack = `${task.title} ${task.notes} ${task.priority} ${task.status} ${task.dueDate}`;
      if (regex && !regex.test(haystack)) {
        return false;
      }
      if (normalizedFilter && !haystack.toLowerCase().includes(normalizedFilter)) {
        return false;
      }
      return true;
    },
  };
}

export function selectVisibleTaskRows(state: ScheduleState): {
  rows: VisibleTaskRow[];
  regexError: string | null;
} {
  const { matches, regexError } = buildMatcher(state.regexQuery, state.filterQuery);
  const allTasks = Object.values(state.tasks);

  const scopedTasks = allTasks.filter((t) => {
    if (t.projectId !== state.selectedProjectId) return false;
    if (state.selectedCategoryId !== 'ALL' && t.categoryId !== state.selectedCategoryId) {
      return false;
    }
    return true;
  });

  const childrenMap = new Map<string | null, TaskNode[]>();
  for (const t of scopedTasks) {
    const key = t.parentId;
    const list = childrenMap.get(key) ?? [];
    list.push(t);
    childrenMap.set(key, list);
  }

  for (const list of childrenMap.values()) {
    list.sort((a, b) => compareTasks(a, b, state.sortBy));
  }

  const nodeMatchesOrHasMatchingDescendant = (node: TaskNode): boolean => {
    const statusOk =
      state.statusFilter === 'ALL' ||
      (state.statusFilter === 'MILESTONES' && node.isMilestone) ||
      node.status === state.statusFilter;

    const selfMatches = statusOk && matches(node);
    const kids = childrenMap.get(node.id) ?? [];
    const childMatches = kids.some((k) => nodeMatchesOrHasMatchingDescendant(k));
    return selfMatches || childMatches;
  };

  const rows: VisibleTaskRow[] = [];

  const traverse = (parentId: string | null, ancestorLines: boolean[]) => {
    const siblings = (childrenMap.get(parentId) ?? []).filter((n) =>
      nodeMatchesOrHasMatchingDescendant(n)
    );
    siblings.forEach((node, idx) => {
      const isLastSibling = idx === siblings.length - 1;
      const directKids = childrenMap.get(node.id) ?? [];
      const completedChildCount = directKids.filter((k) => k.status === 'COMPLETED').length;

      rows.push({
        task: node,
        hasChildren: directKids.length > 0,
        childCount: directKids.length,
        completedChildCount,
        isLastSibling,
        ancestorLines,
      });

      if (node.expanded && directKids.length > 0) {
        traverse(node.id, [...ancestorLines, !isLastSibling]);
      }
    });
  };

  traverse(null, []);
  return { rows, regexError };
}

export interface LeftNavItem {
  kind: 'PROJECT' | 'CATEGORY_ALL' | 'CATEGORY';
  projectId: string;
  categoryId?: string;
  label: string;
  code?: string;
  expanded?: boolean;
  count: number;
}

export function selectLeftNavItems(state: ScheduleState): LeftNavItem[] {
  const items: LeftNavItem[] = [];
  const allTasks = Object.values(state.tasks);

  for (const proj of state.projects) {
    const projTasks = allTasks.filter((t) => t.projectId === proj.id);
    items.push({
      kind: 'PROJECT',
      projectId: proj.id,
      label: proj.name,
      code: proj.code,
      expanded: proj.expanded,
      count: projTasks.length,
    });

    if (proj.expanded) {
      items.push({
        kind: 'CATEGORY_ALL',
        projectId: proj.id,
        categoryId: 'ALL',
        label: 'All Categories',
        count: projTasks.length,
      });

      const cats = state.categories
        .filter((c) => c.projectId === proj.id)
        .sort((a, b) => a.order - b.order);

      for (const cat of cats) {
        const catCount = projTasks.filter((t) => t.categoryId === cat.id).length;
        items.push({
          kind: 'CATEGORY',
          projectId: proj.id,
          categoryId: cat.id,
          label: cat.name,
          count: catCount,
        });
      }
    }
  }
  return items;
}

export function selectTaskSubtree(state: ScheduleState, rootTaskId: string | null): TaskNode[] {
  if (!rootTaskId || !state.tasks[rootTaskId]) return [];
  const result: TaskNode[] = [];
  const allTasks = Object.values(state.tasks);

  const collect = (parentId: string) => {
    const kids = allTasks
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => compareTasks(a, b, state.sortBy));
    for (const k of kids) {
      result.push(k);
      collect(k.id);
    }
  };

  collect(rootTaskId);
  return result;
}

export type ScheduleAction =
  | { type: 'MOVE_CURSOR'; delta: 1 | -1 }
  | { type: 'FOCUS_LEFT_OR_TOGGLE' }
  | { type: 'FOCUS_RIGHT_EXPAND' }
  | { type: 'CYCLE_PANEL_FOCUS' }
  | { type: 'SET_PANEL_FOCUS'; panel: ActivePanel }
  | { type: 'SET_WORKSPACE_MODE'; mode: WorkspaceMode; keyHint?: string }
  | { type: 'SET_CLI_SCOPE'; scope: CliScopeMode }
  | { type: 'SET_INPUT_MODE'; mode: InputMode; keyHint?: string }
  | { type: 'FOCUS_PANEL3_COMPOSER'; mode?: 'ROOT' | 'SUBTASK'; targetParentId?: string | null }
  | { type: 'TOGGLE_PROJECT_BROWSER'; open?: boolean }
  | { type: 'TOGGLE_AGENT_PROTOCOL'; open?: boolean }
  | { type: 'TOGGLE_CLOUD_SYNC'; open?: boolean }
  | { type: 'APPLY_REMOTE_REGISTRY'; payload: WorkspaceRegistryPayload; sourceLabel: string }
  | { type: 'SELECT_PROJECT_CATEGORY'; projectId: string; categoryId: string | 'ALL'; closeBrowser?: boolean }
  | { type: 'TOGGLE_PROJECT_EXPAND'; projectId: string }
  | {
      type: 'REGISTER_NEW_PROJECT';
      code: string;
      name: string;
      localPath: string;
      stack: string[];
      description: string;
      lifecycle?: ProjectLifecycle;
    }
  | { type: 'SELECT_TASK'; taskId: string }
  | {
      type: 'ADD_TASK_PANEL3';
      title: string;
      notes?: string;
      priority: Priority;
      dueDate: string;
      isMilestone?: boolean;
      categoryId?: string;
      mode: 'ROOT' | 'SUBTASK';
      targetParentId?: string | null;
    }
  | { type: 'DELETE_TASK_BY_ID'; taskId?: string }
  | { type: 'UPDATE_TASK_METADATA'; taskId: string; title: string; priority: Priority; status: TaskStatus; dueDate: string; estimatedMinutes: number; notes: string }
  | { type: 'CYCLE_TASK_STATUS'; taskId?: string }
  | { type: 'SET_TASK_PRIORITY'; taskId: string; priority: Priority }
  | { type: 'SET_TASK_STATUS'; taskId: string; status: TaskStatus }
  | { type: 'TOGGLE_MILESTONE'; taskId?: string }
  | { type: 'TOGGLE_TASK_EXPAND'; taskId?: string }
  | { type: 'REORDER_TASK_PRIORITY'; direction: 'UP' | 'DOWN' }
  | { type: 'SET_SORT_BY'; sortBy: SortCriterion }
  | { type: 'SET_STATUS_FILTER'; statusFilter: StatusFilter }
  | { type: 'SET_FILTER_QUERY'; query: string }
  | { type: 'SET_REGEX_QUERY'; query: string }
  | { type: 'EXECUTE_CLI_COMMAND'; rawCommand: string }
  | { type: 'APPEND_CLI_LOG'; entry: Omit<CliLogEntry, 'id' | 'timestamp'> }
  | { type: 'RESET_SEED_DATA' }
  | { type: 'SYNC_FROM_STORAGE'; state: ScheduleState };

export function scheduleReducer(state: ScheduleState, action: ScheduleAction): ScheduleState {
  switch (action.type) {
    case 'MOVE_CURSOR': {
      const keyName = action.delta === 1 ? 'j' : 'k';
      if (state.focusedPanel === 'LEFT') {
        const leftItems = selectLeftNavItems(state);
        if (leftItems.length === 0) return state;
        const nextIdx = Math.max(
          0,
          Math.min(leftItems.length - 1, state.selectedLeftIndex + action.delta)
        );
        const item = leftItems[nextIdx];
        const nextProjectId = item.projectId;
        const nextCategoryId =
          item.kind === 'CATEGORY'
            ? item.categoryId ?? 'ALL'
            : item.kind === 'CATEGORY_ALL'
            ? 'ALL'
            : state.selectedProjectId === item.projectId
            ? state.selectedCategoryId
            : 'ALL';

        const tempState: ScheduleState = {
          ...state,
          selectedLeftIndex: nextIdx,
          selectedProjectId: nextProjectId,
          selectedCategoryId: nextCategoryId,
          lastKeyPressed: keyName,
          statusMessage: `NAV [LEFT] -> ${item.label}`,
        };
        const { rows } = selectVisibleTaskRows(tempState);
        const firstId = rows[0]?.task.id ?? null;
        return {
          ...tempState,
          selectedTaskId: firstId,
          composerTargetParentId: firstId,
        };
      }

      if (state.focusedPanel === 'RIGHT') {
        const subtree = selectTaskSubtree(state, state.selectedTaskId);
        if (subtree.length === 0) {
          return {
            ...state,
            lastKeyPressed: keyName,
            statusMessage: 'Panel 3: Selected task has no nested subtasks yet (use Composer above)',
          };
        }
        const currentIdx = subtree.findIndex((t) => t.id === state.selectedRightSubtaskId);
        const nextIdx =
          currentIdx === -1
            ? 0
            : Math.max(0, Math.min(subtree.length - 1, currentIdx + action.delta));
        const target = subtree[nextIdx];
        return {
          ...state,
          selectedRightSubtaskId: target.id,
          composerTargetParentId: target.id,
          lastKeyPressed: keyName,
          statusMessage: `PANEL 3 SUBTASK [L${target.depth}] -> ${target.title}`,
        };
      }

      const { rows } = selectVisibleTaskRows(state);
      if (rows.length === 0) return { ...state, lastKeyPressed: keyName };
      const currentIdx = rows.findIndex((r) => r.task.id === state.selectedTaskId);
      const nextIdx =
        currentIdx === -1
          ? 0
          : Math.max(0, Math.min(rows.length - 1, currentIdx + action.delta));
      const nextTask = rows[nextIdx].task;
      return {
        ...state,
        selectedTaskId: nextTask.id,
        composerTargetParentId: nextTask.id,
        selectedRightSubtaskId: null,
        lastKeyPressed: keyName,
        statusMessage: `CURSOR [${nextIdx + 1}/${rows.length}] L${nextTask.depth} :: ${nextTask.title}`,
      };
    }

    case 'FOCUS_LEFT_OR_TOGGLE': {
      if (state.focusedPanel !== 'LEFT') {
        return {
          ...state,
          leftPanelCollapsed: false,
          focusedPanel: 'LEFT',
          lastKeyPressed: 'h',
          statusMessage: 'FOCUS -> PANEL 01 (Workspace Tree) | Press [h] again to collapse',
        };
      }
      const collapsed = !state.leftPanelCollapsed;
      return {
        ...state,
        leftPanelCollapsed: collapsed,
        focusedPanel: collapsed ? 'CENTER' : 'LEFT',
        lastKeyPressed: 'h',
        statusMessage: collapsed
          ? 'PANEL 01 COLLAPSED -> Focus returned to CENTER Workspace'
          : 'PANEL 01 EXPANDED',
      };
    }

    case 'FOCUS_RIGHT_EXPAND': {
      return {
        ...state,
        rightPanelExpanded: true,
        focusedPanel: 'RIGHT',
        lastKeyPressed: 'l',
        statusMessage: 'FOCUS -> PANEL 03 (Unified Task & Subtask Composer + Inspector)',
      };
    }

    case 'FOCUS_PANEL3_COMPOSER': {
      const parentId =
        action.targetParentId !== undefined ? action.targetParentId : state.selectedTaskId;
      const resolvedMode =
        action.mode ?? (parentId && state.tasks[parentId] ? 'SUBTASK' : 'ROOT');
      return {
        ...state,
        rightPanelExpanded: true,
        focusedPanel: 'RIGHT',
        inputMode: 'INLINE_ADD',
        composerMode: resolvedMode,
        composerTargetParentId: parentId ?? state.selectedTaskId,
        lastKeyPressed: 'a',
        statusMessage:
          resolvedMode === 'SUBTASK' && parentId && state.tasks[parentId]
            ? `PANEL 03 COMPOSER -> Adding nested subtask under "${state.tasks[parentId].title.slice(0, 32)}..."`
            : 'PANEL 03 COMPOSER -> Adding new Root Task (L0)',
      };
    }

    case 'CYCLE_PANEL_FOCUS': {
      const order: ActivePanel[] = ['LEFT', 'CENTER', 'RIGHT'];
      const nextPanel = order[(order.indexOf(state.focusedPanel) + 1) % order.length];
      return {
        ...state,
        leftPanelCollapsed: nextPanel === 'LEFT' ? false : state.leftPanelCollapsed,
        rightPanelExpanded: nextPanel === 'RIGHT' ? true : state.rightPanelExpanded,
        focusedPanel: nextPanel,
        lastKeyPressed: 'Tab',
        statusMessage: `FOCUS CYCLED -> ${nextPanel} PANEL`,
      };
    }

    case 'SET_PANEL_FOCUS': {
      return {
        ...state,
        focusedPanel: action.panel,
        statusMessage: `FOCUS -> ${action.panel} PANEL`,
      };
    }

    case 'SET_WORKSPACE_MODE': {
      return {
        ...state,
        activeMode: action.mode,
        focusedPanel: 'CENTER',
        inputMode: 'NORMAL',
        projectBrowserOpen: false,
        agentProtocolOpen: false,
        cloudSyncOpen: false,
        lastKeyPressed: action.keyHint ?? (action.mode === 'SCHEDULE' ? 't' : 'c'),
        statusMessage:
          action.mode === 'SCHEDULE'
            ? 'MODE -> SCHEDULE WORKSPACE (Hierarchical Task Architecture)'
            : `MODE -> CLI STREAM (${state.cliScope} SCOPE)`,
      };
    }

    case 'SET_CLI_SCOPE': {
      const activeProj = state.projects.find((p) => p.id === state.selectedProjectId);
      return {
        ...state,
        cliScope: action.scope,
        statusMessage:
          action.scope === 'LOCAL'
            ? `CLI SCOPE -> LOCAL REPO (${activeProj?.code ?? state.selectedProjectId})`
            : `CLI SCOPE -> GLOBAL WORKSPACE (${state.projects.length} repositories)`,
      };
    }

    case 'SET_INPUT_MODE': {
      return {
        ...state,
        inputMode: action.mode,
        projectBrowserOpen: action.mode === 'PROJECT_BROWSER',
        agentProtocolOpen: action.mode === 'AGENT_PROTOCOL',
        cloudSyncOpen: action.mode === 'CLOUD_SYNC',
        lastKeyPressed: action.keyHint ?? state.lastKeyPressed,
        statusMessage:
          action.mode === 'NORMAL'
            ? '-- NORMAL MODE --'
            : action.mode === 'INLINE_ADD'
            ? '-- PANEL 03 COMPOSER [a] -- Enter title & press Enter to create Task/Subtask'
            : action.mode === 'INLINE_EDIT'
            ? '-- PANEL 03 INSPECTOR EDIT [e] --'
            : action.mode === 'SEARCH_REGEX'
            ? '-- REGEX SEARCH [/] --'
            : action.mode === 'FILTER_BAR'
            ? '-- FILTER BAR [i] --'
            : `-- ${action.mode} --`,
      };
    }

    case 'TOGGLE_PROJECT_BROWSER': {
      const nextOpen = action.open ?? !state.projectBrowserOpen;
      return {
        ...state,
        projectBrowserOpen: nextOpen,
        agentProtocolOpen: false,
        cloudSyncOpen: false,
        inputMode: nextOpen ? 'PROJECT_BROWSER' : 'NORMAL',
        lastKeyPressed: 'p',
        statusMessage: nextOpen
          ? `BROWSE PROJECT MENU OPEN (${state.projects.length} repositories in ~/Documents/Github)`
          : '-- NORMAL MODE --',
      };
    }

    case 'TOGGLE_AGENT_PROTOCOL': {
      const nextOpen = action.open ?? !state.agentProtocolOpen;
      return {
        ...state,
        agentProtocolOpen: nextOpen,
        projectBrowserOpen: false,
        cloudSyncOpen: false,
        inputMode: nextOpen ? 'AGENT_PROTOCOL' : 'NORMAL',
        lastKeyPressed: 'g',
        statusMessage: nextOpen
          ? 'AGENT CONTEXT PROTOCOL OPEN — Global & Local CLI (`yxb`) active'
          : '-- NORMAL MODE --',
      };
    }

    case 'TOGGLE_CLOUD_SYNC': {
      const nextOpen = action.open ?? !state.cloudSyncOpen;
      return {
        ...state,
        cloudSyncOpen: nextOpen,
        projectBrowserOpen: false,
        agentProtocolOpen: false,
        inputMode: nextOpen ? 'CLOUD_SYNC' : 'NORMAL',
        lastKeyPressed: 's',
        statusMessage: nextOpen
          ? 'GITHUB PHONE / CLOUD SYNC BRIDGE OPEN'
          : '-- NORMAL MODE --',
      };
    }

    case 'APPLY_REMOTE_REGISTRY': {
      const { payload, sourceLabel } = action;
      const tasksMap: Record<string, TaskNode> = {};
      for (const t of payload.tasks) {
        tasksMap[t.id] = t;
      }
      const nextProjId =
        payload.projects.some((p) => p.id === state.selectedProjectId)
          ? state.selectedProjectId
          : payload.projects[0]?.id ?? 'proj-dashboard';

      const tempState: ScheduleState = {
        ...state,
        projects: payload.projects,
        categories: payload.categories,
        tasks: tasksMap,
        selectedProjectId: nextProjId,
        cloudSyncOpen: false,
        inputMode: 'NORMAL',
        statusMessage: `SYNCED FROM ${sourceLabel}: ${payload.projects.length} repos, ${payload.tasks.length} tasks`,
        cliLogs: appendLog(state, {
          type: 'SYSTEM',
          scope: 'GLOBAL',
          toolName: 'GitHubCloudSync',
          summary: `Synced ${payload.projects.length} projects & ${payload.tasks.length} tasks from ${sourceLabel}`,
          accent: true,
        }),
      };
      const { rows } = selectVisibleTaskRows(tempState);
      return {
        ...tempState,
        selectedTaskId: rows[0]?.task.id ?? null,
        composerTargetParentId: rows[0]?.task.id ?? null,
      };
    }

    case 'TOGGLE_PROJECT_EXPAND': {
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId ? { ...p, expanded: !p.expanded } : p
        ),
      };
    }

    case 'SELECT_PROJECT_CATEGORY': {
      const updatedProjects = state.projects.map((p) =>
        p.id === action.projectId ? { ...p, expanded: true } : p
      );
      const selectedProj = updatedProjects.find((p) => p.id === action.projectId);
      const tempState: ScheduleState = {
        ...state,
        projects: updatedProjects,
        selectedProjectId: action.projectId,
        selectedCategoryId: action.categoryId,
        projectBrowserOpen: action.closeBrowser ? false : state.projectBrowserOpen,
        inputMode: action.closeBrowser ? 'NORMAL' : state.inputMode,
        statusMessage: `LOCAL SCOPE -> ${selectedProj?.code ?? action.projectId} (${selectedProj?.localPath ?? ''})`,
      };
      const { rows } = selectVisibleTaskRows(tempState);
      const firstId = rows[0]?.task.id ?? null;
      return {
        ...tempState,
        selectedTaskId: firstId,
        composerTargetParentId: firstId,
      };
    }

    case 'REGISTER_NEW_PROJECT': {
      const cleanName = action.name.trim();
      const cleanCode = action.code.trim().toUpperCase() || 'NEW-PROJ';
      if (!cleanName) return state;

      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newProjId = `proj-${slug}-${Date.now().toString().slice(-3)}`;
      const newCatId = `cat-${slug}-core`;
      const newTaskId = `task-${slug}-100`;
      const now = new Date().toISOString();

      const newProj: Project = {
        id: newProjId,
        code: cleanCode,
        name: cleanName,
        description: action.description.trim() || `Workspace repository at ${action.localPath}`,
        localPath: action.localPath.trim() || `~/Documents/Github/${slug}`,
        stack: action.stack.length > 0 ? action.stack : ['Astro', 'TypeScript'],
        lifecycle: action.lifecycle ?? 'ACTIVE',
        lastAgentSync: new Date().toISOString().slice(0, 16).replace('T', ' '),
        gitBranch: 'main',
        gitDirtyCount: 0,
        lastCommit: 'Initial project registration',
        order: state.projects.length,
        expanded: true,
      };

      const newCategory: Category = {
        id: newCatId,
        projectId: newProjId,
        name: 'Architecture & Core',
        slug: 'arch-core',
        order: 0,
      };

      const initialTask: TaskNode = {
        id: newTaskId,
        projectId: newProjId,
        categoryId: newCatId,
        parentId: null,
        depth: 0,
        title: `Initialize ${cleanName} architecture & sync with YXB // CMD`,
        notes: `Initialized at ${newProj.localPath} with stack [${newProj.stack.join(', ')}].`,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: '2026-11-12',
        isMilestone: true,
        estimatedMinutes: 60,
        manualOrder: 0,
        expanded: true,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        projects: [...state.projects, newProj],
        categories: [...state.categories, newCategory],
        tasks: {
          ...state.tasks,
          [newTaskId]: initialTask,
        },
        selectedProjectId: newProjId,
        selectedCategoryId: 'ALL',
        selectedTaskId: newTaskId,
        composerTargetParentId: newTaskId,
        projectBrowserOpen: false,
        inputMode: 'NORMAL',
        statusMessage: `INITIALIZED PROJECT [${cleanCode}] at ${newProj.localPath}`,
        cliLogs: appendLog(state, {
          type: 'MUTATION',
          scope: 'GLOBAL',
          projectCode: cleanCode,
          toolName: 'RegisterProject',
          summary: `Initialized new project "${cleanName}" (${cleanCode}) at ${newProj.localPath}`,
          detail: `stack: [${newProj.stack.join(', ')}] | initial_milestone: ${newTaskId}`,
          accent: true,
        }),
      };
    }

    case 'SELECT_TASK': {
      const target = state.tasks[action.taskId];
      if (!target) return state;
      return {
        ...state,
        selectedTaskId: action.taskId,
        composerTargetParentId: action.taskId,
        selectedRightSubtaskId: null,
        statusMessage: `Selected [L${target.depth}] (${target.id}) ${target.title}`,
      };
    }

    case 'ADD_TASK_PANEL3': {
      const cleanTitle = action.title.trim();
      if (!cleanTitle) return state;

      const activeProj = state.projects.find((p) => p.id === state.selectedProjectId);
      const parentCandidateId =
        action.targetParentId !== undefined
          ? action.targetParentId
          : state.composerTargetParentId ?? state.selectedTaskId;
      const parentNode =
        action.mode === 'SUBTASK' && parentCandidateId ? state.tasks[parentCandidateId] : null;

      let parentId: string | null = null;
      let depth: 0 | 1 | 2 | 3 = 0;

      if (action.mode === 'SUBTASK' && parentNode && parentNode.projectId === state.selectedProjectId) {
        if (parentNode.depth < 3) {
          parentId = parentNode.id;
          depth = (parentNode.depth + 1) as 1 | 2 | 3;
        } else {
          parentId = parentNode.parentId;
          depth = 3;
        }
      }

      const resolvedCategoryId =
        parentNode && action.mode === 'SUBTASK'
          ? parentNode.categoryId
          : action.categoryId ||
            (state.selectedCategoryId !== 'ALL'
              ? state.selectedCategoryId
              : state.categories.find((c) => c.projectId === state.selectedProjectId)?.id ??
                'cat-cmd-core');

      const siblings = Object.values(state.tasks).filter(
        (t) =>
          t.projectId === state.selectedProjectId &&
          t.categoryId === resolvedCategoryId &&
          t.parentId === parentId
      );
      const nextOrder =
        siblings.length > 0 ? Math.max(...siblings.map((s) => s.manualOrder)) + 1 : 0;

      const projPrefix = (activeProj?.code ?? 'task').toLowerCase().replace(/[^a-z0-9]/g, '');
      const newId = `task-${projPrefix}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      const newTask: TaskNode = {
        id: newId,
        projectId: state.selectedProjectId,
        categoryId: resolvedCategoryId,
        parentId,
        depth,
        title: cleanTitle,
        notes:
          action.notes?.trim() ||
          `Created in Panel 3 Composer (${depth === 0 ? 'Root Task L0' : `Nested Subtask L${depth}`}).`,
        priority: action.priority,
        status: 'QUEUED',
        dueDate: action.dueDate || '2026-11-10',
        isMilestone: Boolean(action.isMilestone),
        estimatedMinutes: depth === 0 ? 60 : 25,
        manualOrder: nextOrder,
        expanded: true,
        createdAt: now,
        updatedAt: now,
      };

      const nextTasks = { ...state.tasks, [newId]: newTask };
      if (parentId && nextTasks[parentId]) {
        nextTasks[parentId] = { ...nextTasks[parentId], expanded: true };
      }

      return {
        ...state,
        tasks: nextTasks,
        selectedTaskId: depth === 0 ? newId : state.selectedTaskId ?? newId,
        composerTargetParentId: depth === 0 ? newId : parentId ?? newId,
        inputMode: 'NORMAL',
        lastKeyPressed: 'a',
        statusMessage: `ADDED [L${depth}] (${newId}) "${cleanTitle}" -> ${activeProj?.code ?? ''}`,
        cliLogs: appendLog(state, {
          type: 'MUTATION',
          scope: 'LOCAL',
          projectCode: activeProj?.code,
          toolName: 'Panel3CreateNode',
          summary: `[${activeProj?.code}] Added L${depth} ${depth === 0 ? 'Root Task' : 'Subtask'} "${cleanTitle}" (${action.priority})`,
          detail: `id: ${newId} | parent: ${parentId ?? 'ROOT'} | category: ${resolvedCategoryId}`,
          accent: true,
        }),
      };
    }

    case 'DELETE_TASK_BY_ID': {
      const targetId =
        action.taskId ??
        (state.focusedPanel === 'RIGHT' && state.selectedRightSubtaskId
          ? state.selectedRightSubtaskId
          : state.selectedTaskId);

      if (!targetId || !state.tasks[targetId]) {
        return {
          ...state,
          lastKeyPressed: 'd',
          statusMessage: 'No task selected to delete',
        };
      }

      const targetTask = state.tasks[targetId];
      const { rows } = selectVisibleTaskRows(state);
      const currentRowIdx = rows.findIndex((r) => r.task.id === targetId);

      const toDelete = new Set<string>([targetId]);
      let added = true;
      while (added) {
        added = false;
        for (const t of Object.values(state.tasks)) {
          if (t.parentId && toDelete.has(t.parentId) && !toDelete.has(t.id)) {
            toDelete.add(t.id);
            added = true;
          }
        }
      }

      const nextTasks: Record<string, TaskNode> = {};
      for (const [id, task] of Object.entries(state.tasks)) {
        if (!toDelete.has(id)) {
          nextTasks[id] = task;
        }
      }

      const remainingRows = rows.filter((r) => !toDelete.has(r.task.id));
      const fallbackRow =
        remainingRows[Math.min(Math.max(0, currentRowIdx), remainingRows.length - 1)] ?? null;
      const nextSelected =
        state.selectedTaskId && !toDelete.has(state.selectedTaskId)
          ? state.selectedTaskId
          : fallbackRow?.task.id ?? null;

      return {
        ...state,
        tasks: nextTasks,
        selectedTaskId: nextSelected,
        composerTargetParentId: nextSelected,
        selectedRightSubtaskId: null,
        lastKeyPressed: 'd',
        statusMessage: `DELETED "${targetTask.title}" (${toDelete.size} node${toDelete.size > 1 ? 's' : ''} removed)`,
        cliLogs: appendLog(state, {
          type: 'DIFF',
          scope: 'LOCAL',
          toolName: 'DeleteTaskSubtree',
          summary: `- Removed "${targetTask.title}" and ${toDelete.size - 1} nested subtask(s)`,
          detail: `deleted_ids: [${Array.from(toDelete).join(', ')}]`,
        }),
      };
    }

    case 'UPDATE_TASK_METADATA': {
      const existing = state.tasks[action.taskId];
      if (!existing) return { ...state, inputMode: 'NORMAL' };
      const updated: TaskNode = {
        ...existing,
        title: action.title.trim() || existing.title,
        priority: action.priority,
        status: action.status,
        dueDate: action.dueDate || existing.dueDate,
        estimatedMinutes: Math.max(5, action.estimatedMinutes || existing.estimatedMinutes),
        notes: action.notes,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.taskId]: updated,
        },
        inputMode: 'NORMAL',
        lastKeyPressed: 'e',
        statusMessage: `SAVED [${updated.id}] "${updated.title}"`,
      };
    }

    case 'SET_TASK_PRIORITY': {
      const current = state.tasks[action.taskId];
      if (!current) return state;
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.taskId]: {
            ...current,
            priority: action.priority,
            updatedAt: new Date().toISOString(),
          },
        },
        statusMessage: `PRIORITY [${current.id}] -> ${action.priority}`,
      };
    }

    case 'SET_TASK_STATUS': {
      const current = state.tasks[action.taskId];
      if (!current) return state;
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.taskId]: {
            ...current,
            status: action.status,
            updatedAt: new Date().toISOString(),
          },
        },
        statusMessage: `STATUS [${current.id}] -> ${action.status}`,
      };
    }

    case 'CYCLE_TASK_STATUS': {
      const targetId = action.taskId ?? state.selectedTaskId;
      if (!targetId || !state.tasks[targetId]) return state;
      const order: TaskStatus[] = ['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];
      const current = state.tasks[targetId];
      const nextStatus = order[(order.indexOf(current.status) + 1) % order.length];
      const updated: TaskNode = {
        ...current,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        tasks: { ...state.tasks, [targetId]: updated },
        lastKeyPressed: 'Space',
        statusMessage: `STATUS [${updated.title}] -> ${nextStatus}`,
        cliLogs: appendLog(state, {
          type: 'MUTATION',
          scope: 'LOCAL',
          toolName: 'StatusTransition',
          summary: `${current.status} -> ${nextStatus} :: "${updated.title}"`,
        }),
      };
    }

    case 'TOGGLE_MILESTONE': {
      const targetId = action.taskId ?? state.selectedTaskId;
      if (!targetId || !state.tasks[targetId]) return state;
      const current = state.tasks[targetId];
      const nextMilestone = !current.isMilestone;
      const updated: TaskNode = {
        ...current,
        isMilestone: nextMilestone,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        tasks: { ...state.tasks, [targetId]: updated },
        lastKeyPressed: 'm',
        statusMessage: nextMilestone
          ? `◆ MARKED AS MILESTONE :: "${updated.title}"`
          : `◇ Unmarked milestone :: "${updated.title}"`,
        cliLogs: appendLog(state, {
          type: 'MUTATION',
          scope: 'LOCAL',
          toolName: 'ToggleMilestone',
          summary: `${nextMilestone ? '◆ Promoted to Milestone' : '◇ Removed Milestone'}: "${updated.title}"`,
          accent: nextMilestone,
        }),
      };
    }

    case 'TOGGLE_TASK_EXPAND': {
      const targetId = action.taskId ?? state.selectedTaskId;
      if (!targetId || !state.tasks[targetId]) return state;
      const current = state.tasks[targetId];
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [targetId]: { ...current, expanded: !current.expanded },
        },
        statusMessage: `${!current.expanded ? 'Expanded' : 'Collapsed'} children of "${current.title}"`,
      };
    }

    case 'REORDER_TASK_PRIORITY': {
      const targetId = state.selectedTaskId;
      if (!targetId || !state.tasks[targetId]) return state;
      const target = state.tasks[targetId];
      const keyName = action.direction === 'DOWN' ? 'J' : 'K';

      const siblings = Object.values(state.tasks)
        .filter(
          (t) =>
            t.projectId === target.projectId &&
            t.categoryId === target.categoryId &&
            t.parentId === target.parentId
        )
        .sort((a, b) => compareTasks(a, b, state.sortBy));

      const idx = siblings.findIndex((s) => s.id === targetId);
      const swapIdx = action.direction === 'DOWN' ? idx + 1 : idx - 1;

      if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) {
        return {
          ...state,
          lastKeyPressed: keyName,
          statusMessage: `Task "${target.title}" is already at the ${action.direction === 'UP' ? 'top' : 'bottom'} of its sibling group`,
        };
      }

      const reordered = [...siblings];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(swapIdx, 0, moved);

      const nextTasks = { ...state.tasks };
      reordered.forEach((node, orderIndex) => {
        nextTasks[node.id] = {
          ...node,
          manualOrder: orderIndex,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        ...state,
        tasks: nextTasks,
        sortBy: 'MANUAL',
        lastKeyPressed: keyName,
        statusMessage: `REORDERED [${keyName}] Moved "${target.title}" ${action.direction} to slot #${swapIdx + 1}/${reordered.length}`,
      };
    }

    case 'SET_SORT_BY': {
      return {
        ...state,
        sortBy: action.sortBy,
        statusMessage: `SORT ENGINE -> Ordered by ${action.sortBy}`,
      };
    }

    case 'SET_STATUS_FILTER': {
      const tempState = {
        ...state,
        statusFilter: action.statusFilter,
        statusMessage: `STATUS FILTER -> ${action.statusFilter}`,
      };
      const { rows } = selectVisibleTaskRows(tempState);
      return {
        ...tempState,
        selectedTaskId: rows[0]?.task.id ?? state.selectedTaskId,
      };
    }

    case 'SET_FILTER_QUERY': {
      const tempState = {
        ...state,
        filterQuery: action.query,
      };
      const { rows } = selectVisibleTaskRows(tempState);
      return {
        ...tempState,
        selectedTaskId: rows[0]?.task.id ?? state.selectedTaskId,
      };
    }

    case 'SET_REGEX_QUERY': {
      const tempState = {
        ...state,
        regexQuery: action.query,
      };
      const { rows } = selectVisibleTaskRows(tempState);
      return {
        ...tempState,
        selectedTaskId: rows[0]?.task.id ?? state.selectedTaskId,
      };
    }

    case 'APPEND_CLI_LOG': {
      return {
        ...state,
        cliLogs: appendLog(state, action.entry),
      };
    }

    case 'EXECUTE_CLI_COMMAND': {
      const raw = action.rawCommand.trim();
      if (!raw) return state;

      const activeProj = state.projects.find((p) => p.id === state.selectedProjectId);
      const cleaned = raw.replace(/^yxb\s+/i, '').trim();
      const lower = cleaned.toLowerCase();

      const withCmdLog = appendLog(state, {
        type: 'COMMAND',
        scope: state.cliScope,
        projectCode: activeProj?.code,
        command: raw,
        summary: `yxb (${state.cliScope === 'LOCAL' ? activeProj?.code : 'GLOBAL'}) > ${raw}`,
        accent: true,
      });

      if (lower === 'clear' || lower === '/clear') {
        return {
          ...state,
          cliLogs: [
            {
              id: `log-${Date.now()}`,
              timestamp: nowTimeStr(),
              type: 'SYSTEM',
              scope: state.cliScope,
              summary: 'YXB // CMD stream buffer cleared.',
            },
          ],
          statusMessage: 'CLI stream buffer cleared',
        };
      }

      if (
        lower === '-?' ||
        lower === '?' ||
        lower === '/?' ||
        lower === '-help' ||
        lower === '--help' ||
        lower === '-h' ||
        lower === 'help' ||
        lower === '/help'
      ) {
        const manualVisual = [
          '╔══════════════════════════════════════════════════════════════════════════════════════════╗',
          '║  ◈ YXB // CMD — GLOBAL & LOCAL SCOPED AGENT COMMAND CENTER (v3.2 VISUAL MANUAL)          ║',
          '║  Triggers:  yxb -?   │   yxb -help   │   yxb --help   │   -?   │   -help                 ║',
          '╚══════════════════════════════════════════════════════════════════════════════════════════╝',
          '',
          '┌── 01. SYSTEM ARCHITECTURE & 3-PANEL TOPOLOGY ────────────────────────────────────────────┐',
          '│                                                                                          │',
          '│  ┌──────────────────────┐    ┌───────────────────────────┐    ┌────────────────────────┐ │',
          '│  │ 01. WORKSPACE TREE   │◄──►│ 02. SCHEDULE / CLI STREAM │◄──►│ 03. TASK COMPOSER +    │ │',
          '│  │ • 11 GitHub Repos    │    │ • L0..L3 Hierarchy Engine │    │     SUBTASK INSPECTOR  │ │',
          '│  │ • Category Filters   │    │ • Scoped Interactive REPL │    │ • Root/Subtask Builder │ │',
          '│  │ • [p] Mega-Dropdown  │    │ • Regex & Priority Engine │    │ • 1-Click Status/Prio  │ │',
          '│  └──────────────────────┘    └─────────────▲─────────────┘    └───────────▲────────────┘ │',
          '│                                            │                              │              │',
          '│       ~/.local/bin/yxb (CWD Auto-Detect) ──┴──► <repo>/TASKS.md ◄─────────┘              │',
          '│       GitHub REST API (claw-h/dashboard) ◄────► Bidirectional Phone & Desktop Sync       │',
          '└──────────────────────────────────────────────────────────────────────────────────────────┘',
          '',
          '┌── 02. SCOPED CLI COMMANDS (TERMINAL `yxb <cmd>` & WEB REPL) ─────────────────────────────┐',
          '│  HELP & DIAGNOSTICS                                                                      │',
          '│    -?  |  -help  |  --help        Display this visual architecture & command manual      │',
          '│    status  |  tree                Print L0->L1->L2->L3 task tree for current repo scope  │',
          '│    status -g  |  list             Global telemetry & progress table across all 11 repos  │',
          '│    cd <repo-code>                 Switch active local repository scope (e.g. cd portyxb) │',
          '│                                                                                          │',
          '│  HIERARCHICAL TASK MUTATION (L0 ROOT -> L1 -> L2 -> L3 SUBTASKS)                         │',
          '│    add "<title>"                  Create new L0 Root Task in active project              │',
          '│    sub <task-id> "<title>"        Spawn nested child subtask (L1..L3) under <task-id>    │',
          '│    done <task-id>                 Mark task as COMPLETED [✓]                             │',
          '│    start <task-id>                Mark task as IN_PROGRESS [~]                           │',
          '│    block <task-id>                Mark task as BLOCKED [!]                               │',
          '│    log "<summary>"                Append agent telemetry entry to CLI Stream             │',
          '│                                                                                          │',
          '│  BIDIRECTIONAL FILESYSTEM & PHONE CLOUD SYNC                                             │',
          '│    sync                           Regenerate TASKS.md across all 11 local repositories   │',
          '│    protocol                       Open Global & Local Agent Protocol modal ([g])         │',
          '│    clear                          Clear CLI stream buffer (or press Ctrl+L)              │',
          '└──────────────────────────────────────────────────────────────────────────────────────────┘',
          '',
          '┌── 03. PANEL 03 UNIFIED TASK & SUBTASK COMPOSER + LIVE INSPECTOR ─────────────────────────┐',
          '│  • Press [a] anywhere to focus the Panel 03 Unified Composer without blocking popups.    │',
          '│  • Toggle between [+ ROOT TASK (L0)] and [↳ SUBTASK OF SELECTED (L1..L3)] in 1 click.    │',
          '│  • Click [+ Sub] on any row in the Subtask Tree Builder to attach deeper nested child    │',
          '│    nodes up to L3, or click status/priority badges in Panel 03 to mutate immediately.    │',
          '└──────────────────────────────────────────────────────────────────────────────────────────┘',
          '',
          '┌── 04. SCHOLARLY & VIM-INSPIRED KEYBINDING MATRIX ────────────────────────────────────────┐',
          '│  NAVIGATION & FOCUS                       TASK & WORKSPACE ACTIONS                       │',
          '│    [j] / [k]   Move cursor Down / Up        [a]       Focus Panel 03 Task/Subtask Add    │',
          '│    [h]         Focus / Collapse Panel 01    [Space]   Cycle Status (TODO->PROG->DONE)    │',
          '│    [l]         Focus / Expand Panel 03      [e]       Focus Panel 03 Inline Title Edit   │',
          '│    [Tab]       Cycle Panel 01 -> 02 -> 03   [d]       Delete selected task & subtree     │',
          '│    [t] / [c]   Schedule Mode / CLI Mode     [m]       Toggle Milestone ◆ flag            │',
          '│    [i] / [/]   Quick Filter / Regex Search  [J] / [K] Reorder task priority Down / Up    │',
          '│    [p]         Browse 11 Projects Menu      [s] / [g] Cloud Sync Modal / Agent Protocol  │',
          '└──────────────────────────────────────────────────────────────────────────────────────────┘',
          '',
          '┌── 05. SIGNATURE VISUAL TELEMETRY (DIAMOND BEZIER PRELOADER & ~30S PULSE) ────────────────┐',
          '│  • Boot Preloader : Interpolated cubic-bezier(0.22, 1, 0.36, 1) diamond fade-in/out.     │',
          '│  • Header Emblem  : ◈ next to YXB // CMD triggers a randomized ~24s-36s incremental      │',
          '│                     multi-wave glow + scale pulse (or click ◈ anytime to test pulse).    │',
          '└──────────────────────────────────────────────────────────────────────────────────────────┘',
        ].join('\n');

        return {
          ...state,
          cliLogs: [
            ...withCmdLog,
            {
              id: `log-${Date.now()}-h`,
              timestamp: nowTimeStr(),
              type: 'TOOL_CALL',
              scope: state.cliScope,
              projectCode: activeProj?.code,
              toolName: 'YxbVisualManual (-?)',
              summary:
                'YXB // CMD — Comprehensive Visual Manual & Architecture Reference (-? / -help)',
              detail: manualVisual,
              accent: true,
            },
          ],
          statusMessage: 'Displayed YXB // CMD Comprehensive Visual Manual (-? / -help)',
        };
      }

      if (lower === 'protocol' || lower === '/protocol') {
        return {
          ...state,
          agentProtocolOpen: true,
          cliLogs: [
            ...withCmdLog,
            {
              id: `log-${Date.now()}-proto`,
              timestamp: nowTimeStr(),
              type: 'SYSTEM',
              scope: state.cliScope,
              projectCode: activeProj?.code,
              summary: 'Opened Global & Local Agent Initialization Protocol modal ([g]).',
            },
          ],
        };
      }

      if (lower === 'sync' || lower === '/sync') {
        return {
          ...state,
          cloudSyncOpen: true,
          cliLogs: [
            ...withCmdLog,
            {
              id: `log-${Date.now()}-sync`,
              timestamp: nowTimeStr(),
              type: 'TOOL_CALL',
              scope: 'GLOBAL',
              toolName: 'BidirectionalSync',
              summary:
                'Opened Cloud & Phone GitHub Sync inspector ([s]). Terminal `yxb sync` also writes TASKS.md to all 11 repos.',
            },
          ],
        };
      }

      if (lower.startsWith('cd ') || lower.startsWith('/cd ')) {
        const targetQuery = cleaned.replace(/^\/?cd\s+/i, '').trim().toLowerCase();
        const found = state.projects.find(
          (p) =>
            p.code.toLowerCase() === targetQuery ||
            p.id.toLowerCase() === targetQuery ||
            p.name.toLowerCase().includes(targetQuery) ||
            p.localPath.toLowerCase().includes(targetQuery)
        );
        if (found) {
          const switched = scheduleReducer(
            { ...state, cliLogs: withCmdLog },
            { type: 'SELECT_PROJECT_CATEGORY', projectId: found.id, categoryId: 'ALL' }
          );
          return {
            ...switched,
            cliLogs: appendLog(switched, {
              type: 'SYSTEM',
              scope: 'LOCAL',
              projectCode: found.code,
              summary: `Switched local CWD scope to ${found.code} (${found.localPath})`,
              detail: `git branch: ${found.gitBranch ?? 'main'} | last commit: "${found.lastCommit ?? 'n/a'}"`,
            }),
          };
        }
      }

      if (lower === 'status' || lower === '/status' || lower === 'tree' || lower === '/tree' || lower === 'status -g') {
        const isGlobal = state.cliScope === 'GLOBAL' || lower.includes('-g');
        if (isGlobal) {
          const summaryLines = state.projects
            .map((p) => {
              const pTasks = Object.values(state.tasks).filter((t) => t.projectId === p.id);
              const done = pTasks.filter((t) => t.status === 'COMPLETED').length;
              const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
              return `◈ ${p.code.padEnd(9, ' ')} │ ${String(pct).padStart(3, ' ')}% (${done}/${pTasks.length}) │ ⎇ ${p.gitBranch ?? 'main'} │ ${p.localPath}`;
            })
            .join('\n');
          return {
            ...state,
            cliLogs: [
              ...withCmdLog,
              {
                id: `log-${Date.now()}-st`,
                timestamp: nowTimeStr(),
                type: 'TOOL_CALL',
                scope: 'GLOBAL',
                toolName: 'GlobalWorkspaceStatus',
                summary: `GLOBAL WORKSPACE AUDIT (${state.projects.length} repositories in ~/Documents/Github):`,
                detail: summaryLines,
              },
            ],
          };
        }

        const pTasks = Object.values(state.tasks)
          .filter((t) => t.projectId === state.selectedProjectId)
          .sort((a, b) => compareTasks(a, b, state.sortBy));
        const done = pTasks.filter((t) => t.status === 'COMPLETED').length;

        const lines: string[] = [];
        const walk = (parentId: string | null, prefix: string) => {
          const kids = pTasks.filter((t) => t.parentId === parentId);
          kids.forEach((node, idx) => {
            const isLast = idx === kids.length - 1;
            const branch = isLast ? '└─' : '├─';
            const glyph =
              node.status === 'COMPLETED'
                ? '[✓]'
                : node.status === 'IN_PROGRESS'
                ? '[~]'
                : node.status === 'BLOCKED'
                ? '[!]'
                : '[ ]';
            const ms = node.isMilestone ? ' ◆' : '';
            lines.push(
              `${prefix}${branch} ${glyph} [L${node.depth}] ${node.id} :: ${node.title} (${node.priority})${ms}`
            );
            walk(node.id, prefix + (isLast ? '   ' : '│  '));
          });
        };
        walk(null, '');

        return {
          ...state,
          cliLogs: [
            ...withCmdLog,
            {
              id: `log-${Date.now()}-loc`,
              timestamp: nowTimeStr(),
              type: 'TOOL_CALL',
              scope: 'LOCAL',
              projectCode: activeProj?.code,
              toolName: 'LocalRepoStatus',
              summary: `LOCAL SCOPE [${activeProj?.code}] ${activeProj?.localPath} — ${done}/${pTasks.length} completed | ⎇ ${activeProj?.gitBranch ?? 'main'}`,
              detail: lines.join('\n'),
            },
          ],
        };
      }

      if (lower.startsWith('add ') || lower.startsWith('/add ')) {
        const title = cleaned.replace(/^\/?add\s+/i, '').trim();
        if (title) {
          return scheduleReducer(
            { ...state, cliLogs: withCmdLog },
            {
              type: 'ADD_TASK_PANEL3',
              title,
              priority: 'HIGH',
              dueDate: '2026-11-10',
              mode: 'ROOT',
            }
          );
        }
      }

      if (lower.startsWith('sub ') || lower.startsWith('/sub ')) {
        const parts = cleaned.replace(/^\/?sub\s+/i, '').trim().split(/\s+/);
        const parentId = parts[0];
        const title = parts.slice(1).join(' ');
        if (parentId && title && state.tasks[parentId]) {
          return scheduleReducer(
            { ...state, cliLogs: withCmdLog },
            {
              type: 'ADD_TASK_PANEL3',
              title,
              priority: 'HIGH',
              dueDate: state.tasks[parentId].dueDate,
              mode: 'SUBTASK',
              targetParentId: parentId,
            }
          );
        }
      }

      if (lower.startsWith('done ') || lower.startsWith('/done ')) {
        const taskId = cleaned.replace(/^\/?done\s+/i, '').trim();
        if (state.tasks[taskId]) {
          return scheduleReducer(
            { ...state, cliLogs: withCmdLog },
            { type: 'SET_TASK_STATUS', taskId, status: 'COMPLETED' }
          );
        }
      }

      if (lower.startsWith('start ') || lower.startsWith('/start ')) {
        const taskId = cleaned.replace(/^\/?start\s+/i, '').trim();
        if (state.tasks[taskId]) {
          return scheduleReducer(
            { ...state, cliLogs: withCmdLog },
            { type: 'SET_TASK_STATUS', taskId, status: 'IN_PROGRESS' }
          );
        }
      }

      if (lower.startsWith('block ') || lower.startsWith('/block ')) {
        const taskId = cleaned.replace(/^\/?block\s+/i, '').trim();
        if (state.tasks[taskId]) {
          return scheduleReducer(
            { ...state, cliLogs: withCmdLog },
            { type: 'SET_TASK_STATUS', taskId, status: 'BLOCKED' }
          );
        }
      }

      return {
        ...state,
        cliLogs: [
          ...withCmdLog,
          {
            id: `log-${Date.now()}-r`,
            timestamp: nowTimeStr(),
            type: 'SYSTEM',
            scope: state.cliScope,
            projectCode: activeProj?.code,
            summary: `Executed "${raw}" in ${state.cliScope} scope. Type -? or -help for the full visual manual.`,
          },
        ],
      };
    }

    case 'RESET_SEED_DATA': {
      return createInitialSeedState();
    }

    case 'SYNC_FROM_STORAGE': {
      return action.state;
    }

    default:
      return state;
  }
}
