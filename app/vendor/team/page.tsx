'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Trash2, UserCheck, UserX, Mail, Clock, TriangleAlert as AlertTriangle, ShieldCheck } from 'lucide-react';

// Uses vendor_staff table (replaced staff_roles + team_members in fix_consolidate_staff_tables)
type StaffRole = {
  id: string;
  vendor_id: string;
  auth_user_id: string | null;
  name: string | null;
  email: string;
  role: 'owner' | 'manager' | 'front_desk' | 'support';
  is_active: boolean;
  created_at: string;
};

export default function VendorTeamPage() {
  const router = useRouter();
  const { vendor, role } = useVendor();
  const [members, setMembers] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (role === 'front_desk') router.push('/vendor/dashboard');
  }, [role, router]);

  const loadMembers = useCallback(async () => {
    if (!vendor) return;
    const { data } = await supabase
      .from('vendor_staff')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: true });
    setMembers((data || []) as StaffRole[]);
    setLoading(false);
  }, [vendor]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  if (role === 'front_desk') return null;

  const activeCount = members.filter((m) => m.is_active).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !newName.trim() || !newEmail.trim()) {
      setError('Name and Email are required.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: insertError } = await supabase
      .from('vendor_staff')
      .insert({
        vendor_id: vendor.id,
        name: newName.trim(),
        email: newEmail.trim(),
        role: 'front_desk',
        is_active: true,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewName('');
      setNewEmail('');
      setShowAdd(false);
      await loadMembers();
    }
    setSaving(false);
  };

  const toggleActive = async (member: StaffRole) => {
    await supabase.from('vendor_staff').update({ is_active: !member.is_active }).eq('id', member.id);
    await loadMembers();
  };

  const deleteMember = async (member: StaffRole) => {
    await supabase.from('vendor_staff').delete().eq('id', member.id);
    await loadMembers();
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-slate-700 h-96 rounded-xl m-8" />;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Staff Management</h1>
          <p className="text-gray-500 font-medium mt-1">Manage your front desk team\'s access to the operations portal.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-ms-orange hover:bg-ms-orange-hover text-white font-bold shadow-md">
          <Plus className="w-4 h-4 mr-2" /> Add Staff Member
        </Button>
      </div>

      {error && (
        <Alert className="border-rose-200 bg-rose-50 rounded-xl shadow-sm">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <AlertDescription className="text-rose-800 font-bold ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {members.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-600 rounded-full mx-auto flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-gray-400 dark:text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Staff Members</h3>
          <p className="text-gray-500 font-medium max-w-sm mx-auto mb-6">
            Add front desk staff to allow them to confirm check-ins and manage today\'s roster.
          </p>
          <Button onClick={() => setShowAdd(true)} className="bg-ms-orange hover:bg-ms-orange-hover text-white font-bold">
            <Plus className="w-4 h-4 mr-2" /> Add First Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {members.map((member) => (
            <div
              key={member.id}
              className={`bg-white border rounded-xl p-5 transition-all shadow-sm ${member.is_active ? 'border-gray-200 dark:border-transparent' : 'border-gray-100 dark:border-transparent opacity-70 bg-gray-50'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${member.is_active ? 'bg-ms-orange-light text-ms-orange border-ms-orange-border dark:bg-black dark:border-transparent' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-black'}`}>
                    {(member.name || member.email).split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${member.is_active ? 'bg-ms-teal-light text-ms-teal dark:bg-ms-teal dark:text-white' : 'bg-gray-200 text-gray-600 dark:bg-black'}`}>
                        {member.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" /> {member.email}
                      </p>
                      <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-gray-400" />
                        <span className="capitalize">{member.role.replace('_', ' ')}</span> View Only
                      </p>
                      <p className="text-xs text-gray-400 font-medium flex items-center gap-2 pt-1 border-t dark:border-zinc-700 border-gray-100 mt-2">
                        <Clock className="w-3 h-3" /> Added {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(member)} className={`h-8 font-bold active:scale-95 ${member.is_active ? 'text-gray-600 hover:text-rose-600 hover:bg-rose-50 dark:bg-rose-700 dark:text-white dark:hover:bg-rose-800 ' : 'text-ms-teal hover:bg-ms-teal-light dark:bg-black'}`}>
                    {member.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMember(member)} className="h-8 text-gray-400 hover:text-rose-600 dark:hover:bg-transparent hover:bg-rose-50 px-2 mt-auto active:scale-95">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adding Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Add Staff Member</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">Front desk staff will receive their login credentials at this email address.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Full Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Sarah Jennings" required className="bg-white border-gray-200 h-11 text-gray-900 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="sarah@motel.com" required className="bg-white border-gray-200 h-11 text-gray-900 font-medium" />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 dark:bg-transparent dark:border-transparent">
              <p className="text-xs font-semibold text-blue-800"><span className='text-ms-orange'>Note:</span> New staff are automatically assigned to the "Front Desk" role. They cannot access financial analytics or company settings.</p>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="border-gray-200 font-bold text-gray-600">Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-ms-orange hover:bg-ms-orange-hover text-white font-bold px-6">
                {saving ? 'Adding...' : 'Add Front Desk Staff'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
