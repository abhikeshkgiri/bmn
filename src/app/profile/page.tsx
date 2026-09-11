'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Profile = { name?: string; email?: string; phone?: string; avatar?: string; notificationPreferences?: { inApp: boolean; push: boolean } };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [message, setMessage] = useState('');
  useEffect(() => { void fetch('/api/profile').then((response) => response.json()).then((result) => setProfile(result.data || {})); }, []);
  async function save() { const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) }); setMessage(response.ok ? 'Profile updated' : 'Unable to update profile'); }
  return <main className="max-w-2xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-6">Account settings</h1><Card className="p-6 space-y-4"><Input value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Name" /><Input value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email" type="email" /><Input value={profile.avatar || ''} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })} placeholder="Avatar URL" type="url" /><p className="text-sm text-foreground-secondary">Phone: {profile.phone || 'Not available'}</p><label className="flex gap-2"><input type="checkbox" checked={profile.notificationPreferences?.inApp ?? true} onChange={(e) => setProfile({ ...profile, notificationPreferences: { inApp: e.target.checked, push: profile.notificationPreferences?.push ?? true } })} /> In-app notifications</label><label className="flex gap-2"><input type="checkbox" checked={profile.notificationPreferences?.push ?? true} onChange={(e) => setProfile({ ...profile, notificationPreferences: { inApp: profile.notificationPreferences?.inApp ?? true, push: e.target.checked } })} /> Push notifications</label><Button variant="primary" onClick={() => void save()}>Save changes</Button>{message && <p className="text-sm">{message}</p>}</Card></main>;
}
