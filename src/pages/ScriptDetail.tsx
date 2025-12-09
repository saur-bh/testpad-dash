import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Play, ChevronRight, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ResultBadge } from '@/components/ui/result-badge';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { testpadApi } from '@/lib/testpad-api';
import type { Script, ApiError } from '@/types/testpad';

export default function ScriptDetail() {
  const { scriptId } = useParams();
  const navigate = useNavigate();
  const [script, setScript] = useState<Script | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!scriptId) return;
    if (showRefreshing) setIsRefreshing(true);
    setError(null);

    try {
      const scriptData = await testpadApi.getScript(Number(scriptId));
      setScript(scriptData);
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
  }, [scriptId, navigate]);

  useEffect(() => {
    if (!testpadApi.isConnected()) {
      navigate('/');
      return;
    }
    fetchData();
  }, [navigate, fetchData]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <AppHeader title="Script" showBack />
        <main className="container py-6">
          <Skeleton className="h-32 mb-6" />
          <Skeleton className="h-96" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader 
        title={script?.name || 'Script'} 
        showBack 
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
      />
      
      <main className="container py-6">
        {error && (
          <ErrorBanner
            title="Failed to load script"
            message={error.message}
            onRetry={() => fetchData(true)}
            retryAfter={error.retryAfter}
            className="mb-6"
          />
        )}

        {script && (
          <>
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-info/10 p-3">
                    <FileText className="h-6 w-6 text-info" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{script.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {script.tests?.length || 0} tests • {script.runs?.length || 0} runs
                    </p>
                    {script.progress && (
                      <div className="mt-4">
                        <ProgressBar progress={script.progress} height="md" showLabels />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="tests" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tests">Tests</TabsTrigger>
                <TabsTrigger value="runs">Runs ({script.runs?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="tests">
                <Card>
                  <CardHeader>
                    <CardTitle>Test Cases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {script.tests && script.tests.length > 0 ? (
                      <div className="space-y-1">
                        {script.tests.map((test, index) => (
                          <div
                            key={test.id || index}
                            className="flex items-center gap-2 rounded-lg border p-3"
                            style={{ marginLeft: `${(test.indent || 0) * 16}px` }}
                          >
                            <span className="text-xs font-mono text-muted-foreground">
                              {index + 1}
                            </span>
                            <span className="flex-1">{test.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        No tests in this script
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="runs">
                <div className="space-y-4">
                  {script.runs && script.runs.length > 0 ? (
                    script.runs.map((run) => (
                      <Card
                        key={run.id}
                        className="cursor-pointer transition-all hover:shadow-md"
                        onClick={() => navigate(`/runs/${run.id}`, { state: { run, script } })}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-4">
                                <div className="rounded-lg bg-warning/10 p-2">
                                  <Play className="h-4 w-4 text-warning" />
                                </div>
                                <div>
                                  <p className="font-medium">Run #{run.id.slice(-6)}</p>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    {run.tester && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {run.tester}
                                      </span>
                                    )}
                                    {run.created && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(run.created)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {run.progress && (
                                <ProgressBar progress={run.progress} height="sm" />
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No runs for this script yet
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
