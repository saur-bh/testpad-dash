import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Note } from '@/types/testpad';

interface NoteEditorProps {
    note?: Note;
    onSave: (content: string) => Promise<void>;
    onCancel: () => void;
    title?: string;
}

export function NoteEditor({ note, onSave, onCancel, title = 'Add Note' }: NoteEditorProps) {
    const [content, setContent] = useState(note?.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!content.trim()) {
            setError('Note content cannot be empty');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(content.trim());
            setContent('');
        } catch (err: any) {
            setError(err.message || 'Failed to save note');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="Enter your note here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                />

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-2">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !content.trim()}
                        className="flex-1"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Note'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
