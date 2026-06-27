'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Group, PublicUser } from '@/lib/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';

interface GroupDetail extends Group {
  members: PublicUser[];
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${id}`).then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ])
      .then(([g, me]) => {
        setGroup(g);
        setCurrentUserId(me.id);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function addMember() {
    if (!emailInput.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/groups/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const newMember = await res.json();
      setGroup((g) => g ? { ...g, members: [...g.members, newMember], memberIds: [...g.memberIds, newMember.id] } : g);
      setEmailInput('');
      showToast(`${newMember.name} added to group`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this member?')) return;
    try {
      const res = await fetch(`/api/groups/${id}/members/${memberId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setGroup((g) => g ? {
        ...g,
        members: g.members.filter((m) => m.id !== memberId),
        memberIds: g.memberIds.filter((mid) => mid !== memberId),
      } : g);
      showToast('Member removed', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  }

  async function deleteGroup() {
    if (!confirm('Delete this group? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push('/groups');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Spinner size="lg" className="text-brand-600" /></div>;
  if (!group) return <p className="text-gray-400 text-center py-16">Group not found</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Members ({group.members.length})</h2>
        <div className="space-y-2">
          {group.members.map((member) => {
            const initials = member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                </div>
                {group.createdBy === currentUserId && member.id !== currentUserId && (
                  <button onClick={() => removeMember(member.id)} className="text-gray-300 hover:text-red-400 p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Member</h2>
        <div className="flex gap-2">
          <Input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="member@example.com"
            type="email"
            className="flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') addMember(); }}
          />
          <Button onClick={addMember} loading={adding} size="md">Add</Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">The person must already have an account.</p>
      </Card>

      {group.createdBy === currentUserId && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Danger Zone</p>
          <Button variant="danger" size="sm" onClick={deleteGroup}>Delete Group</Button>
        </div>
      )}
    </div>
  );
}
