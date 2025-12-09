import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, FileText, Play, CheckSquare, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { StatCard } from '@/components/ui/stat-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ResultsPieChart } from '@/components/charts/results-pie-chart';
import { ErrorBanner } from '@/components/ui/error-banner';
import { testpadApi } from '@/lib/testpad-api';
import type { Project, Progress, DashboardStats, ApiError } from '@/types/testpad';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError(null);

    try {
      const projects = await testpadApi.getProjects();
      
      let totalScripts = 0;
      let totalRuns = 0;
      let totalTests = 0;
      const aggregatedProgress: Progress = {
        total: 0,
        pass: 0,
        fail: 0,
        block: 0,
        query: 0,
        summary: '',
      };

      // For each project, get folders and extract scripts
      for (const project of projects) {
        try {
          const folders = await testpadApi.getFolders(project.id);
          const scriptIds = testpadApi.extractScriptIds(folders);
          totalScripts += scriptIds.length;

          // Get progress for each script (limited to avoid rate limits)
          for (const scriptId of scriptIds.slice(0, 10)) {
            try {
              const script = await testpadApi.getScript(scriptId);
              totalRuns += script.runs?.length || 0;
              totalTests += script.progress?.total || 0;
              
              aggregatedProgress.total += script.progress?.total || 0;
              aggregatedProgress.pass += script.progress?.pass || 0;
              aggregatedProgress.fail += script.progress?.fail || 0;
              aggregatedProgress.block += script.progress?.block || 0;
              aggregatedProgress.query += script.progress?.query || 0;
            } catch (e) {
              // Continue with other scripts
            }
          }
        } catch (e) {
          // Continue with other projects
        }
      }

      const passRate = aggregatedProgress.total > 0 
        ? Math.round((aggregatedProgress.pass / aggregatedProgress.total) * 100) 
        : 0;
      aggregatedProgress.summary = `${passRate}% complete`;

      setStats({
        totalProjects: projects.length,
        totalScripts,
        totalRuns,
        totalTests,
        progress: aggregatedProgress,
      });
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
    fetchDashboardData();
  }, [navigate, fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <AppHeader title="Dashboard" />
        <main className="container py-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader 
        title="Dashboard" 
        onRefresh={handleRefresh} 
        isRefreshing={isRefreshing} 
      />
      
      <main className="container py-6">
        {error && (
          <ErrorBanner
            title="Failed to load data"
            message={error.message}
            onRetry={handleRefresh}
            retryAfter={error.retryAfter}
            className="mb-6"
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Projects"
            value={stats?.totalProjects || 0}
            icon={FolderOpen}
            variant="default"
          />
          <StatCard
            title="Total Scripts"
            value={stats?.totalScripts || 0}
            icon={FileText}
            variant="info"
          />
          <StatCard
            title="Test Runs"
            value={stats?.totalRuns || 0}
            icon={Play}
            variant="warning"
          />
          <StatCard
            title="Total Tests"
            value={stats?.totalTests || 0}
            icon={CheckSquare}
            variant="success"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.progress && (
                <div className="space-y-4">
                  <ProgressBar progress={stats.progress} height="lg" showLabels />
                  <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-chart-pass">{stats.progress.pass}</p>
                      <p className="text-sm text-muted-foreground">Passed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-chart-fail">{stats.progress.fail}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-chart-block">{stats.progress.block}</p>
                      <p className="text-sm text-muted-foreground">Blocked</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-chart-query">{stats.progress.query}</p>
                      <p className="text-sm text-muted-foreground">Query</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Result Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.progress && <ResultsPieChart progress={stats.progress} />}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
