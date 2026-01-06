import * as React from 'react';
import { Avatar } from './avatar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from './button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Send, MoreHorizontal, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Assignment {
    runId: string;
    scriptId?: string;
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

export function TesterHeatmap({ data }: { data: TesterData[] }) {
    if (!data || data.length === 0) return <div className="text-center py-12 text-muted-foreground">No active testers found.</div>;

    // Calculate market share (total runs) to determine bubble size
    const totalRuns = data.reduce((acc, t) => acc + t.runs, 0) || 1;

    return (
        <div className="w-full p-4 bg-slate-950/5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex flex-wrap items-center justify-center gap-6 py-8">
                {data.map((t) => {
                    // Dynamic Size Logic: Base size 100px + proportional extra
                    const share = t.runs / totalRuns;
                    const size = Math.max(90, Math.min(180, 100 + (share * 200))); // Min 90px, Max 180px

                    const completionRate = t.runs > 0 ? Math.round(((t.completed || 0) / t.runs) * 100) : 0;
                    const isComplete = completionRate === 100;
                    const hasFailures = t.fails > 0;

                    // Theme Logic (Crypto Market Heatmap style)
                    // Green = Bullish (Done), Red = Bearish (Fails), Blue = Volatile (Active)
                    let bgGradient = "bg-gradient-to-br from-blue-500 to-indigo-600";
                    let shadow = "shadow-lg shadow-blue-500/20";
                    let statusIcon = <Zap className="w-5 h-5 text-blue-100 animate-pulse" />;
                    let statusText = "ACTIVE";

                    if (isComplete) {
                        bgGradient = "bg-gradient-to-br from-emerald-400 to-green-600";
                        shadow = "shadow-lg shadow-emerald-500/30";
                        statusIcon = <CheckCircle className="w-5 h-5 text-emerald-100" />;
                        statusText = "DONE";
                    } else if (hasFailures) {
                        bgGradient = "bg-gradient-to-br from-orange-500 to-red-600";
                        shadow = "shadow-lg shadow-red-500/30";
                        statusIcon = <TrendingUp className="w-5 h-5 text-red-100 rotate-180" />; // Down trend logic
                        statusText = `${t.fails} ISSUES`;
                    }

                    const handleRemind = () => {
                        const msg = generateSlackMessage(t);
                        navigator.clipboard.writeText(msg);
                        toast.success('Slack reminder copied!', { description: `Ready to send to ${t.name}` });
                    };

                    return (
                        <Sheet key={t.name}>
                            <SheetTrigger asChild>
                                <div
                                    className={`
                    relative rounded-full flex flex-col items-center justify-center text-white cursor-pointer 
                    transition-all duration-300 hover:scale-110 hover:-translate-y-2 group
                    ${bgGradient} ${shadow}
                  `}
                                    style={{ width: size, height: size }}
                                >
                                    {/* Glassy Overlay */}
                                    <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity" />

                                    {/* Content */}
                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                        <Avatar className="h-10 w-10 border-2 border-white/50 bg-white/20 text-white font-bold shadow-sm">
                                            {t.name.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <div className="text-center leading-tight">
                                            <div className="font-bold text-sm drop-shadow-md truncate max-w-[80px]">{t.name}</div>
                                            <div className="text-[10px] font-medium opacity-90">{completionRate}%</div>
                                        </div>
                                    </div>

                                    {/* Orbiting Status Indicator */}
                                    <div className="absolute -top-1 -right-1 bg-white text-slate-900 rounded-full p-1 shadow-sm border border-slate-100">
                                        {statusIcon}
                                    </div>

                                    {/* Status Label (Floating below) */}
                                    <div className={`
                    absolute -bottom-8 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-background border shadow-sm
                    ${isComplete ? 'text-emerald-600 border-emerald-200' : hasFailures ? 'text-red-600 border-red-200' : 'text-blue-600 border-blue-200'}
                  `}>
                                        {statusText}
                                    </div>
                                </div>
                            </SheetTrigger>

                            {/* Drill-down Sheet (Reusing logic for consistency) */}
                            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
                                <SheetHeader className="pb-6 border-b">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Avatar className="h-16 w-16 border-4 border-muted text-2xl">
                                                {t.name.charAt(0).toUpperCase()}
                                            </Avatar>
                                            {isComplete && <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-4 border-background"><CheckCircle className="w-4 h-4" /></div>}
                                        </div>
                                        <div>
                                            <SheetTitle className="text-xl">{t.name}</SheetTitle>
                                            <SheetDescription>{t.email}</SheetDescription>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mt-6">
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                                            <div className="text-2xl font-bold text-emerald-600">{t.completed}</div>
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Done</div>
                                        </div>
                                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                                            <div className="text-2xl font-bold text-blue-600">{t.inProgress}</div>
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active</div>
                                        </div>
                                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-center">
                                            <div className={`text-2xl font-bold ${t.fails > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>{t.fails}</div>
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Issues</div>
                                        </div>
                                    </div>
                                </SheetHeader>

                                <ScrollArea className="flex-1 -mx-6 px-6 py-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Assignments ({t.runs})</h3>
                                        <div className="space-y-2">
                                            {t.assignments?.map((a, i) => (
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
                })}
            </div>
        </div>
    );
}
