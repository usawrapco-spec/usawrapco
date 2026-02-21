'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Car, Building2 } from 'lucide-react';
import { useToast } from '@/components/shared/Toast';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  currentUserId: string;
  onJobCreated?: (job: any) => void;
}

const VEHICLE_TYPES = [
  'Small Car', 'Med Car', 'Full Car',
  'Sm Truck', 'Med Truck', 'Full Truck',
  'Med Van', 'Large Van', 'XL Van', 'XXL Van',
  'Box Truck', 'Trailer',
];

const WRAP_SCOPES = ['Full Wrap', 'Partial Wrap', 'Half Wrap', '3/4 Wrap', 'Decal Package', 'Color Change'];

const DECK_TYPES = ['New Build', 'Resurface', 'Repair', 'Extension'];
const DECK_MATERIALS = ['Composite', 'PVC', 'Hardwood', 'Pressure-Treated', 'Cedar'];

export default function NewJobModal({ isOpen, onClose, orgId, currentUserId, onJobCreated }: NewJobModalProps) {
  const [jobType, setJobType] = useState<'wrap' | 'deck'>('wrap');
  const [saving, setSaving] = useState(false);
  const { toast, xpToast, badgeToast } = useToast();
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    vehicleType: 'Box Truck',
    wrapScope: 'Full Wrap',
    deckType: 'New Build',
    deckMaterial: 'Composite',
    deckSqft: '',
    agentId: '',
    installDate: '',
    notes: '',
  });
  const supabase = createClient();

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.clientName.trim()) { toast('Client name is required', 'warning'); return; }
    setSaving(true);

    const jobId = jobType === 'wrap'
      ? `WQ-${Date.now()}`
      : `DK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const projectData = {
      id: crypto.randomUUID(),
      org_id: orgId,
      type: jobType === 'wrap' ? 'commercial' : 'decking',
      title: form.clientName,
      status: 'active',
      division: jobType,
      pipe_stage: 'sales',
      priority: 'normal',
      vehicle_desc: jobType === 'wrap' ? `${form.vehicleType} — ${form.wrapScope}` : `${form.deckType} — ${form.deckMaterial}`,
      install_date: form.installDate || null,
      revenue: 0,
      profit: 0,
      gpm: 0,
      commission: 0,
      form_data: {
        job_id: jobId,
        client_name: form.clientName,
        client_phone: form.clientPhone,
        client_email: form.clientEmail,
        ...(jobType === 'wrap'
          ? { vehicle_type: form.vehicleType, wrap_scope: form.wrapScope }
          : { deck_type: form.deckType, deck_material: form.deckMaterial, deck_sqft: form.deckSqft }),
        notes: form.notes,
      },
      fin_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create job:', error);
      toast('Error creating job', 'error');
    } else {
      onJobCreated?.(data);
      // Award create_lead XP
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_lead', sourceType: 'project', sourceId: data?.id }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((res: {  amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
          if (res?.amount) xpToast(res.amount, 'New job created', res.leveledUp, res.newLevel)
          if (res?.newBadges?.length) badgeToast(res.newBadges)
        })
        .catch(() => {})
      onClose();
      // Reset form
      setForm({
        clientName: '', clientPhone: '', clientEmail: '',
        vehicleType: 'Box Truck', wrapScope: 'Full Wrap',
        deckType: 'New Build', deckMaterial: 'Composite', deckSqft: '',
        agentId: '', installDate: '', notes: '',
      });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center animate-in fade-in" onClick={onClose}>
      <div
        className="bg-[#0c1222] border border-[#2a3f6a] rounded-xl p-8 w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto
          shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-in zoom-in-95 slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-100 mb-5 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
          Create New Job
        </h2>

        {/* Job type selector */}
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-2.5">
          Job Type
        </label>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setJobType('wrap')}
            className={`p-5 rounded-xl border-2 text-center transition-all ${
              jobType === 'wrap'
                ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                : 'border-[#1e2d4a] bg-[#111827] hover:border-[#2a3f6a]'
            }`}
          >
            <div className="mb-2 flex justify-center"><Car size={32} /></div>
            <div className="text-base font-bold">Vehicle Wrap</div>
            <div className="text-xs text-gray-500 mt-1">Cars, trucks, vans, trailers</div>
          </button>
          <button
            onClick={() => setJobType('deck')}
            className={`p-5 rounded-xl border-2 text-center transition-all ${
              jobType === 'deck'
                ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'border-[#1e2d4a] bg-[#111827] hover:border-[#2a3f6a]'
            }`}
          >
            <div className="mb-2 flex justify-center"><Building2 size={32} /></div>
            <div className="text-base font-bold">Decking</div>
            <div className="text-xs text-gray-500 mt-1">Builds, resurfacing, composite</div>
          </button>
        </div>

        {/* Client info */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Client Name</label>
            <input
              value={form.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
              placeholder="Business or individual"
              className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 
                placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Phone</label>
            <input
              value={form.clientPhone}
              onChange={(e) => handleChange('clientPhone', e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 
                placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Email</label>
          <input
            value={form.clientEmail}
            onChange={(e) => handleChange('clientEmail', e.target.value)}
            placeholder="client@email.com"
            className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 
              placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Wrap-specific fields */}
        {jobType === 'wrap' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Vehicle Type</label>
              <select
                value={form.vehicleType}
                onChange={(e) => handleChange('vehicleType', e.target.value)}
                className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-purple-500"
              >
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Wrap Scope</label>
              <select
                value={form.wrapScope}
                onChange={(e) => handleChange('wrapScope', e.target.value)}
                className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-purple-500"
              >
                {WRAP_SCOPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Deck-specific fields */}
        {jobType === 'deck' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Deck Type</label>
                <select
                  value={form.deckType}
                  onChange={(e) => handleChange('deckType', e.target.value)}
                  className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-purple-500"
                >
                  {DECK_TYPES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Material</label>
                <select
                  value={form.deckMaterial}
                  onChange={(e) => handleChange('deckMaterial', e.target.value)}
                  className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-purple-500"
                >
                  {DECK_MATERIALS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Estimated SqFt</label>
              <input
                value={form.deckSqft}
                onChange={(e) => handleChange('deckSqft', e.target.value)}
                placeholder="Total square footage"
                className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 
                  placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </>
        )}

        {/* Install date */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Target Install Date</label>
          <input
            type="date"
            value={form.installDate}
            onChange={(e) => handleChange('installDate', e.target.value)}
            className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none focus:border-purple-500"
          />
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder="Initial job notes, special requirements..."
            className="w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 
              placeholder-gray-500 outline-none focus:border-purple-500 transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 py-3.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg 
              font-bold text-sm hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Job'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3.5 bg-[#111827] text-gray-400 border border-[#1e2d4a] rounded-lg 
              font-bold text-sm hover:text-gray-200 hover:border-[#2a3f6a] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
