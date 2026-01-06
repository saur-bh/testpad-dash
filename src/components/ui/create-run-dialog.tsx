import { useState } from 'react';
import { Plus, User, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { testpadApi } from '@/lib/testpad-api';
import { toast } from '@/hooks/use-toast';

interface CreateRunDialogProps {
    scriptId: number;
    onRunCreated?: () => void;
}

export function CreateRunDialog({ scriptId, onRunCreated }: CreateRunDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [testerName, setTesterName] = useState('');
    const [buildInfo, setBuildInfo] = useState('');
    const [browserInfo, setBrowserInfo] = useState('');
    const [tags, setTags] = useState('ALL');

    const handleCreate = async () => {
        if (!testerName.trim()) {
            toast({
                title: 'Error',
                description: 'Tester name is required',
                variant: 'destructive',
            });
            return;
        }

        setIsCreating(true);

        try {
            await testpadApi.createRun(scriptId, {
                headers: {
                    _tester: testerName.trim(),
                    _tags: tags.trim() || 'ALL',
                    ...(buildInfo.trim() && { build: buildInfo.trim() }),
                    ...(browserInfo.trim() && { browser: browserInfo.trim() }),
                },
                results: {},
            });

            toast({
                title: 'Run created',
                description: `New test run assigned to ${testerName}`,
            });

            // Reset form
            setTesterName('');
            setBuildInfo('');
            setBrowserInfo('');
            setTags('ALL');
            setIsOpen(false);

            // Notify parent to refresh
            onRunCreated?.();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.message || 'Failed to create run',
                variant: 'destructive',
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Run
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Test Run</DialogTitle>
                    <DialogDescription>
                        Assign a new test run to a tester
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Tester Name */}
                    <div className="space-y-2">
                        <Label htmlFor="tester">Tester Name *</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="tester"
                                placeholder="e.g., John Doe"
                                value={testerName}
                                onChange={(e) => setTesterName(e.target.value)}
                                disabled={isCreating}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                            id="tags"
                            placeholder="e.g., ALL, SMOKE, REGRESSION"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            disabled={isCreating}
                        />
                    </div>

                    {/* Build Info */}
                    <div className="space-y-2">
                        <Label htmlFor="build">Build (Optional)</Label>
                        <div className="relative">
                            <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="build"
                                placeholder="e.g., v2.5.0"
                                value={buildInfo}
                                onChange={(e) => setBuildInfo(e.target.value)}
                                disabled={isCreating}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Browser Info */}
                    <div className="space-y-2">
                        <Label htmlFor="browser">Browser (Optional)</Label>
                        <Input
                            id="browser"
                            placeholder="e.g., Chrome, Safari"
                            value={browserInfo}
                            onChange={(e) => setBrowserInfo(e.target.value)}
                            disabled={isCreating}
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={handleCreate}
                        disabled={isCreating || !testerName.trim()}
                        className="flex-1"
                    >
                        {isCreating ? 'Creating...' : 'Create Run'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={isCreating}
                    >
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
