import type { Project, Folder, Script, Note, ApiError, FolderItem } from '@/types/testpad';

const BASE_URL = '/testpad-proxy/api/v1';

class TestpadApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('testpad_api_key', key);
  }

  getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('testpad_api_key');
    }
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('testpad_api_key');
  }

  isConnected(): boolean {
    return !!this.getApiKey();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const key = this.getApiKey();
    if (!key) {
      throw { status: 401, message: 'No API key configured' } as ApiError;
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        mode: 'cors',
        headers: {
          'Authorization': `apikey ${key}`,
          'X-API-Key': key,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 401) {
        throw { status: 401, message: 'Invalid API key' } as ApiError;
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw { status: 429, message: 'Rate limit exceeded', retryAfter } as ApiError;
      }

      if (!response.ok) {
        throw { status: response.status, message: `API error: ${response.statusText}` } as ApiError;
      }

      return response.json();
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      throw { status: 0, message: 'Network error. Please check your connection.' } as ApiError;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.getProjects();
      return true;
    } catch {
      return false;
    }
  }

  async getProjects(): Promise<Project[]> {
    const resp = await this.request<Project[] | { projects: Project[] }>('/projects');
    if (Array.isArray(resp)) return resp;
    if (resp && Array.isArray(resp.projects)) return resp.projects;
    throw { status: 500, message: 'Unexpected response for projects' } as ApiError;
  }

  async getProject(projectId: number): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  async getFolders(projectId: number, params?: Record<string, string>): Promise<Folder> {
    const query = new URLSearchParams({
      subfolders: 'all',
      scripts: 'terse',
      tests: 'none',
      fields: 'none',
      runs: 'full',      // Changed from 'none' to 'full' to get run data
      results: 'none',
      progress: 'full',
      ...(params || {}),
    }).toString();
    const resp = await this.request<{ folder?: Folder; folders?: FolderItem[] }>(`/projects/${projectId}/folders?${query}`);
    if (resp && resp.folder && resp.folder.contents) return resp.folder;
    if (resp && Array.isArray(resp.folders)) {
      return { id: 'root', name: '/', type: 'folder', contents: resp.folders };
    }
    throw { status: 500, message: 'Unexpected response for folders' } as ApiError;
  }

  async getFolder(projectId: number, folderId: string, params?: Record<string, string>): Promise<Folder> {
    const query = new URLSearchParams({
      subfolders: 'all',
      scripts: 'terse',
      tests: 'none',
      fields: 'none',
      runs: 'terse', // Changed from 'none' to get Assignee/Status data
      results: 'none',
      progress: 'full',
      ...(params || {}),
    }).toString();
    const resp = await this.request<{ folder: Folder }>(`/projects/${projectId}/folders/${folderId}?${query}`);
    if (resp && resp.folder && resp.folder.contents) return resp.folder;
    throw { status: 500, message: 'Unexpected response for folder' } as ApiError;
  }

  async getScript(scriptId: number): Promise<Script> {
    const query = new URLSearchParams({
      runs: 'full',
      tests: 'full', // Also getting tests to show names correctly
    }).toString();
    const resp = await this.request<{ script: Script } | Script>(`/scripts/${scriptId}?${query}`);
    if ('script' in resp) {
      return (resp as { script: Script }).script;
    }
    return resp as Script;
  }

  async createRun(scriptId: number, payload: Record<string, unknown>): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/scripts/${scriptId}/runs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getNotes(projectId: number): Promise<Note[]> {
    return this.request<Note[]>(`/projects/${projectId}/notes`);
  }

  async getFolderNotes(projectId: number, folderId: string): Promise<Note[]> {
    return this.request<Note[]>(`/projects/${projectId}/folders/${folderId}/notes`);
  }

  // ========== FOLDER CREATION ==========

  async createFolder(
    projectId: number,
    name: string,
    parentFolderId?: string,
    description?: string
  ): Promise<{ id: string }> {
    const endpoint = parentFolderId
      ? `/projects/${projectId}/folders/${parentFolderId}/folders`
      : `/projects/${projectId}/folders`;

    return this.request<{ id: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  // ========== SCRIPT CREATION ==========

  async createScript(
    projectId: number,
    folderId: string,
    scriptData: {
      name: string;
      description?: string;
      tests?: Array<{ text?: string; name?: string; indent: number }>;
      fields?: string[] | Array<{ name: string; type?: string }>;
      runs?: Array<{
        id?: number;
        headers?: Record<string, string>;
        results?: Record<string, unknown>;
        completed?: boolean | 'auto';
      }>;
    }
  ): Promise<{ id: number } | { script: { id: number } } | { data: { id: number } }> {
    return this.request<{ id: number } | { script: { id: number } } | { data: { id: number } }>(
      `/projects/${projectId}/folders/${folderId}/scripts`,
      {
        method: 'POST',
        body: JSON.stringify(scriptData),
      }
    );
  }

  // ========== NOTES MANAGEMENT ==========

  async createNote(
    projectId: number,
    content: string,
    folderId?: string
  ): Promise<{ id: string }> {
    const endpoint = folderId
      ? `/projects/${projectId}/folders/${folderId}/notes`
      : `/projects/${projectId}/notes`;

    return this.request<{ id: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updateNote(
    projectId: number,
    noteId: string,
    content: string
  ): Promise<Note> {
    return this.request<Note>(`/projects/${projectId}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  // ========== FOLDER DUPLICATION ==========

  /**
   * Helper to add delay between API calls to avoid rate limiting
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry logic with exponential backoff for rate limiting
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;

        const err = error as ApiError;
        if (err.status === 429) {
          const retryAfter = err.retryAfter || baseDelay * Math.pow(2, i);
          console.log(`Rate limited, retrying after ${retryAfter}ms...`);
          await this.delay(retryAfter);
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Duplicate a folder with all its scripts and create new runs
   * This is a multi-step process that orchestrates:
   * 1. Fetch source folder with full details
   * 2. Create new folder
   * 3. For each script, create new script in new folder
   * 4. For each new script, create a run assigned to tester
   */
  async duplicateFolder(
    projectId: number,
    sourceFolderId: string,
    newFolderName: string,
    assignedTesters: string | string[],
    buildInfo?: { build?: string; browser?: string },
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<{
    success: boolean;
    newFolderId?: string;
    errors: Array<{ step: string; error: string }>;
    createdScripts: number;
    createdRuns: number;
  }> {
    const errors: Array<{ step: string; error: string }> = [];
    let newFolderId: string | undefined;
    let createdScripts = 0;
    let createdRuns = 0;

    try {
      // Step 1: Fetch source folder (structure only)
      onProgress?.(1, 4, 'Fetching source folder...');

      const sourceFolder = await this.retryWithBackoff(() =>
        this.getFolder(projectId, sourceFolderId, {
          subfolders: 'all',
          scripts: 'terse',
          tests: 'none',
          fields: 'none',
          runs: 'none',
        })
      );

      // Extract all scripts from the folder (including nested folders)
      const scripts = this.extractScriptsFromFolder(sourceFolder);

      if (scripts.length === 0) {
        return {
          success: false,
          errors: [{ step: 'validation', error: 'Source folder contains no scripts' }],
          createdScripts: 0,
          createdRuns: 0,
        };
      }

      // Step 2: Create new folder
      onProgress?.(2, 4, 'Creating new folder...');

      const newFolder = await this.retryWithBackoff(() =>
        this.createFolder(projectId, newFolderName)
      );
      // Try common response shapes
      const nf = newFolder as unknown as { id?: string; folder?: { id?: string }; data?: { id?: string } };
      newFolderId = nf.id || nf.folder?.id || nf.data?.id;

      if (!newFolderId) {
        // Fallback: fetch top-level folders and locate by name
        const top = await this.retryWithBackoff(() =>
          this.getFolders(projectId, {
            subfolders: 'none',
            scripts: 'none',
            tests: 'none',
            fields: 'none',
            runs: 'none',
            results: 'none',
            progress: 'none',
          })
        );
        const match = (top.contents || []).find(i => i.type === 'folder' && i.name === newFolderName);
        if (match) {
          newFolderId = String(match.id);
        } else {
          throw new Error('Failed to retrieve new folder ID from API response');
        }
      }

      // Add throttling delay to avoid rate limiting
      await this.delay(500);

      // Step 3: Duplicate scripts (and include initial runs)
      onProgress?.(3, 4, `Duplicating ${scripts.length} scripts...`);

      const scriptMapping: Array<{ originalId: number; newId: number }> = [];

      const testersPool = Array.isArray(assignedTesters)
        ? assignedTesters.filter(t => !!t)
        : [assignedTesters].filter(t => !!t);
      const shuffled = [...testersPool].sort(() => Math.random() - 0.5);

      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];

        try {
          onProgress?.(
            3,
            4,
            `Duplicating script ${i + 1} of ${scripts.length}: ${script.name}`
          );

          // Fetch full script details to ensure we get all tests and fields
          // getFolder often returns incomplete script data
          const fullScript = await this.retryWithBackoff(() => 
            this.getScript(Number(script.id))
          );
          
          await this.delay(200); // Slight delay after read

          // Sanitize tests and fields to remove IDs and other read-only properties
          // Only include 'text' (or 'name') and 'indent' for tests
          const testsPayload = fullScript.tests?.map(t => ({
            text: t.text || t.name, // Prefer 'text' as per OpenAPI, fallback to 'name'
            indent: t.indent
          }));

          // Sanitize fields: filter out system fields and map to simple strings (names)
          // The API creation endpoint typically expects a list of field names/labels as strings
          const fieldsPayload = fullScript.fields
            ?.filter(f => !f.id.startsWith('_')) // Exclude system fields like _run, _tester
            .map(f => f.label);

          const assigned = shuffled.length > 0 ? shuffled[i % shuffled.length] : '';

          const newScriptResp = await this.retryWithBackoff(() =>
            this.createScript(projectId, newFolderId!, {
              name: fullScript.name,
              description: fullScript.description,
              tests: testsPayload,
              fields: fieldsPayload,
              runs: [{
                headers: {
                  _tester: assigned,
                  ...(buildInfo?.build && { build: buildInfo.build }),
                  ...(buildInfo?.browser && { browser: buildInfo.browser }),
                },
                results: {},
              }],
            })
          );
          
          const newScriptParsed = newScriptResp as { id?: number; script?: { id?: number }; data?: { id?: number } };
          const newScriptId = newScriptParsed.id ?? newScriptParsed.script?.id ?? newScriptParsed.data?.id;
          
          if (!newScriptId) {
            throw new Error(`Created script but could not find ID in response for ${script.name}`);
          }

          scriptMapping.push({ originalId: Number(script.id), newId: Number(newScriptId) });
          createdScripts++;
          createdRuns++;

          // Throttle to avoid rate limiting
          await this.delay(300);
        } catch (error: unknown) {
          errors.push({
            step: `create_script_${script.name}`,
            error: (error as Error).message || 'Failed to create script',
          });
        }
      }

      onProgress?.(4, 4, `Created ${createdRuns} runs with scripts`);

      return {
        success: errors.length === 0,
        newFolderId,
        errors,
        createdScripts,
        createdRuns,
      };
    } catch (error: unknown) {
      errors.push({
        step: 'duplication',
        error: (error as Error).message || 'Failed to duplicate folder',
      });

      return {
        success: false,
        newFolderId,
        errors,
        createdScripts,
        createdRuns,
      };
    }
  }

  /**
   * Extract all scripts from a folder recursively
   */
  private extractScriptsFromFolder(folder: Folder): FolderItem[] {
    const scripts: FolderItem[] = [];

    const traverse = (items: FolderItem[]) => {
      for (const item of items) {
        if (item.type === 'script') {
          scripts.push(item);
        } else if (item.contents) {
          traverse(item.contents);
        }
      }
    };

    if (folder.contents) {
      traverse(folder.contents);
    }

    return scripts;
  }

  // Helper to extract all script IDs from folder structure
  extractScriptIds(folder: Folder): number[] {
    const scriptIds: number[] = [];

    const traverse = (items: FolderItem[]) => {
      for (const item of items) {
        if (item.type === 'script') {
          scriptIds.push(Number(item.id));
        } else if (item.contents) {
          traverse(item.contents);
        }
      }
    };

    if (folder.contents) {
      traverse(folder.contents);
    }

    return scriptIds;
  }
}

export const testpadApi = new TestpadApiClient();
