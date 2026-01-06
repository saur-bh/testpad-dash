import { useState } from 'react';
import { Pencil, Trash2, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Note } from '@/types/testpad';
import { cn } from '@/lib/utils';

interface NotesListProps {
    notes: Note[];
    onEdit?: (note: Note) => void;
    onDelete?: (noteId: string) => void;
    className?: string;
}

export function NotesList({ notes, onEdit, onDelete, className }: NotesListProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (notes.length === 0) {
        return (
            <div className={cn('text-center py-8 text-muted-foreground', className)}>
                No notes yet. Add a note to get started.
            </div>
        );
    }

    return (
        <div className={cn('space-y-3', className)}>
            {notes.map((note) => (
                <Card key={note.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm whitespace-pre-wrap break-words">
                                    {note.content}
                                </p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(note.created)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                {onEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => onEdit(note)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                )}
                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => onDelete(note.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
