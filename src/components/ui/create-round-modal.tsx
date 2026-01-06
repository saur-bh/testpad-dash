import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';
import { Button } from './button';

export interface CreateRoundModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; assignee: string; }) => void;
  defaultName?: string;
}

export function CreateRoundModal({ open, onClose, onCreate, defaultName }: CreateRoundModalProps) {
  const [name, setName] = useState(defaultName || '');
  const [assignee, setAssignee] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    await onCreate({ name, assignee });
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogHeader>
        <DialogTitle>Create New Test Round</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-1">Round Name</div>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Regression – Sprint 20"
              required
            />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Assign to Tester</div>
            <Input
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              placeholder="e.g. Archana"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name || !assignee || loading}>
              {loading ? <span className="animate-spin mr-2 inline-block w-4 h-4 border-2 border-t-2 border-gray-300 rounded-full"></span> : null}
              Create Round
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateRoundModal;
