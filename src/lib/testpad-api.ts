import type { Project, Folder, Script, Note, ApiError, FolderItem } from '@/types/testpad';

const BASE_URL = 'https://api.testpad.com/api/v1';

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
        headers: {
          'Authorization': `apikey ${key}`,
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
    return this.request<Project[]>('/projects');
  }

  async getProject(projectId: number): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  async getFolders(projectId: number): Promise<Folder> {
    return this.request<Folder>(`/projects/${projectId}/folders`);
  }

  async getFolder(projectId: number, folderId: string): Promise<Folder> {
    return this.request<Folder>(`/projects/${projectId}/folders/${folderId}`);
  }

  async getScript(scriptId: number): Promise<Script> {
    return this.request<Script>(`/scripts/${scriptId}`);
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
