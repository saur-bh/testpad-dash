import * as React from 'react';
import { Avatar } from './avatar';
import { Mail, CheckCircle, Clock, Send, ChevronRight, AlertCircle, PlayCircle, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Assignment {
  runId: string;
  scriptId?: string; // We need this for the link
  scriptName: string;
  projectName: string;
  status: 'complete' | 'started' | 'new' | 'unknown';
  progress: string;
}

interface TesterData {
  name: string;
  email?: string;
  runs: number;
  fails: number;
  completed?: number;
  inProgress?: number;
  assignments: Assignment[];
}

const generateSlackMessage = (t: TesterData) => {
  const completionRate = t.runs > 0 ? Math.round(((t.completed || 0) / t.runs) * 100) : 0;

  const assignmentsText = t.assignments?.map(a => {
    // Construct deep link: https://bitfinex.testpad.com/script/[ScriptID]/run/[RunID]
    // Note: Assuming "bitfinex" subdomain is constant for this user based on request
    const link = a.scriptId ? `https://bitfinex.testpad.com/script/${a.scriptId}/run/${a.runId}` : '';
    const statusIcon = a.status === 'complete' ? '✅' : a.status === 'started' ? '🚧' : '⭕️';

    return `${statusIcon} *${a.scriptName}* (${a.projectName})\n   ${link}`;
  }).join('\n\n') || '';

  return `Hi ${t.name},
  
Gentle reminder on your test assignments:
*Progress: ${completionRate}%* (${t.completed || 0}/${t.runs} runs completed)
  
*Assignments:*
${assignmentsText}
  
Please update as you go. Thanks!`;
};

// Circular Progress Component
function CircularProgress({ value, size = 60, strokeWidth = 5, color = "text-primary" }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle className="text-muted/20" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        <circle className={`${color} transition-all duration-1000 ease-out`} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
      </svg>
      <span className="absolute text-xs font-bold">{Math.round(value)}%</span>
    </div>
  );
}

// Tester Token Component (Bitcoin/Crypto Theme)
function TesterToken({ tester }: { tester: TesterData }) {
  const completionRate = tester.runs > 0 ? Math.round(((tester.completed || 0) / tester.runs) * 100) : 0;
  const isComplete = completionRate === 100;
  const hasFailures = tester.fails > 0;

  // Dynamic coloring based on status (Crypto vibes)
  // Green = Bullish/Complete, Orange = Warning, Blue = Neutral/Active
  let ringColor = "text-blue-500";
  let glowColor = "shadow-blue-500/20";
  let statusIcon = null;

  if (isComplete) {
    ringColor = "text-emerald-500";
    glowColor = "shadow-emerald-500/40";
    statusIcon = <CheckCircle className="w-3 h-3 text-emerald-500 absolute -top-1 -right-1 bg-background rounded-full" />;
  } else if (hasFailures) {
    ringColor = "text-orange-500";
    glowColor = "shadow-orange-500/40";
    statusIcon = <AlertCircle className="w-3 h-3 text-orange-500 absolute -top-1 -right-1 bg-background rounded-full" />;
  }

  const handleRemind = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = generateSlackMessage(tester);
    navigator.clipboard.writeText(msg);
    toast.success('Slack reminder copied!', { description: `Ready to send to ${tester.name}` });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="flex flex-col items-center gap-2 cursor-pointer group p-2 rounded-xl transition-all hover:bg-muted/30">
          {/* The Token (Circle) */}
          <div className={`relative rounded-full transition-transform duration-300 group-hover:scale-105 ${glowColor} shadow-lg`}>
            {/* Outer Ring (Progress) */}
            <CircularProgress
              value={completionRate}
              size={80}
              strokeWidth={5}
              color={ringColor}
            />

            {/* Inner Avatar */}
            <div className="absolute inset-2 rounded-full overflow-hidden border-2 border-background">
              <Avatar className="h-full w-full bg-slate-900 text-slate-100 font-bold text-lg">
                {tester.name.charAt(0).toUpperCase()}
              </Avatar>
            </div>

            {/* Status Badge Icon */}
            {statusIcon}
          </div>

          {/* Label */}
          <div className="text-center">
            <div className="font-semibold text-sm group-hover:text-primary transition-colors">{tester.name}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-center gap-1">
              {completionRate}%
              {isComplete && <span className="text-emerald-500">DONE</span>}
            </div>
          </div>
        </div>
      </SheetTrigger>

      {/* Sheet details remain similar but styled to match */}
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader className="pb-6 border-b">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-4 border-muted text-2xl">
                {tester.name.charAt(0).toUpperCase()}
              </Avatar>
              {isComplete && <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-4 border-background"><CheckCircle className="w-4 h-4" /></div>}
            </div>
            <div>
              <SheetTitle className="text-xl">{tester.name}</SheetTitle>
              <SheetDescription>{tester.email}</SheetDescription>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{tester.completed}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Done</div>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tester.inProgress}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active</div>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-center">
              <div className={`text-2xl font-bold ${tester.fails > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>{tester.fails}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Issues</div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 py-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Assignments ({tester.runs})</h3>
            <div className="space-y-2">
              {tester.assignments?.map((a, i) => (
                <div key={i} className="p-4 rounded-xl border bg-card hover:bg-muted/40 transition-colors group/item flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {a.scriptName}
                      <a
                        href={`https://bitfinex.testpad.com/script/${a.scriptId}/run/${a.runId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary opacity-0 group-hover/item:opacity-100 transition-opacity"
                      >
                        <div className="bg-muted p-1 rounded hover:bg-muted-foreground/20">
                          <MoreHorizontal className="h-3 w-3" />
                        </div>
                      </a>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.projectName}</div>
                  </div>
                  <Badge variant={a.status === 'complete' ? 'default' : a.status === 'started' ? 'secondary' : 'outline'}
                    className={a.status === 'complete' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200' : ''}>
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="pt-4 mt-auto border-t">
          <Button className="w-full gap-2 font-semibold" onClick={handleRemind}>
            <Send className="h-4 w-4" /> Copy Slack Reminder
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TesterSummary({ data }: { data: TesterData[] }) {
  if (!data || data.length === 0) return <div className="text-center py-12 text-muted-foreground">No active testers found.</div>;

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex items-center gap-8 min-w-max px-2">
        {/* Render all testers as tokens in a row */}
        {data.map(t => <TesterToken key={t.name} tester={t} />)}
      </div>
    </div>
  );
}

export default TesterSummary;
