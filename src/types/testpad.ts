export interface Project {
  id: number;
  name: string;
  description: string;
  created: string;
}

export interface FolderItem {
  id: string | number;
  name: string;
  type: 'folder' | 'script';
  contents?: FolderItem[];
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
  indent: number;
}

export interface Run {
  id: string;
  tester?: string;
  created?: string;
  headers: Record<string, string>;
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
  tests: Test[];
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
