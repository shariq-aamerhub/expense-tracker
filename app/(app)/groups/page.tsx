'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Group } from '@/lib/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetch('/api/groups')
      .then((r) => r.json())
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  async function createGroup() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const group = await res.json();
      setGroups([...groups, group]);
      setShowCreate(false);
      setNewName('');
      showToast('Group created!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Spinner size="lg" className="text-brand-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Groups</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ New Group</Button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-gray-400 text-sm">No groups yet</p>
          <Button onClick={() => setShowCreate(true)}>Create your first group</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="hover:border-gray-200 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{group.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{group.memberIds.length} members</p>
                  </div>
                  <div className="flex -space-x-2">
                    {group.memberIds.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center text-xs font-bold text-brand-700"
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Group">
        <div className="space-y-4">
          <Input
            label="Group Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Home Expenses"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') createGroup(); }}
          />
          <Button fullWidth onClick={createGroup} loading={creating}>Create Group</Button>
        </div>
      </Modal>
    </div>
  );
}
