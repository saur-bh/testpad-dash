import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Folder, FileText, ChevronRight, ChevronDown, Play, Clock, User, StickyNote, Plus, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NotesList } from '@/components/ui/notes-list';
import { NoteEditor } from '@/components/ui/note-editor';
import { testpadApi } from '@/lib/testpad-api';
import type { Project, Folder as FolderType, FolderItem, ApiError, Note } from '@/types/testpad';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<FolderType | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!projectId) return;
    if (showRefreshing) setIsRefreshing(true);
    setError(null);

    try {
      // Fetch project info, folder structure, and notes
      const [projectData, foldersData, notesData] = await Promise.all([
        testpadApi.getProject(Number(projectId)),
        testpadApi.getFolders(Number(projectId)),
        testpadApi.getNotes(Number(projectId)),
      ]);

      setProject(projectData);
      setFolders(foldersData);
      setNotes(notesData);
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
  }, [projectId, navigate]);

  const handleCreateNote = async (content: string) => {
    if (!projectId) return;

    try {
      await testpadApi.createNote(Number(projectId), content);
      toast({ title: 'Note created', description: 'Your note has been saved successfully' });
      setIsAddingNote(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create note', variant: 'destructive' });
      throw err;
    }
  };

  const handleEditNote = async (content: string) => {
    if (!projectId || !editingNote) return;

    try {
      await testpadApi.updateNote(Number(projectId), editingNote.id, content);
      toast({ title: 'Note updated', description: 'Your note has been updated successfully' });
      setEditingNote(null);
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update note', variant: 'destructive' });
      throw err;
    }
  };

  useEffect(() => {
    if (!testpadApi.isConnected()) {
      navigate('/');
      return;
    }
    fetchData();
  }, [navigate, fetchData]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLatestRun = (runs?: any[]) => {
    if (!runs || runs.length === 0) return null;
    return runs.reduce((latest, run) => {
      const latestDate = latest.created ? new Date(latest.created).getTime() : 0;
      const runDate = run.created ? new Date(run.created).getTime() : 0;
      return runDate > latestDate ? run : latest;
    });
  };

  const renderFolderItem = (item: FolderItem, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(String(item.id));

    if (item.type === 'script') {
      const latestRun = getLatestRun(item.runs);

      // Script item - show script name and latest run
      return (
        <div
          key={item.id}
          className="rounded-lg border hover:bg-accent cursor-pointer transition-colors"
          style={{ marginLeft: `${depth * 20}px` }}
          onClick={() => navigate(`/scripts/${item.id}`)}
        >
          <div className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-info shrink-0" />
              <span className="flex-1 font-medium text-sm">{item.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>

            {/* Latest Run Info */}
            {latestRun ? (
              <div className="mt-2 ml-6 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    Run #{latestRun.id.slice(-6)}
                  </span>
                  {latestRun.tester && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {latestRun.tester}
                    </span>
                  )}
                  {latestRun.created && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(latestRun.created)}
                    </span>
                  )}
                </div>
                {latestRun.progress && latestRun.progress.total > 0 && (
                  <div className="text-xs">
                    <span className="text-chart-pass">{latestRun.progress.pass} pass</span>
                    {latestRun.progress.fail > 0 && <span className="text-chart-fail ml-2">{latestRun.progress.fail} fail</span>}
                    {latestRun.progress.block > 0 && <span className="text-chart-block ml-2">{latestRun.progress.block} block</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 ml-6 text-xs text-muted-foreground">
                No runs yet
              </div>
            )}
          </div>
        </div>
      );
    }

    // Folder item
    return (
      <div key={item.id}>
        <div
          className="flex items-center gap-2 rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => toggleFolder(String(item.id))}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <Folder className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 font-medium">{item.name}</span>
          {item.contents && (
            <span className="text-xs text-muted-foreground">
              {item.contents.filter(c => c.type === 'script').length} scripts
            </span>
          )}
        </div>
        {isExpanded && item.contents && (
          <div className="ml-4 mt-1 space-y-1">
            {item.contents.map((child) => renderFolderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <AppHeader title="Project" showBack />
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
        title={project?.name || 'Project'}
        showBack
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
        showProjectSelector={true}
        currentProjectId={project?.id}
      />

      <main className="container py-6">
        {error && (
          <ErrorBanner
            title="Failed to load project"
            message={error.message}
            onRetry={() => fetchData(true)}
            retryAfter={error.retryAfter}
            className="mb-6"
          />
        )}

        {project && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{project.name}</h2>
                  {project.description && (
                    <p className="mt-2 text-muted-foreground">{project.description}</p>
                  )}
                </div>
                <Button
                  onClick={() => navigate(`/create-round?projectId=${project.id}`)}
                  variant="default"
                  size="sm"
                  className="shrink-0"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Create Round
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes Section */}
        <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="mb-6">
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <StickyNote className="h-5 w-5" />
                    Notes
                    {notes.length > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        ({notes.length})
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {!isAddingNote && !editingNote && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAddingNote(true);
                          setIsNotesOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Note
                      </Button>
                    )}
                    {isNotesOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {isAddingNote && (
                  <NoteEditor
                    onSave={handleCreateNote}
                    onCancel={() => setIsAddingNote(false)}
                    title="Add New Note"
                  />
                )}

                {editingNote && (
                  <NoteEditor
                    note={editingNote}
                    onSave={handleEditNote}
                    onCancel={() => setEditingNote(null)}
                    title="Edit Note"
                  />
                )}

                {!isAddingNote && !editingNote && (
                  <NotesList
                    notes={notes}
                    onEdit={(note) => {
                      setEditingNote(note);
                      setIsAddingNote(false);
                    }}
                  />
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <div className="mb-4">
          <h3 className="text-lg font-semibold">Folders & Scripts</h3>
          <p className="text-sm text-muted-foreground">
            Click on folders to expand, click on scripts to view runs
          </p>
        </div>

        <Card>
          <CardContent className="p-2">
            {folders?.contents && folders.contents.length > 0 ? (
              <div className="space-y-1">
                {folders.contents.map((item) => renderFolderItem(item))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No folders or scripts in this project
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
