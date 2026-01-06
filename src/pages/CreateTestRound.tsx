import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Loader2, CheckCircle, AlertCircle, FolderOpen, User, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { testpadApi } from '@/lib/testpad-api';
import type { Project, FolderItem } from '@/types/testpad';
import { cn } from '@/lib/utils';

export default function CreateTestRound() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    const [newRoundName, setNewRoundName] = useState('');
    const [assignedTester, setAssignedTester] = useState('');
    const [selectedTeamMembers, setSelectedTeamMembers] = useState<Set<string>>(new Set());
    const [buildInfo, setBuildInfo] = useState('');
    const [browserInfo, setBrowserInfo] = useState('');

    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 4, message: '' });
    const [result, setResult] = useState<{
        success: boolean;
        newFolderId?: string;
        errors: Array<{ step: string; error: string }>;
        createdScripts: number;
        createdRuns: number;
    } | null>(null);

    // Load projects on mount
    useEffect(() => {
        const loadProjects = async () => {
            if (!testpadApi.isConnected()) {
                navigate('/');
                return;
            }

            try {
                const projectList = await testpadApi.getProjects();
                setProjects(projectList);

                // Pre-select project from URL params if provided
                const projectIdParam = searchParams.get('projectId');
                if (projectIdParam && projectList.some(p => p.id === Number(projectIdParam))) {
                    setSelectedProjectId(projectIdParam);
                }
            } catch (err: unknown) {
                console.error('Failed to load projects:', err);
            } finally {
                setIsLoadingProjects(false);
            }
        };

        loadProjects();
    }, [navigate, searchParams]);

    // Load folders when project is selected
    useEffect(() => {
        const loadFolders = async () => {
            if (!selectedProjectId) {
                setFolders([]);
                return;
            }

            setIsLoadingFolders(true);
            try {
                const folderData = await testpadApi.getFolders(Number(selectedProjectId));
                setFolders(folderData.contents || []);
            } catch (err: unknown) {
                console.error('Failed to load folders:', err);
            } finally {
                setIsLoadingFolders(false);
            }
        };

        loadFolders();
    }, [selectedProjectId]);

    // Extract all folders recursively for selection
    const getAllFolders = (items: FolderItem[], depth = 0): Array<{ id: string; name: string; depth: number }> => {
        const result: Array<{ id: string; name: string; depth: number }> = [];

        items.forEach(item => {
            if (item.type === 'folder') {
                result.push({ id: String(item.id), name: item.name, depth });
                if (item.contents) {
                    result.push(...getAllFolders(item.contents, depth + 1));
                }
            }
        });

        return result;
    };

    const folderOptions = getAllFolders(folders);

    // Hardcoded team members
    const teamMembers = [
        'santiago.riveira@bitfinex.com',
         'harvey.decapia@bitfinex.com', 
         'gabriel.agular@bitfinex.com', 
         'julian.villabona@bitfinex.com', 
         'luis.andrade@bitfinex.com',
        'vuong.van@bitfinex.com',
        'saurabh.verma@bitfinex.com',
        'peter.spigt@bitfinex.com',

    ];

    const handleCreateRound = async () => {
        const hasSelectedMembers = selectedTeamMembers.size > 0;
        if (!selectedProjectId || !selectedFolderId || !newRoundName.trim() || (!hasSelectedMembers && !assignedTester.trim())) {
            return;
        }

        setIsDuplicating(true);
        setResult(null);
        setProgress({ current: 0, total: 4, message: 'Starting...' });

        try {
            const duplicateResult = await testpadApi.duplicateFolder(
                Number(selectedProjectId),
                selectedFolderId,
                newRoundName.trim(),
                hasSelectedMembers ? Array.from(selectedTeamMembers) : assignedTester.trim(),
                {
                    build: buildInfo.trim() || undefined,
                    browser: browserInfo.trim() || undefined,
                },
                (current, total, message) => {
                    setProgress({ current, total, message });
                }
            );

            setResult(duplicateResult);

            if (duplicateResult.success) {
                // Reset form
                setNewRoundName('');
                setAssignedTester('');
                setSelectedTeamMembers(new Set());
                setBuildInfo('');
                setBrowserInfo('');
                setSelectedFolderId('');
            }
        } catch (err: unknown) {
            setResult({
                success: false,
                errors: [{ step: 'duplication', error: (err as Error).message || 'Failed to create test round' }],
                createdScripts: 0,
                createdRuns: 0,
            });
        } finally {
            setIsDuplicating(false);
        }
    };

    const canSubmit = selectedProjectId && selectedFolderId && newRoundName.trim() && (!isDuplicating) && ((selectedTeamMembers.size > 0) || assignedTester.trim());

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0">
            <AppHeader title="Create Test Round" showBack />

            <main className="container py-6 max-w-3xl">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Copy className="h-5 w-5" />
                            Create New Test Round
                        </CardTitle>
                        <CardDescription>
                            Duplicate a folder with all its scripts and create new test runs assigned to a tester
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Project Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="project">Project *</Label>
                            <Select
                                value={selectedProjectId}
                                onValueChange={setSelectedProjectId}
                                disabled={isLoadingProjects || isDuplicating}
                            >
                                <SelectTrigger id="project">
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(project => (
                                        <SelectItem key={project.id} value={String(project.id)}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Folder Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="folder">Source Folder *</Label>
                            <Select
                                value={selectedFolderId}
                                onValueChange={setSelectedFolderId}
                                disabled={!selectedProjectId || isLoadingFolders || isDuplicating}
                            >
                                <SelectTrigger id="folder">
                                    <SelectValue placeholder={isLoadingFolders ? "Loading folders..." : "Select a folder to duplicate"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {folderOptions.map(folder => (
                                        <SelectItem key={folder.id} value={folder.id}>
                                            <span style={{ marginLeft: `${folder.depth * 16}px` }}>
                                                {folder.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                All scripts in this folder will be duplicated
                            </p>
                        </div>

                        {/* New Round Name */}
                        <div className="space-y-2">
                            <Label htmlFor="roundName">New Round Name *</Label>
                            <Input
                                id="roundName"
                                placeholder="e.g., Sprint 15 Regression"
                                value={newRoundName}
                                onChange={(e) => setNewRoundName(e.target.value)}
                                disabled={isDuplicating}
                            />
                        </div>

                        {/* Tester Assignment */}
                        <div className="space-y-2">
                            <Label htmlFor="tester">Assigned Tester *</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="tester"
                                    placeholder="Tester name or email"
                                    value={assignedTester}
                                    onChange={(e) => setAssignedTester(e.target.value)}
                                    disabled={isDuplicating}
                                    className="pl-10"
                                />
                            </div>
                            
                            {/* Team Member Pills */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {teamMembers.map((member) => (
                                    <button
                                        key={member}
                                        type="button"
                                        onClick={() => {
                                            const next = new Set(selectedTeamMembers);
                                            if (next.has(member)) next.delete(member);
                                            else next.add(member);
                                            setSelectedTeamMembers(next);
                                            if (assignedTester === member) setAssignedTester('');
                                        }}
                                        disabled={isDuplicating}
                                        className={cn(
                                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                            selectedTeamMembers.has(member) 
                                                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        )}
                                    >
                                        {member}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Optional Build Info */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="build">Build (Optional)</Label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="build"
                                        placeholder="e.g., v2.5.0"
                                        value={buildInfo}
                                        onChange={(e) => setBuildInfo(e.target.value)}
                                        disabled={isDuplicating}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="browser">Browser (Optional)</Label>
                                <Input
                                    id="browser"
                                    placeholder="e.g., Chrome, Safari"
                                    value={browserInfo}
                                    onChange={(e) => setBrowserInfo(e.target.value)}
                                    disabled={isDuplicating}
                                />
                            </div>
                        </div>

                        {/* Progress Indicator */}
                        {isDuplicating && (
                            <div className="space-y-3 p-4 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm font-medium">Creating test round...</span>
                                </div>
                                <Progress value={(progress.current / progress.total) * 100} />
                                <p className="text-xs text-muted-foreground">{progress.message}</p>
                            </div>
                        )}

                        {/* Result Display */}
                        {result && !isDuplicating && (
                            <Alert variant={result.success ? "default" : "destructive"}>
                                {result.success ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                <AlertTitle>
                                    {result.success ? 'Test Round Created Successfully!' : 'Creation Failed'}
                                </AlertTitle>
                                <AlertDescription className="space-y-2">
                                    {result.success ? (
                                        <>
                                            <p>Created {result.createdScripts} scripts with {result.createdRuns} runs.</p>
                                            {result.newFolderId && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate(`/projects/${selectedProjectId}`)}
                                                >
                                                    <FolderOpen className="mr-2 h-4 w-4" />
                                                    View in Project
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <p>Encountered {result.errors.length} error(s):</p>
                                            <ul className="list-disc list-inside text-xs space-y-1">
                                                {result.errors.slice(0, 5).map((err, idx) => (
                                                    <li key={idx}>{err.error}</li>
                                                ))}
                                            </ul>
                                            {result.createdScripts > 0 && (
                                                <p className="text-xs mt-2">
                                                    Partial success: Created {result.createdScripts} scripts and {result.createdRuns} runs before errors occurred.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <Button
                            onClick={handleCreateRound}
                            disabled={!canSubmit}
                            className="w-full"
                            size="lg"
                        >
                            {isDuplicating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Test Round...
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Create Test Round
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </main>

            <BottomNav />
        </div>
    );
}
