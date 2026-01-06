export interface Project {
  id: number;
  name: string;
  description: string;
  created: string;
}

export interface FolderItem {
  id: string | number;
  name: string;
  type: 'folder' | 'script' | 'note';
  contents?: FolderItem[];
  progress?: Progress;
  runs?: Run[];  // Added to support run data from folder API
}

export interface Folder {
  id: string;
  name: string;
  type: 'folder';
  contents: FolderItem[];
}

export interface Test {
  id: string;
  name: string;
  text?: string; // API often uses 'text' instead of 'name'
  indent: number;
}

export interface Run {
  id: string;
  created?: string;
  state?: 'new' | 'started' | 'complete';
  label?: string;
  tester?: string; // Deprecated, use assignee.name instead
  headers: Record<string, string>;
  assignee?: {
    id: string | number;
    name: string;
    email: string;
  };
  results: Record<string, Result>;
  progress: Progress;
}

export interface Result {
  result: 'pass' | 'fail' | 'block' | 'query' | 'pending' | '';
  comment?: string;
  issue?: string;
}

export interface Progress {
  total: number;
  pass: number;
  fail: number;
  block: number;
  query: number;
  pending?: number;
  summary: string;
}

export interface Script {
  id: number;
  name: string;
  description?: string;
  tests: Test[];
  fields?: Array<{ id: string; label: string; show: boolean }>;
  runs: Run[];
  progress: Progress;
}

export interface Note {
  id: string;
  content: string;
  created: string;
}

export interface ApiError {
  status: number;
  message: string;
  retryAfter?: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalScripts: number;
  totalRuns: number;
  totalTests: number;
  progress: Progress;
}
