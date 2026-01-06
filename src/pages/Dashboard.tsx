import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, CheckSquare, TrendingUp,
  Loader2, Copy, Filter, LayoutDashboard,
  Search, PanelLeftClose, PanelLeftOpen, BarChart3,
  RefreshCw, AlertCircle, CheckCircle, ChevronDown, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { StatCard } from '@/components/ui/stat-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ResultsPieChart } from '@/components/charts/results-pie-chart';
import { ErrorBanner } from '@/components/ui/error-banner';
import { testpadApi } from '@/lib/testpad-api';
import type { Project, Progress, ApiError, FolderItem, Script } from '@/types/testpad';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import FailedTestsList from '@/components/ui/failed-tests-list';
import { TesterKanbanBoard } from '@/components/ui/tester-kanban-board';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface SelectedFolder {
  projectId: number;
  projectName: string;
  folderId: string;
  folderName: string;
  folderItem: FolderItem;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set());
  const [projectFolders, setProjectFolders] = useState<Map<number, FolderItem[]>>(new Map());
  const [selectedFolders, setSelectedFolders] = useState<SelectedFolder[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<Progress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingFolders, setIsFetchingFolders] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [detailedScripts, setDetailedScripts] = useState<Script[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFailingOnly, setShowFailingOnly] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      if (!testpadApi.isConnected()) {
        navigate('/');
        return;
      }

      try {
        const projectList = await testpadApi.getProjects();
        setProjects(projectList);
      } catch (err: unknown) {
        const e = err as ApiError;
        if (e.status === 401) {
          testpadApi.clearApiKey();
          navigate('/');
          return;
        }
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [navigate]);

  // Toggle project selection
  const toggleProject = async (projectId: number) => {
    const newSelected = new Set(selectedProjects);

    if (newSelected.has(projectId)) {
      // Deselect project
      newSelected.delete(projectId);
      // Remove folders from this project
      setSelectedFolders(prev => prev.filter(f => f.projectId !== projectId));
      // Clear folder data (optional, maybe keep cache)
    } else {
      // Select project and fetch its folders
      newSelected.add(projectId);
      if (!projectFolders.has(projectId)) {
        await fetchProjectFolders(projectId);
      }
    }

    setSelectedProjects(newSelected);
  };

  // Fetch folders for a project
  const fetchProjectFolders = async (projectId: number) => {
    setIsFetchingFolders(true);
    try {
      const foldersData = await testpadApi.getFolders(projectId);
      const folders = foldersData.contents || [];

      setProjectFolders(prev => new Map(prev).set(projectId, folders));
    } catch (err) {
      console.error(`Failed to fetch folders for project ${projectId}:`, err);
    } finally {
      setIsFetchingFolders(false);
    }
  };

  // Toggle folder selection
  const toggleFolder = (projectId: number, projectName: string, folderItem: FolderItem) => {
    const folderId = String(folderItem.id);
    const existing = selectedFolders.find(
      f => f.projectId === projectId && f.folderId === folderId
    );

    if (existing) {
      setSelectedFolders(prev =>
        prev.filter(f => !(f.projectId === projectId && f.folderId === folderId))
      );
    } else {
      setSelectedFolders(prev => [...prev, {
        projectId,
        projectName,
        folderId,
        folderName: folderItem.name,
        folderItem,
      }]);
    }
  };

  // Analyze selected folders
  const analyzeSelectedFolders = async (foldersToAnalyze: SelectedFolder[] = selectedFolders) => {
    if (foldersToAnalyze.length === 0) return;

    setIsAnalyzing(true);
    setAggregatedStats(null); // Reset stats while analyzing

    try {
      // Aggregate known progress immediately
      const agg: Progress = { total: 0, pass: 0, fail: 0, block: 0, query: 0, summary: '' };

      foldersToAnalyze.forEach(({ folderItem }) => {
        const scripts = getAllScripts(folderItem);
        scripts.forEach(script => {
          const latestRun = getLatestRun(script.runs);
          if (latestRun?.progress) {
            agg.total += latestRun.progress.total || 0;
            agg.pass += latestRun.progress.pass || 0;
            agg.fail += latestRun.progress.fail || 0;
            agg.block += latestRun.progress.block || 0;
            agg.query += latestRun.progress.query || 0;
          }
        });
      });

      const passRate = agg.total > 0 ? Math.round((agg.pass / agg.total) * 100) : 0;
      agg.summary = `${passRate}% complete`;
      setAggregatedStats(agg);

      // Fetch detailed scripts in background for improved data
      const scriptIds = new Set<number>();
      foldersToAnalyze.forEach(({ folderItem }) => {
        getAllScripts(folderItem).forEach(s => scriptIds.add(Number(s.id)));
      });

      const uniqueIds = Array.from(scriptIds);
      const promises = uniqueIds.map(id =>
        testpadApi.getScript(id)
          .then((r): { id: number; ok: true; data: Script } => ({ id, ok: true, data: r }))
          .catch((e): { id: number; ok: false; error: ApiError } => ({ id, ok: false, error: e as ApiError }))
      );

      const results = await Promise.all(promises);
      const successful = results.filter((r) => r.ok).map((r) => (r as { ok: true; data: Script }).data);
      setDetailedScripts(successful);

    } catch (e: unknown) {
      console.error('Error analyzing folders', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Simplified Project Selection Handler
  const handleSimpleProjectSelect = async (projectIdStr: string) => {
    const projectId = parseInt(projectIdStr);
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Reset UI state for loading
    setAggregatedStats(null);
    setDetailedScripts([]);
    setIsAnalyzing(true); // Show global loading state
    
    // Set single project selection
    setSelectedProjects(new Set([projectId]));
    
    try {
      // Fetch folders
      const foldersData = await testpadApi.getFolders(projectId);
      const folders = foldersData.contents || [];
      
      // Update folder cache
      setProjectFolders(prev => new Map(prev).set(projectId, folders));

      // Auto-select ALL folders recursively
      const allFolderItems: SelectedFolder[] = [];
      const traverse = (items: FolderItem[]) => {
        items.forEach(item => {
          if (item.type === 'folder') {
            allFolderItems.push({
              projectId,
              projectName: project.name,
              folderId: String(item.id),
              folderName: item.name,
              folderItem: item
            });
            if (item.contents) traverse(item.contents);
          }
        });
      };
      traverse(folders);
      
      // Update selection state
      setSelectedFolders(allFolderItems);
      
      // Trigger analysis with the new set of folders
      await analyzeSelectedFolders(allFolderItems);
      
    } catch (err) {
      console.error('Failed to load project:', err);
      toast.error('Failed to load project data');
      setIsAnalyzing(false);
    }
  };

  // Auto-fetch removed per user request to improve performance.
  // User can manually click "Refresh Failures" to load deep data.

  // Helper to fetch details
  const analyzeFolders = async () => {
    setIsAnalyzing(true);
    try {
      const allScripts = selectedFolders.flatMap(f => getAllScripts(f.folderItem));
      // Only fetch if we have scripts
      if (allScripts.length === 0) {
        setIsAnalyzing(false);
        return;
      }

      // OPTIMIZATION: Only fetch scripts that actually have activity or failures?
      // For now, let's fetch all to ensure Team Board is 100% accurate too (assignments etc)
      // because 'terse' runs might miss some deep data? 
      // Actually 'terse' runs gives Assignee. 
      // But for Failed Tests we NEED 'results' map (step-level), which requires getScript/runs=full.

      // Let's filter: fetch FULL details for scripts with fails OR scripts with active runs.
      const interestingScripts = allScripts.filter((s: FolderItem) => {
        const p = s.progress as Partial<Progress> | undefined;
        return !!p && (((p.fail || 0) > 0) || ((p.pass || 0) > 0) || ((p.total || 0) > 0));
      });

      const promises = interestingScripts.map(script => testpadApi.getScript(Number(script.id)));
      const results = await Promise.all(promises);
      setDetailedScripts(results);
      if (results.length > 0) {
        toast.success(`Loaded details for ${results.length} scripts`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to analyze folders');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper: Get all scripts
  function getAllScripts(item: FolderItem): FolderItem[] {
    const scripts: FolderItem[] = [];
    if (item.type === 'script') scripts.push(item);
    else if (item.contents) item.contents.forEach(child => scripts.push(...getAllScripts(child)));
    return scripts;
  }

  // Helper: Get latest run
  function getLatestRun(runs?: any[]) {
    if (!runs || runs.length === 0) return null;
    return runs.reduce((latest, run) => {
      const latestDate = latest.created ? new Date(latest.created).getTime() : 0;
      const runDate = run.created ? new Date(run.created).getTime() : 0;
      return runDate > latestDate ? run : latest;
    });
  }

  function hasFailure(item: FolderItem): boolean {
    if (item.type === 'script') {
      const latestRun = getLatestRun(item.runs);
      if (!latestRun || !latestRun.results) return false;
      return Object.values(latestRun.results).some((r: any) =>
        r && (r.result === 'fail' || r.result === 'block' || r.result === 'query')
      );
    }
    if (item.contents && item.contents.length) {
      return item.contents.some(child => hasFailure(child));
    }
    return false;
  }

  const renderFolderTreeFiltered = (items: FolderItem[], projectId: number, projectName: string, depth = 0) => {
    return items
      .filter(i => i.type === 'folder' && (!showFailingOnly || hasFailure(i)))
      .map(item => {
        const folderId = String(item.id);
        const isSelected = selectedFolders.some(f => f.projectId === projectId && f.folderId === folderId);
        const scriptCount = getAllScripts(item).length;
        return (
          <div key={item.id} style={{ marginLeft: `${depth * 12}px` }} className="border-l border-border/50 ml-2">
            <div
              className={cn(
                "flex items-center gap-2 p-2 rounded-sm hover:bg-accent/50 cursor-pointer text-sm transition-colors my-1",
                isSelected && "bg-accent text-accent-foreground font-medium"
              )}
              onClick={() => toggleFolder(projectId, projectName, item)}
            >
              <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
              <FolderOpen className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
              <span className="flex-1 truncate">{item.name}</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{scriptCount}</Badge>
            </div>
            {item.contents && renderFolderTreeFiltered(item.contents, projectId, projectName, depth + 1)}
          </div>
        );
      });
  };

  // Filter projects based on search
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper: Extract valid run state
  function getRunState(run: any): 'new' | 'started' | 'complete' | 'unknown' {
    if (!run) return 'unknown';
    // Normalized check for state
    const s = (run.state || '').toLowerCase();
    if (s === 'complete') return 'complete';
    if (s === 'started' || s === 'in progress') return 'started';
    if (s === 'new') return 'new';
    return 'unknown';
  }

  // Helper: Extract tester info
  function getRunTester(run: any): { name: string; email?: string } {
    if (!run) return { name: 'Unassigned' };

    // 1. Try explicit assignee object
    if (run.assignee?.name) {
      return {
        name: run.assignee.name,
        email: run.assignee.email
      };
    }

    // 2. Try legacy tester string
    if (run.tester) {
      return { name: run.tester };
    }

    // 3. Try headers
    if (run.headers?._tester) {
      return { name: run.headers._tester };
    }

    return { name: 'Unassigned' };
  }

  // Computed: Failed Tests
  const failedTests = useMemo(() => {
    const list: any[] = [];

    // Use detailed scripts ONLY if they have valid runs attached.
    // Otherwise fallback to folder data which we know has runs.
    const hasDetailedRuns = detailedScripts.length > 0 && detailedScripts.some(s => s.runs && s.runs.length > 0);
    // Recursive helper to get full path
    // Logic depends on having parent pointers, which we might not have directly in this structure.
    // Instead, when flattening 'selectedFolders', we can attach the path context.

    // We already have 'selectedFolders' which are root items.
    // Let's create a flat map of Script ID -> Path Context
    const scriptContextMap = new Map<number, { project: string, path: string }>();

    const traverse = (item: FolderItem, project: string, pathPrefix: string) => {
      const currentPath = pathPrefix ? `${pathPrefix} > ${item.name}` : item.name;
      if (item.type === 'script') {
        scriptContextMap.set(Number(item.id), { project, path: pathPrefix || 'Root' });
      } else if (item.contents) {
        item.contents.forEach(child => traverse(child, project, item.type === 'folder' ? currentPath : pathPrefix));
      }
    };

    selectedFolders.forEach(({ folderItem, projectId }) => {
      const project = projects.find(p => p.id === projectId)?.name || 'Unknown Project';
      traverse(folderItem, project, '');
    });

    const sourceScripts = hasDetailedRuns ? detailedScripts : selectedFolders.flatMap(s => getAllScripts(s.folderItem));

    sourceScripts.forEach((script: any) => {
      const latestRun = getLatestRun(script.runs);
      if (latestRun && latestRun.results) {
        Object.entries(latestRun.results).forEach(([testId, res]) => {
          const result = res as any;
          if (result && (result.result === 'fail' || result.result === 'block' || result.result === 'query')) {
            const testRow = script.tests?.find((t: any) => String(t.id) === String(testId));
            // User requested to find the exact step which failed. 
            // If we have testRow.name, use it. If not, use ID.
            const testName = testRow ? testRow.name : `Step #${testId}`;

            const context = scriptContextMap.get(Number(script.id));
            const { name: testerName, email: testerEmail } = getRunTester(latestRun);

            list.push({
              projectName: context?.project || script.project?.name || 'Unknown',
              folderName: context?.path || script.folder?.name || 'Root', // Uses full path now
              scriptId: script.id,
              scriptName: script.name,
              testId,
              testName,
              result: result.result,
              comment: result.comment,
              issue: result.issue,
              tester: testerName,
              testerEmail,
              runId: latestRun.id,
              runCreated: latestRun.created,
              runState: latestRun.state,
            });
          }
        });
      }
    });

    return list;
  }, [detailedScripts]);

  // Computed: Tester Summary
  // Computed: Tester Summary
  const testerSummary = useMemo(() => {
    // 1. Build a map of Script ID -> Project Name
    // This ensures we always know which project a script belongs to, regardless of folder depth.
    const scriptProjectMap = new Map<number, string>();

    selectedFolders.forEach(({ folderItem, projectId }) => {
      const projName = projects.find(p => p.id === projectId)?.name || 'Unknown Project';
      const scripts = getAllScripts(folderItem);
      scripts.forEach((s: any) => {
        scriptProjectMap.set(Number(s.id), projName);
      });
    });

    // Define the map with the new assignments array
    const map: Record<string, {
      name: string;
      email?: string;
      runs: number;
      fails: number;
      completed: number;
      inProgress: number;
      assignments: Array<{
        runId: string;
        scriptName: string;
        projectName: string;
        status: 'complete' | 'started' | 'new' | 'unknown';
        progress: string;
      }>;
    }> = {};

    // Use detailed scripts ONLY if they have valid runs attached.
    // Otherwise fallback to folder data which we know has runs.
    const hasDetailedRuns = detailedScripts.length > 0 && detailedScripts.some(s => s.runs && s.runs.length > 0);

    const sourceScripts = hasDetailedRuns
      ? detailedScripts
      : selectedFolders.flatMap(s => getAllScripts(s.folderItem));

    sourceScripts.forEach((script: any) => {
      const latestRun = getLatestRun(script.runs);
      if (!latestRun) return;

      const { name: testerName, email: testerEmail } = getRunTester(latestRun);
      const state = getRunState(latestRun);

      if (!map[testerName]) {
        map[testerName] = {
          name: testerName,
          email: testerEmail,
          runs: 0, fails: 0, completed: 0, inProgress: 0,
          assignments: []
        };
      }

      map[testerName].runs += 1;
      if (state === 'complete') map[testerName].completed += 1;
      else if (state === 'started') map[testerName].inProgress += 1;

      const hasFail = latestRun.results && Object.values(latestRun.results).some((r: any) =>
        r && (r.result === 'fail' || r.result === 'block' || r.result === 'query')
      );
      if (hasFail) map[testerName].fails += 1;

      // Add detailed assignment with CORRECT Project Name
      map[testerName].assignments.push({
        runId: latestRun.id,
        scriptName: script.name,
        projectName: scriptProjectMap.get(Number(script.id)) || script.project?.name || 'Project',
        status: state,
        progress: latestRun.progress?.summary || ''
      });
    });

    return Object.values(map).sort((a, b) => b.runs - a.runs);
  }, [detailedScripts, selectedFolders, projects]);


  // Recursive folder tree render
  const renderFolderTree = (items: FolderItem[], projectId: number, projectName: string, depth = 0) => {
    return items.map(item => {
      if (item.type !== 'folder') return null;
      const folderId = String(item.id);
      const isSelected = selectedFolders.some(f => f.projectId === projectId && f.folderId === folderId);
      const scriptCount = getAllScripts(item).length;

      return (
        <div key={item.id} style={{ marginLeft: `${depth * 12}px` }} className="border-l border-border/50 ml-2">
          <div
            className={cn(
              "flex items-center gap-2 p-2 rounded-sm hover:bg-accent/50 cursor-pointer text-sm transition-colors my-1",
              isSelected && "bg-accent text-accent-foreground font-medium"
            )}
            onClick={() => toggleFolder(projectId, projectName, item)}
          >
            <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
            <FolderOpen className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1 truncate">{item.name}</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{scriptCount}</Badge>
          </div>
          {item.contents && renderFolderTree(item.contents, projectId, projectName, depth + 1)}
        </div>
      );
    });
  };

  const handleShareStatus = () => {
    if (!aggregatedStats) return;

    const completion = aggregatedStats.total > 0
      ? Math.round(((aggregatedStats.pass + aggregatedStats.fail + aggregatedStats.block) / aggregatedStats.total) * 100)
      : 0;

    const message = `*Test Execution Status Update*
    
📊 *Progress*: ${completion}% Complete
✅ *Passed*: ${aggregatedStats.pass}
❌ *Failed*: ${aggregatedStats.fail}
🚫 *Blocked*: ${aggregatedStats.block}
❓ *Query*: ${aggregatedStats.query}
    
Total Tests: ${aggregatedStats.total}
    
_Generated via TestPad Admin Dashboard_`;

    navigator.clipboard.writeText(message);
    toast.success('Status copied to clipboard!', {
      description: 'Opening Slack...'
    });

    // Try to open Slack Desktop
    window.location.href = 'slack://open';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <AppHeader title="Dashboard" />
        <main className="container py-6">
          <div className="flex gap-6 h-[80vh]">
            <Skeleton className="w-1/4 h-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 flex flex-col">
      <AppHeader title="Command Center" showProjectSelector={false} />

      {/* Quick Actions Toolbar */}
      <div className="border-b bg-card/50 backdrop-blur sticky top-14 z-30 px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          <Select onValueChange={handleSimpleProjectSelect}>
            <SelectTrigger className="w-[200px] bg-background border-input shadow-sm h-9">
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="h-4 w-4 shrink-0 opacity-50" />
                <SelectValue placeholder="Select Project" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={() => navigate('/create-round')} className="whitespace-nowrap bg-primary/90 hover:bg-primary shadow-sm hover:shadow-md transition-all">
            <Copy className="mr-2 h-4 w-4" />
            Create Round
          </Button>
          <Button size="sm" variant="outline" className="whitespace-nowrap hover:bg-accent">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 px-3 bg-background">
            {selectedFolders.length} selected
          </Badge>
          <Button
            size="sm"
            onClick={() => analyzeSelectedFolders()}
            disabled={selectedFolders.length === 0 || isAnalyzing}
            variant={aggregatedStats ? "secondary" : "default"}
          >
            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
            Analyze Selection
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleShareStatus}
            disabled={!aggregatedStats}
          >
            <Send className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Selection Panel */}
        <aside
          className={cn(
            "border-r bg-card/30 flex flex-col transition-all duration-300 ease-in-out z-20",
            sidebarOpen ? "w-80 translate-x-0" : "w-0 -translate-x-full opacity-0 overflow-hidden"
          )}
        >
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Scope Selector
              </h3>
              {selectedFolders.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setSelectedFolders([]); setSelectedProjects(new Set()); }}>
                  Clear
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter projects..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={showFailingOnly} onCheckedChange={() => setShowFailingOnly(v => !v)} />
              <span className="text-xs text-muted-foreground">Only failing</span>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {filteredProjects.map(project => {
                const isSelected = selectedProjects.has(project.id);
                const folders = projectFolders.get(project.id);

                return (
                  <div key={project.id} className="space-y-1">
                    <div
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer group",
                        isSelected && "bg-accent/50"
                      )}
                      onClick={() => toggleProject(project.id)}
                    >
                      <Checkbox checked={isSelected} className="rounded-[4px]" />
                      <FolderOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm font-medium flex-1 truncate">{project.name}</span>
                    </div>

                    {isSelected && (
                      <div className="ml-2 pl-2 border-l-2 border-muted animate-in slide-in-from-left-2 duration-200">
                        {isFetchingFolders && !folders ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading...
                          </div>
                        ) : folders?.length ? (
                          showFailingOnly
                            ? renderFolderTreeFiltered(folders, project.id, project.name)
                            : renderFolderTree(folders, project.id, project.name)
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">No accessible folders</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredProjects.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No projects found
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-muted/10 p-4 md:p-6 space-y-6">
          {error && (
            <ErrorBanner
              title="Failed to load data"
              message={error.message}
              className="mb-4"
            />
          )}

          {!aggregatedStats ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                <LayoutDashboard className="h-10 w-10 text-primary" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-2xl font-bold">Welcome to Command Center</h2>
                <p className="text-muted-foreground">
                  Select projects and folders from the sidebar to analyze progress, track metrics, and identify issues across your testing scope.
                </p>
              </div>
              <Button size="lg" onClick={() => setSidebarOpen(true)} variant="outline" className={cn(sidebarOpen && "hidden")}>
                <PanelLeftOpen className="mr-2 h-4 w-4" />
                Open Selector
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* High-Level Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Tests" value={aggregatedStats.total} icon={CheckSquare} variant="default" className="shadow-sm hover:shadow-md transition-all" />
                <StatCard title="Passed" value={aggregatedStats.pass} icon={CheckSquare} variant="success" className="shadow-sm hover:shadow-md transition-all" />
                <StatCard title="Failed" value={aggregatedStats.fail} icon={CheckSquare} variant="destructive" className="shadow-sm hover:shadow-md transition-all" />
                <StatCard title="Blocked/Query" value={aggregatedStats.block + aggregatedStats.query} icon={CheckSquare} variant="warning" className="shadow-sm hover:shadow-md transition-all" />
              </div>

              {/* 1. Overall Progress Section */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-destructive">Failed Test Cases</h3>
                    <p className="text-sm text-muted-foreground">
                      {failedTests.length} tests requiring attention
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => analyzeFolders()}
                    disabled={isAnalyzing}
                    className="h-8 gap-2"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    Refresh Failures
                  </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Pie Chart */}
                  <Card className="lg:col-span-1 shadow-sm border-muted/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">Result Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultsPieChart progress={aggregatedStats} />
                    </CardContent>
                  </Card>

                  {/* Progress Detail */}
                  <Card className="lg:col-span-2 shadow-sm border-muted/40">
                    <CardHeader className="pb-2">
                      <CardTitle className=" text-base font-medium">Execution Status</CardTitle>
                      <CardDescription>Aggregate status across all selected folders</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Completion Rate</span>
                          <span className="text-muted-foreground">{Math.round((aggregatedStats.pass + aggregatedStats.fail + aggregatedStats.block) / (aggregatedStats.total || 1) * 100)}%</span>
                        </div>
                        <ProgressBar progress={aggregatedStats} height="xl" showLabels />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Stat Boxes */}
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{aggregatedStats.pass}</div>
                          <div className="text-xs font-medium uppercase text-green-600/70 dark:text-green-400/70 mt-1">Passed</div>
                        </div>
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{aggregatedStats.fail}</div>
                          <div className="text-xs font-medium uppercase text-red-600/70 dark:text-red-400/70 mt-1">Failed</div>
                        </div>
                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{aggregatedStats.block}</div>
                          <div className="text-xs font-medium uppercase text-yellow-600/70 dark:text-yellow-400/70 mt-1">Blocked</div>
                        </div>
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{aggregatedStats.query}</div>
                          <div className="text-xs font-medium uppercase text-blue-600/70 dark:text-blue-400/70 mt-1">Query</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 2. Failures Section */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-destructive" />
                    Failed Test Cases
                    {aggregatedStats.fail > 0 && <Badge variant="destructive" className="ml-2">{aggregatedStats.fail}</Badge>}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => analyzeFolders()}
                    disabled={isAnalyzing}
                    className="h-8 gap-2"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    Refresh Failures
                  </Button>
                </div>

                <Card className="shadow-sm border-muted/40">
                  <CardContent className="p-0">
                    {isAnalyzing ? (
                      <div className="py-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="max-h-[500px] overflow-y-auto p-4">
                        {failedTests.length > 0 ? (
                          <FailedTestsList items={failedTests} />
                        ) : aggregatedStats.fail > 0 ? (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p>Failures detected in summary ({aggregatedStats.fail}), but detailed logs are unavailable.</p>
                            <p className="text-xs mt-1">Click "Refresh Failures" to fetch deep history.</p>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            <CheckCircle className="h-8 w-8 text-green-500/50 mx-auto mb-2" />
                            <p>No failed tests detected.</p>
                            <p className="text-xs mt-1">Great job!</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 3. Team Insights (Kanban Board) */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">Team Status Board</h3>
                    <p className="text-sm text-muted-foreground">Track progress and send reminders</p>
                  </div>
                </div>
                <TesterKanbanBoard data={testerSummary} />
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
