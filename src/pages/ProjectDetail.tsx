import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { testpadApi } from '@/lib/testpad-api';
import type { Project, Folder as FolderType, FolderItem, ApiError } from '@/types/testpad';
import { cn } from '@/lib/utils';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<FolderType | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [flatView, setFlatView] = useState(false);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!projectId) return;
    if (showRefreshing) setIsRefreshing(true);
    setError(null);

    try {
      const [projectData, foldersData] = await Promise.all([
        testpadApi.getProject(Number(projectId)),
        testpadApi.getFolders(Number(projectId)),
      ]);
      setProject(projectData);
      setFolders(foldersData);
    } catch (err: any) {
      if (err.status === 401) {
        testpadApi.clearApiKey();
        navigate('/');
        return;
      }
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    if (!testpadApi.isConnected()) {
      navigate('/');
      return;
    }
    fetchData();
  }, [navigate, fetchData]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getAllScripts = (items: FolderItem[]): FolderItem[] => {
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
    traverse(items);
    return scripts;
  };

  const renderFolderItem = (item: FolderItem, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(String(item.id));

    return (
      <div key={item.id}>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg p-3 transition-colors',
            isFolder ? 'hover:bg-accent cursor-pointer' : 'hover:bg-accent cursor-pointer',
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => {
            if (isFolder) {
              toggleFolder(String(item.id));
            } else {
              navigate(`/scripts/${item.id}`);
            }
          }}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Folder className="h-5 w-5 text-primary" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <FileText className="h-5 w-5 text-info" />
            </>
          )}
          <span className="flex-1 font-medium">{item.name}</span>
          {!isFolder && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
        {isFolder && isExpanded && item.contents && (
          <div>
            {item.contents.map((child) => renderFolderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <AppHeader title="Project" showBack />
        <main className="container py-6">
          <Skeleton className="h-20 mb-6" />
          <Skeleton className="h-96" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader 
        title={project?.name || 'Project'} 
        showBack 
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
      />
      
      <main className="container py-6">
        {error && (
          <ErrorBanner
            title="Failed to load project"
            message={error.message}
            onRetry={() => fetchData(true)}
            retryAfter={error.retryAfter}
            className="mb-6"
          />
        )}

        {project && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold">{project.name}</h2>
              {project.description && (
                <p className="mt-2 text-muted-foreground">{project.description}</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scripts & Folders</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFlatView(!flatView)}
          >
            {flatView ? 'Tree View' : 'Flat View'}
          </Button>
        </div>

        <Card>
          <CardContent className="p-2">
            {folders?.contents && folders.contents.length > 0 ? (
              flatView ? (
                <div className="space-y-1">
                  {getAllScripts(folders.contents).map((script) => (
                    <div
                      key={script.id}
                      className="flex items-center gap-2 rounded-lg p-3 hover:bg-accent cursor-pointer"
                      onClick={() => navigate(`/scripts/${script.id}`)}
                    >
                      <FileText className="h-5 w-5 text-info" />
                      <span className="flex-1 font-medium">{script.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {folders.contents.map((item) => renderFolderItem(item))}
                </div>
              )
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No scripts or folders in this project
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />
    </div>
  );
}
