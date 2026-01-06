import * as React from 'react';
import { Bug, MessageSquare, ExternalLink, FileText, Folder } from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FailedTestItem {
  projectName: string;
  folderName: string;
  scriptId: string | number;
  scriptName?: string;
  testId: string;
  testName?: string;
  result: string;
  comment?: string;
  issue?: string;
  tester?: string;
  runId?: string;
  runCreated?: string;
}

export function FailedTestsList({ items }: { items: FailedTestItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="p-4 bg-muted/50 rounded text-center text-sm text-muted-foreground">
        No failed tests in the selected runs.
      </div>
    );
  }

  // Group by Script
  const grouped = items.reduce((acc, item) => {
    const key = String(item.scriptId);
    if (!acc[key]) {
      acc[key] = {
        scriptName: item.scriptName || `Script ${item.scriptId}`,
        scriptId: item.scriptId,
        projectName: item.projectName,
        folderName: item.folderName,
        runId: item.runId,
        failures: []
      };
    }
    acc[key].failures.push(item);
    return acc;
  }, {} as Record<string, {
    scriptName: string,
    scriptId: string | number,
    projectName: string,
    folderName: string,
    runId?: string,
    failures: FailedTestItem[]
  }>);

  return (
    <div className="space-y-4">
      {Object.values(grouped).map((group) => (
        <div key={group.scriptId} className="bg-card rounded-lg border shadow-sm overflow-hidden">
          {/* Header: Script Focus */}
          <div className="p-4 border-b bg-muted/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-base font-bold flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  {group.scriptName}
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Folder className="h-3 w-3" />
                  <span>{group.projectName}</span>
                  <span className="text-muted-foreground/30">/</span>
                  <span>{group.folderName}</span>
                </div>
              </div>

              <a
                href={`https://bitfinex.testpad.com/script/${group.scriptId}${group.runId ? `/run/${group.runId}` : ''}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  Open Script
                </Button>
              </a>
            </div>
          </div>

          {/* List of Failures */}
          <div className="divide-y">
            {group.failures.map((it, idx) => (
              <div key={idx} className="p-3 hover:bg-muted/20 transition-colors flex items-start gap-3">
                <Badge variant="destructive" className="mt-0.5 shrink-0 uppercase text-[10px] w-14 justify-center">{it.result}</Badge>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="font-medium text-sm text-foreground">
                    <span className="text-muted-foreground font-normal mr-1">Step:</span>
                    {it.testName || `Step #${it.testId}`}
                  </div>

                  {it.comment && (
                    <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-2 rounded border border-amber-200 dark:border-amber-900/50 flex items-start gap-2">
                      <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{it.comment}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>{it.tester}</span>
                    {it.issue && (
                      <a href={it.issue} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                        <Bug className="h-3 w-3" /> Issue Linked
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default FailedTestsList;
