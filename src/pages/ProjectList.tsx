import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Calendar, FileText, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { testpadApi } from '@/lib/testpad-api';
import type { Project, Progress, ApiError } from '@/types/testpad';

interface ProjectWithMeta extends Project {
  scriptCount?: number;
  progress?: Progress;
}

export default function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchProjects = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError(null);

    try {
      const projectList = await testpadApi.getProjects();
      
      // Fetch additional data for each project
      const projectsWithMeta = await Promise.all(
        projectList.map(async (project) => {
          try {
            const folders = await testpadApi.getFolders(project.id);
            const scriptIds = testpadApi.extractScriptIds(folders);
            
            // Get aggregated progress from first few scripts
            let progress: Progress = { total: 0, pass: 0, fail: 0, block: 0, query: 0, summary: '' };
            
            for (const scriptId of scriptIds.slice(0, 5)) {
              try {
                const script = await testpadApi.getScript(scriptId);
                progress.total += script.progress?.total || 0;
                progress.pass += script.progress?.pass || 0;
                progress.fail += script.progress?.fail || 0;
                progress.block += script.progress?.block || 0;
                progress.query += script.progress?.query || 0;
              } catch (e) {
                // Continue
              }
            }

            return {
              ...project,
              scriptCount: scriptIds.length,
              progress,
            };
          } catch (e) {
            return { ...project, scriptCount: 0 };
          }
        })
      );

      setProjects(projectsWithMeta);
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
  }, [navigate]);

  useEffect(() => {
    if (!testpadApi.isConnected()) {
      navigate('/');
      return;
    }
    fetchProjects();
  }, [navigate, fetchProjects]);

  const handleRefresh = () => {
    fetchProjects(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <AppHeader title="Projects" />
        <main className="container py-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader 
        title="Projects" 
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      
      <main className="container py-6">
        {error && (
          <ErrorBanner
            title="Failed to load projects"
            message={error.message}
            onRetry={handleRefresh}
            retryAfter={error.retryAfter}
            className="mb-6"
          />
        )}

        {projects.length === 0 && !error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
              <p className="text-muted-foreground">Create a project in Testpad to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(project.created)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {project.scriptCount || 0} scripts
                        </span>
                      </div>

                      {project.progress && project.progress.total > 0 && (
                        <ProgressBar progress={project.progress} height="sm" />
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
