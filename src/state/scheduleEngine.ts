import type {
  ActivePanel,
  Category,
  CliLogEntry,
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
  | { type: 'SET_INPUT_MODE'; mode: InputMode; keyHint?: string }
  | { type: 'TOGGLE_PROJECT_BROWSER'; open?: boolean }
  | { type: 'TOGGLE_AGENT_PROTOCOL'; open?: boolean }
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
  | { type: 'ADD_TASK_INLINE'; title: string; priority: Priority; dueDate: string; asSubtask: boolean }
  | { type: 'DELETE_SELECTED_TASK' }
  | { type: 'UPDATE_TASK_METADATA'; taskId: string; title: string; priority: Priority; status: TaskStatus; dueDate: string; estimatedMinutes: number; notes: string }
  | { type: 'CYCLE_TASK_STATUS'; taskId?: string }
  | { type: 'TOGGLE_MILESTONE'; taskId?: string }
  | { type: 'TOGGLE_TASK_EXPAND'; taskId?: string }
  | { type: 'REORDER_TASK_PRIORITY'; direction: 'UP' | 'DOWN' }
  | { type: 'SET_SORT_BY'; sortBy: SortCriterion }
  | { type: 'SET_STATUS_FILTER'; statusFilter: StatusFilter }
  | { type: 'SET_FILTER_QUERY'; query: string }
  | { type: 'SET_REGEX_QUERY'; query: string }
  | { type: 'EXECUTE_CLI_COMMAND'; rawCommand: string }
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
        return {
          ...tempState,
          selectedTaskId: rows[0]?.task.id ?? null,
        };
      }

      if (state.focusedPanel === 'RIGHT') {
        const subtree = selectTaskSubtree(state, state.selectedTaskId);
        if (subtree.length === 0) {
          return {
            ...state,
            lastKeyPressed: keyName,
            statusMessage: 'Inspector: Selected task has no nested subtasks yet (press [a] to add)',
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
          lastKeyPressed: keyName,
          statusMessage: `INSPECTOR SUBTASK [L${target.depth}] -> ${target.title}`,
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
          statusMessage: 'FOCUS -> LEFT PANEL (Project Tree & Category Filters) | Press [h] again to collapse',
        };
      }
      const collapsed = !state.leftPanelCollapsed;
      return {
        ...state,
        leftPanelCollapsed: collapsed,
        focusedPanel: collapsed ? 'CENTER' : 'LEFT',
        lastKeyPressed: 'h',
        statusMessage: collapsed
          ? 'LEFT PANEL COLLAPSED -> Focus returned to CENTER Workspace'
          : 'LEFT PANEL EXPANDED',
      };
    }

    case 'FOCUS_RIGHT_EXPAND': {
      return {
        ...state,
        rightPanelExpanded: true,
        focusedPanel: 'RIGHT',
        lastKeyPressed: 'l',
        statusMessage: 'FOCUS -> RIGHT INSPECTOR PANEL (Subtask Breakdown & Telemetry)',
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
        lastKeyPressed: action.keyHint ?? (action.mode === 'SCHEDULE' ? 't' : 'c'),
        statusMessage:
          action.mode === 'SCHEDULE'
            ? 'MODE -> SCHEDULE WORKSPACE (Hierarchical Task Architecture)'
            : 'MODE -> CLI STREAM WORKSPACE (YXB // CMD Execution & Telemetry Stream)',
        cliLogs: appendLog(state, {
          type: 'COMMAND',
          command: action.mode === 'SCHEDULE' ? ':mode schedule' : ':mode cli-stream',
          summary: `Switched center viewport to ${action.mode} mode`,
        }),
      };
    }

    case 'SET_INPUT_MODE': {
      return {
        ...state,
        inputMode: action.mode,
        projectBrowserOpen: action.mode === 'PROJECT_BROWSER' ? true : false,
        agentProtocolOpen: action.mode === 'AGENT_PROTOCOL' ? true : false,
        lastKeyPressed: action.keyHint ?? state.lastKeyPressed,
        statusMessage:
          action.mode === 'NORMAL'
            ? '-- NORMAL MODE --'
            : action.mode === 'INLINE_ADD'
            ? '-- INSERT TASK/SUBTASK -- (Enter to commit, Tab to toggle Root/Subtask, Esc to cancel)'
            : action.mode === 'INLINE_EDIT'
            ? '-- EDIT METADATA -- (Enter to save, Esc to cancel)'
            : action.mode === 'SEARCH_REGEX'
            ? '-- REGEX SEARCH (/) -- Type regular expression pattern, Enter/Esc to lock'
            : action.mode === 'FILTER_BAR'
            ? '-- FILTER BAR (i) -- Filter by keyword, priority, or status'
            : action.mode === 'PROJECT_BROWSER'
            ? '-- BROWSE PROJECT [p] -- Select any ~/Documents/Github repository or initialize a new one'
            : action.mode === 'AGENT_PROTOCOL'
            ? '-- AGENT PROTOCOL [g] -- Global Multi-Agent Sync Rules & CLI Commands'
            : '-- CLI PROMPT --',
      };
    }

    case 'TOGGLE_PROJECT_BROWSER': {
      const nextOpen = action.open ?? !state.projectBrowserOpen;
      return {
        ...state,
        projectBrowserOpen: nextOpen,
        agentProtocolOpen: false,
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
        inputMode: nextOpen ? 'AGENT_PROTOCOL' : 'NORMAL',
        lastKeyPressed: 'g',
        statusMessage: nextOpen
          ? 'AGENT CONTEXT PROTOCOL OPEN — Global rules active for all future agents'
          : '-- NORMAL MODE --',
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
        statusMessage: `SWITCHED WORKSPACE -> ${selectedProj?.localPath ?? action.projectId} (${selectedProj?.name ?? ''})`,
      };
      const { rows } = selectVisibleTaskRows(tempState);
      return {
        ...tempState,
        selectedTaskId: rows[0]?.task.id ?? null,
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
        title: `Initialize ${cleanName} architecture & register with YXB // CMD`,
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
        projectBrowserOpen: false,
        inputMode: 'NORMAL',
        statusMessage: `INITIALIZED PROJECT [${cleanCode}] at ${newProj.localPath}`,
        cliLogs: appendLog(state, {
          type: 'MUTATION',
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
        selectedRightSubtaskId: null,
        statusMessage: `Selected [L${target.depth}] ${target.title}`,
      };
    }

    case 'ADD_TASK_INLINE': {
      const cleanTitle = action.title.trim();
      if (!cleanTitle) {
        return {
          ...state,
          inputMode: 'NORMAL',
          statusMessage: 'Task creation cancelled (empty title)',
        };
      }

      const selectedTask = state.selectedTaskId ? state.tasks[state.selectedTaskId] : null;
      const defaultCat =
        state.selectedCategoryId !== 'ALL'
          ? state.selectedCategoryId
          : selectedTask?.categoryId ??
            state.categories.find((c) => c.projectId === state.selectedProjectId)?.id ??
            'cat-cmd-core';

      let parentId: string | null = null;
      let depth: 0 | 1 | 2 | 3 = 0;

      if (action.asSubtask && selectedTask && selectedTask.projectId === state.selectedProjectId) {
        if (selectedTask.depth < 3) {
          parentId = selectedTask.id;
          depth = (selectedTask.depth + 1) as 1 | 2 | 3;
        } else {
          parentId = selectedTask.parentId;
          depth = 3;
        }
      }

      const siblings = Object.values(state.tasks).filter(
        (t) =>
          t.projectId === state.selectedProjectId &&
          t.categoryId === defaultCat &&
          t.parentId === parentId
      );
      const nextOrder =
        siblings.length > 0 ? Math.max(...siblings.map((s) => s.manualOrder)) + 1 : 0;

      const newId = `task-${Date.now().toString().slice(-5)}`;
      const now = new Date().toISOString();
      const newTask: TaskNode = {
        id: newId,
        projectId: state.selectedProjectId,
        categoryId: selectedTask && action.asSubtask ? selectedTask.categoryId : defaultCat,
        parentId,
        depth,
        title: cleanTitle,
        notes: `Created via inline YXB // CMD prompt at depth L${depth}.`,
        priority: action.priority,
        status: 'QUEUED',
        dueDate: action.dueDate || '2026-11-10',
        isMilestone: false,
        estimatedMinutes: 30,
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
        selectedTaskId: newId,
        inputMode: 'NORMAL',
        lastKeyPressed: 'a',
        statusMessage: `CREATED [L${depth}] "${cleanTitle}" (${action.priority})`,
        cliLogs: appendLog(state, {
          type: 'MUTATION',
          toolName: 'CreateTaskNode',
          summary: `Added L${depth} ${depth === 0 ? 'Parent Task' : 'Subtask'} "${cleanTitle}" [${action.priority}]`,
          detail: `id: ${newId} | project: ${state.selectedProjectId} | parent: ${parentId ?? 'ROOT'}`,
          accent: true,
        }),
      };
    }

    case 'DELETE_SELECTED_TASK': {
      const targetId =
        state.focusedPanel === 'RIGHT' && state.selectedRightSubtaskId
          ? state.selectedRightSubtaskId
          : state.selectedTaskId;

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
        remainingRows[Math.min(currentRowIdx, remainingRows.length - 1)] ?? null;

      return {
        ...state,
        tasks: nextTasks,
        selectedTaskId: fallbackRow ? fallbackRow.task.id : null,
        selectedRightSubtaskId: null,
        lastKeyPressed: 'd',
        statusMessage: `DELETED "${targetTask.title}" (${toDelete.size} node${toDelete.size > 1 ? 's' : ''} removed)`,
        cliLogs: appendLog(state, {
          type: 'DIFF',
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
        statusMessage: `UPDATED "${updated.title}" -> [${updated.priority} | ${updated.status} | due ${updated.dueDate}]`,
        cliLogs: appendLog(state, {
          type: 'MUTATION',
          toolName: 'PatchTaskMetadata',
          summary: `Edited "${updated.title}" (${updated.priority}, ${updated.status})`,
          detail: `due: ${updated.dueDate} | est: ${updated.estimatedMinutes}m`,
        }),
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
          statusMessage: `Task "${target.title}" is already at the ${action.direction === 'UP' ? 'top' : 'bottom'} of its sibling priority group`,
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
        cliLogs: appendLog(state, {
          type: 'DIFF',
          toolName: 'ReorderPriority',
          summary: `[${keyName}] Shifted "${target.title}" ${action.direction.toLowerCase()} in sibling priority order (#${swapIdx + 1})`,
          accent: true,
        }),
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

    case 'EXECUTE_CLI_COMMAND': {
      const raw = action.rawCommand.trim();
      if (!raw) return state;

      const withCmdLog = appendLog(state, {
        type: 'COMMAND',
        command: raw,
        summary: `yxb > ${raw}`,
        accent: true,
      });

      const lower = raw.toLowerCase();
      if (lower === 'clear' || lower === '/clear') {
        return {
          ...state,
          cliLogs: [
            {
              id: `log-${Date.now()}`,
              timestamp: nowTimeStr(),
              type: 'SYSTEM',
              summary: 'YXB // CMD stream buffer cleared.',
            },
          ],
          statusMessage: 'CLI stream buffer cleared',
        };
      }

      if (lower === 'help' || lower === '/help') {
        return {
          ...state,
          cliLogs: [
            ...withCmdLog,
            {
              id: `log-${Date.now()}-h`,
              timestamp: nowTimeStr(),
              type: 'TOOL_CALL',
              toolName: 'HelpManual',
              summary: 'Available CLI commands: /projects, /protocol, /stats, /add <title>, /reset, /clear',
              detail: 'Global Vim Keybindings: [p] Browse Projects | [g] Agent Protocol | [j/k] Nav | [h/l] Panels | [J/K] Priority | [a/d/e] CRUD | [m] Milestone | [/] Regex | [t/c] Mode',
            },
          ],
        };
      }

      if (lower === 'projects' || lower === '/projects') {
        return {
          ...state,
          cliLogs: [
            ...withCmdLog,
            {
              id: `log-${Date.now()}-p`,
              timestamp: nowTimeStr(),
              type: 'TOOL_CALL',
              toolName: 'ListWorkspaceRepos',
              summary: `${state.projects.length} repositories registered in ~/Documents/Github:`,
              detail: state.projects.map((p) => `${p.code} (${p.localPath})`).join(' | '),
            },
          ],
        };
      }

      if (lower === 'protocol' || lower === '/protocol') {
        return {
          ...state,
          agentProtocolOpen: true,
          inputMode: 'AGENT_PROTOCOL',
          cliLogs: withCmdLog,
        };
      }

      if (lower === 'stats' || lower === '/stats') {
        const all = Object.values(state.tasks);
        const done = all.filter((t) => t.status === 'COMPLETED').length;
        const inProg = all.filter((t) => t.status === 'IN_PROGRESS').length;
        const blocked = all.filter((t) => t.status === 'BLOCKED').length;
        const milestones = all.filter((t) => t.isMilestone).length;
        return {
          ...state,
          cliLogs: [
            ...withCmdLog,
            {
              id: `log-${Date.now()}-s`,
              timestamp: nowTimeStr(),
              type: 'TOOL_CALL',
              toolName: 'TelemetryAudit',
              summary: `Repos: ${state.projects.length} | Total Tasks: ${all.length} | Completed: ${done} | In-Progress: ${inProg} | Blocked: ${blocked} | Milestones: ${milestones}`,
              detail: `Active Project: ${state.selectedProjectId} | Active Sort: ${state.sortBy}`,
            },
          ],
        };
      }

      if (lower.startsWith('/add ') || lower.startsWith('add ')) {
        const title = raw.replace(/^\/?add\s+/i, '').trim();
        if (title) {
          return scheduleReducer(
            { ...state, cliLogs: withCmdLog },
            {
              type: 'ADD_TASK_INLINE',
              title,
              priority: 'HIGH',
              dueDate: '2026-11-08',
              asSubtask: false,
            }
          );
        }
      }

      if (lower === '/reset' || lower === 'reset') {
        return createInitialSeedState();
      }

      return {
        ...state,
        cliLogs: [
          ...withCmdLog,
          {
            id: `log-${Date.now()}-r`,
            timestamp: nowTimeStr(),
            type: 'SYSTEM',
            summary: `Executed instruction "${raw}" — 0 errors. Type /help or /projects for built-in YXB // CMD commands.`,
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
