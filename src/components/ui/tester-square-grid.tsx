import * as React from 'react';
import { Avatar } from './avatar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from './button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Send, MoreHorizontal, AlertCircle, PlayCircle } from 'lucide-react';
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
    return `Reminder for ${t.name}: Status ${completionRate}% complete.`;
};

// Small Square Tester Component
function TesterSquare({ tester }: { tester: TesterData }) {
    const completionRate = tester.runs > 0 ? Math.round(((tester.completed || 0) / tester.runs) * 100) : 0;
    const isComplete = completionRate === 100;
    const hasFailures = tester.fails > 0;

    let borderColor = "border-transparent";
    let statusBadge = null;

    if (isComplete) {
        borderColor = "border-emerald-500";
        statusBadge = <div className="absolute top-0 right-0 bg-emerald-500 text-white p-0.5 rounded-bl-md shadow-sm"><CheckCircle className="w-3 h-3" /></div>;
    } else if (hasFailures) {
        borderColor = "border-red-500";
        statusBadge = <div className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md shadow-sm"><AlertCircle className="w-3 h-3" /></div>;
    } else {
        // Active/Pending
        borderColor = "border-blue-500/30";
    }

    const handleRemind = () => {
        const msg = generateSlackMessage(tester);
        navigator.clipboard.writeText(msg);
        toast.success('Copied!');
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <div
                    className={`
            group relative h-16 w-16 bg-card rounded-xl border-2 ${borderColor} 
            flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-md
          `}
                    title={`${tester.name}: ${completionRate}%`}
                >
                    <Avatar className="h-8 w-8 rounded text-xs font-bold bg-muted text-muted-foreground border border-background">
                        {tester.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div className="text-[10px] font-medium truncate w-full text-center px-1 mt-1">{tester.name}</div>

                    {statusBadge}
                </div>
            </SheetTrigger>

            {/* Reused Sheet Details */}
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
                <SheetHeader className="pb-6 border-b">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-4 border-muted text-2xl">
                            {tester.name.charAt(0).toUpperCase()}
                        </Avatar>
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
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                            <div className="text-2xl font-bold text-red-600">{tester.fails}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Issues</div>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 -mx-6 px-6 py-6">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Assignments ({tester.runs})</h3>
                        <div className="space-y-2">
                            {tester.assignments?.map((a, i) => (
                                <div key={i} className="p-3 rounded-md border flex items-center justify-between hover:bg-muted/40 transition-colors group/item">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            {a.scriptName}
                                            <a href={`https://bitfinex.testpad.com/script/${a.scriptId}/run/${a.runId}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary opacity-0 group-hover/item:opacity-100 transition-opacity"><MoreHorizontal className="h-3 w-3" /></a>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{a.projectName}</div>
                                    </div>
                                    <Badge variant={a.status === 'complete' ? 'default' : a.status === 'started' ? 'secondary' : 'outline'}>{a.status}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

export function TesterSquareGrid({ data }: { data: TesterData[] }) {
    if (!data || data.length === 0) return <div className="text-center py-8 text-muted-foreground">No active testers.</div>;

    // Split into "Done" vs "Remaining"
    const done = data.filter(t => t.runs > 0 && t.completed === t.runs);
    const remaining = data.filter(t => !done.includes(t));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Column 1: Completed */}
            <div className="flex flex-col gap-4 rounded-xl border bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle className="h-4 w-4" />
                        Completed ({done.length})
                    </h3>
                </div>
                <div className="flex flex-wrap content-start gap-3">
                    {done.length === 0 && <div className="text-xs text-muted-foreground italic w-full text-center py-8">No one has finished yet.</div>}
                    {done.map(t => <TesterSquare key={t.name} tester={t} />)}
                </div>
            </div>

            {/* Column 2: Remaining (In Progress / Not Started) */}
            <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        In Progress / Pending ({remaining.length})
                    </h3>
                </div>
                <div className="flex flex-wrap content-start gap-3">
                    {remaining.length === 0 && <div className="text-xs text-muted-foreground italic w-full text-center py-8">All done!</div>}
                    {remaining.map(t => <TesterSquare key={t.name} tester={t} />)}
                </div>
            </div>
        </div>
    );
}
