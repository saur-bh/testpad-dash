import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Play, Clock, User, MessageSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ResultBadge } from '@/components/ui/result-badge';
import type { Run, Script, Test } from '@/types/testpad';

export default function RunDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { run, script } = (location.state as { run: Run; script: Script }) || {};

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

  if (!run || !script) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <AppHeader title="Run Details" showBack />
        <main className="container py-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Run data not available. Please navigate from a script.
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader title={`Run #${run.id.slice(-6)}`} showBack />
      
      <main className="container py-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-warning/10 p-3">
                <Play className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-xl font-bold">Run #{run.id.slice(-6)}</h2>
                  <p className="text-sm text-muted-foreground">{script.name}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  {run.tester && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-4 w-4" />
                      {run.tester}
                    </span>
                  )}
                  {run.created && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDate(run.created)}
                    </span>
                  )}
                </div>

                {run.progress && (
                  <ProgressBar progress={run.progress} height="md" showLabels />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {script.tests && script.tests.length > 0 ? (
                script.tests.map((test, index) => {
                  const result = run.results?.[test.id];
                  return (
                    <div
                      key={test.id || index}
                      className="rounded-lg border p-4"
                      style={{ marginLeft: `${(test.indent || 0) * 16}px` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              {index + 1}
                            </span>
                            <span className="font-medium">{test.name}</span>
                          </div>
                          
                          {result?.comment && (
                            <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                              <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{result.comment}</span>
                            </div>
                          )}
                          
                          {result?.issue && (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <ExternalLink className="h-4 w-4 text-info" />
                              <a
                                href={result.issue}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-info hover:underline"
                              >
                                {result.issue}
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <ResultBadge
                          result={result?.result || ''}
                          size="sm"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No test results available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />
    </div>
  );
}
