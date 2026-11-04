export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskStatus = 'IN_PROGRESS' | 'QUEUED' | 'BLOCKED' | 'COMPLETED';

export type SortCriterion = 'MANUAL' | 'PRIORITY' | 'DUE_DATE' | 'STATUS';

export type ActivePanel = 'LEFT' | 'CENTER' | 'RIGHT';

export type WorkspaceMode = 'SCHEDULE' | 'CLI_STREAM';

export type ProjectLifecycle = 'PRODUCTION' | 'ACTIVE' | 'INCUBATING' | 'ARCHIVED';

export type InputMode =
  | 'NORMAL'
  | 'INLINE_ADD'
  | 'INLINE_EDIT'
  | 'SEARCH_REGEX'
  | 'FILTER_BAR'
  | 'CLI_INPUT'
  | 'PROJECT_BROWSER'
  | 'AGENT_PROTOCOL';

export type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'MILESTONES';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  localPath: string;
  repoUrl?: string;
  stack: string[];
  lifecycle: ProjectLifecycle;
  lastAgentSync?: string;
  order: number;
  expanded: boolean;
}

export interface Category {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  order: number;
}

/**
 * Hierarchical task node supporting up to 3 levels of nested subtasks:
 * depth 0 = Parent Task inside a Category
 * depth 1 = Subtask Level 1
 * depth 2 = Subtask Level 2
 * depth 3 = Subtask Level 3 (max depth)
 */
export interface TaskNode {
  id: string;
  projectId: string;
  categoryId: string;
  parentId: string | null;
  depth: 0 | 1 | 2 | 3;
  title: string;
  notes: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  isMilestone: boolean;
  estimatedMinutes: number;
  manualOrder: number;
  expanded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CliLogEntry {
  id: string;
  timestamp: string;
  type: 'SYSTEM' | 'COMMAND' | 'MUTATION' | 'TOOL_CALL' | 'DIFF';
  command?: string;
  toolName?: string;
  summary: string;
  detail?: string;
  accent?: boolean;
}

export interface WorkspaceRegistryPayload {
  schemaVersion: number;
  updatedAt: string;
  projects: Project[];
  categories: Category[];
  tasks: TaskNode[];
  cliLogs: CliLogEntry[];
}

export interface ScheduleState {
  projects: Project[];
  categories: Category[];
  tasks: Record<string, TaskNode>;
  selectedProjectId: string;
  selectedCategoryId: string | 'ALL';
  selectedTaskId: string | null;
  selectedLeftIndex: number;
  selectedRightSubtaskId: string | null;
  activeMode: WorkspaceMode;
  focusedPanel: ActivePanel;
  inputMode: InputMode;
  projectBrowserOpen: boolean;
  agentProtocolOpen: boolean;
  leftPanelCollapsed: boolean;
  rightPanelExpanded: boolean;
  sortBy: SortCriterion;
  statusFilter: StatusFilter;
  filterQuery: string;
  regexQuery: string;
  lastKeyPressed: string;
  statusMessage: string;
  cliLogs: CliLogEntry[];
}

export interface VisibleTaskRow {
  task: TaskNode;
  hasChildren: boolean;
  childCount: number;
  completedChildCount: number;
  isLastSibling: boolean;
  ancestorLines: boolean[];
}
