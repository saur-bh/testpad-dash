import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { testpadApi } from '@/lib/testpad-api';
import type { Project } from '@/types/testpad';
import { useNavigate } from 'react-router-dom';

interface ProjectSelectorProps {
    currentProjectId?: number;
    onProjectChange?: (projectId: number) => void;
}

export function ProjectSelector({ currentProjectId, onProjectChange }: ProjectSelectorProps) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const projectList = await testpadApi.getProjects();
                setProjects(projectList);

                // Set current project if provided
                if (currentProjectId) {
                    const current = projectList.find(p => p.id === currentProjectId);
                    if (current) setSelectedProject(current);
                }
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (testpadApi.isConnected()) {
            fetchProjects();
        }
    }, [currentProjectId]);

    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
        setOpen(false);

        if (onProjectChange) {
            onProjectChange(project.id);
        } else {
            // Default behavior: navigate to project detail
            navigate(`/projects/${project.id}`);
        }
    };

    if (isLoading) {
        return (
            <Button variant="outline" disabled className="w-[200px] justify-between">
                <span className="text-muted-foreground">Loading...</span>
            </Button>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                >
                    <div className="flex items-center gap-2 truncate">
                        <FolderOpen className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                            {selectedProject ? selectedProject.name : 'Select project...'}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search projects..." />
                    <CommandEmpty>No project found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                        {projects.map((project) => (
                            <CommandItem
                                key={project.id}
                                value={project.name}
                                onSelect={() => handleSelectProject(project)}
                            >
                                <Check
                                    className={cn(
                                        'mr-2 h-4 w-4',
                                        selectedProject?.id === project.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                />
                                <span className="truncate">{project.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
