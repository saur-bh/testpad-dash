import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TesterSquareGrid } from './tester-square-grid';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Trophy, AlertTriangle, Zap } from 'lucide-react';

interface TesterData {
    name: string;
    email?: string;
    runs: number;
    fails: number;
    completed?: number;
    inProgress?: number;
    assignments: any[];
}

export function QAInsights({ data }: { data: TesterData[] }) {
    if (!data || data.length === 0) return null;

    // Prepare Data for Chart
    const chartData = data.map(t => ({
        name: t.name,
        x: t.runs, // Workload
        y: t.runs > 0 ? Math.round(((t.completed || 0) / t.runs) * 100) : 0, // Progress %
        z: t.fails + 1, // Failures (Size factor), +1 to be visible if 0
        fails: t.fails,
        completed: t.completed,
        runs: t.runs
    }));

    // Insights Logic
    const topPerformer = [...data].sort((a, b) => (b.completed || 0) - (a.completed || 0))[0];
    const bugHunter = [...data].sort((a, b) => b.fails - a.fails)[0];
    const busiest = [...data].sort((a, b) => b.runs - a.runs)[0];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-popover border text-popover-foreground p-2 rounded-lg shadow-lg text-xs">
                    <p className="font-bold">{d.name}</p>
                    <p>Load: {d.x} tests</p>
                    <p>Progress: {d.y}%</p>
                    <p>Issues: {d.fails}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">

            {/* 1. Insight Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Move</p>
                            <p className="font-bold truncate">{topPerformer?.name || 'None'}</p>
                            <p className="text-[10px] text-emerald-600">{topPerformer?.completed || 0} tests done</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Heavy Lifter</p>
                            <p className="font-bold truncate">{busiest?.name || 'None'}</p>
                            <p className="text-[10px] text-blue-600">{busiest?.runs || 0} tests assigned</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bug Hunter</p>
                            <p className="font-bold truncate">{bugHunter?.fails > 0 ? bugHunter.name : 'Clean Run'}</p>
                            <p className="text-[10px] text-orange-600">{bugHunter?.fails || 0} issues found</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. Performance Matrix Chart */}
            <Card className="shadow-sm border-muted/40">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Performance Matrix</CardTitle>
                    <CardDescription>Workload (X) vs. Completion (Y) • Bubble Size = Issues Found</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                            <XAxis type="number" dataKey="x" name="Workload" unit=" tests" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis type="number" dataKey="y" name="Progress" unit="%" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                            <ZAxis type="number" dataKey="z" range={[100, 500]} name="Issues" />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                            <ReferenceLine y={50} stroke="#888888" strokeDasharray="3 3" />
                            <Scatter name="Testers" data={chartData} fill="#8884d8">
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.y === 100 ? '#10b981' : entry.fails > 0 ? '#ef4444' : '#3b82f6'} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 3. Detailed Squad Grid */}
            <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">Squad Details</h3>
                <TesterSquareGrid data={data} />
            </div>
        </div>
    );
}
