'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Car, Building2, User, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/shared/Toast';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  currentUserId: string;
  onJobCreated?: (job: any) => void;
  initialJobType?: 'wrap' | 'deck';
}

interface CustomerOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface SalesRepOption {
  id: string;
  name: string;
  role: string;
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

const INPUT_CLASS = `w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200
  placeholder-gray-500 outline-none focus:border-purple-500 transition-colors`;

const SELECT_CLASS = `w-full bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200
  outline-none focus:border-purple-500 transition-colors`;

const LABEL_CLASS = 'block text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-1.5';

export default function NewJobModal({ isOpen, onClose, orgId, currentUserId, onJobCreated, initialJobType }: NewJobModalProps) {
  const router = useRouter();
  const [jobType, setJobType] = useState<'wrap' | 'deck'>(initialJobType ?? 'wrap');
  const [saving, setSaving] = useState(false);
  const { toast, xpToast, badgeToast } = useToast();

  // Lookups
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingSalesReps, setLoadingSalesReps] = useState(false);

  // Customer selection: '' = none selected, 'new' = manual entry, otherwise customer id
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('new');

  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    vehicleType: 'Box Truck',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    wrapScope: 'Full Wrap',
    deckType: 'New Build',
    deckMaterial: 'Composite',
    deckSqft: '',
    agentId: '',
    installDate: '',
    notes: '',
  });
  const supabase = createClient();

  // Load customers and sales reps on mount
  useEffect(() => {
    if (!isOpen) return;

    const loadCustomers = async () => {
      setLoadingCustomers(true);
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('org_id', orgId)
        .order('name');
      if (!error && data) {
        setCustomers(data);
      }
      setLoadingCustomers(false);
    };

    const loadSalesReps = async () => {
      setLoadingSalesReps(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('org_id', orgId)
        .eq('active', true)
        .in('role', ['sales_agent', 'admin', 'owner'])
        .order('name');
      if (!error && data) {
        setSalesReps(data);
      }
      setLoadingSalesReps(false);
    };

    loadCustomers();
    loadSalesReps();
  }, [isOpen, orgId]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (customerId === 'new') {
      // Clear fields for manual entry
      setForm((prev) => ({ ...prev, clientName: '', clientPhone: '', clientEmail: '' }));
    } else {
      // Auto-fill from selected customer
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        setForm((prev) => ({
          ...prev,
          clientName: customer.name || '',
          clientPhone: customer.phone || '',
          clientEmail: customer.email || '',
        }));
      }
    }
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
      type: jobType === 'wrap' ? 'wrap' : 'decking',
      title: form.clientName,
      status: 'active',
      division: jobType === 'wrap' ? 'wraps' : 'decking',
      service_division: jobType === 'wrap' ? 'wraps' : 'decking',
      pipe_stage: 'sales_in',
      priority: 'normal',
      customer_id: selectedCustomerId !== 'new' ? selectedCustomerId : null,
      agent_id: form.agentId || null,
      vehicle_desc: jobType === 'wrap'
        ? [
            form.vehicleYear,
            form.vehicleMake,
            form.vehicleModel,
            `${form.vehicleType} — ${form.wrapScope}`,
          ].filter(Boolean).join(' ')
        : `${form.deckType} — ${form.deckMaterial}`,
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
          ? {
              vehicle_type: form.vehicleType,
              vehicle_year: form.vehicleYear,
              vehicle_make: form.vehicleMake,
              vehicle_model: form.vehicleModel,
              wrap_scope: form.wrapScope,
            }
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
      setSaving(false);
    } else {
      onJobCreated?.(data);
      // Award create_lead XP
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_lead', sourceType: 'project', sourceId: data?.id }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
          if (res?.amount) xpToast(res.amount, 'New job created', res.leveledUp, res.newLevel)
          if (res?.newBadges?.length) badgeToast(res.newBadges)
        })
        .catch((error) => { console.error(error); })
      onClose();
      // Reset form
      setForm({
        clientName: '', clientPhone: '', clientEmail: '',
        vehicleType: 'Box Truck', vehicleYear: '', vehicleMake: '', vehicleModel: '',
        wrapScope: 'Full Wrap',
        deckType: 'New Build', deckMaterial: 'Composite', deckSqft: '',
        agentId: '', installDate: '', notes: '',
      });
      setSelectedCustomerId('new');
      setSaving(false);
      // Navigate to the new job
      router.push(`/jobs/${data.id}`);
    }
  };

  const isManualEntry = selectedCustomerId === 'new';

  return (
    <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center animate-in fade-in" onClick={onClose}>
      <div
        className="bg-[#0c1222] border border-[#2a3f6a] rounded-xl p-8 w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto
          shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-in zoom-in-95 slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-100 mb-5 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
          Create New Job
        </h2>

        {/* Job type selector */}
        <label className={LABEL_CLASS}>
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

        {/* Customer selection */}
        <label className={LABEL_CLASS}>Customer</label>
        <div className="relative mb-4">
          <select
            value={selectedCustomerId}
            onChange={(e) => handleCustomerSelect(e.target.value)}
            className={SELECT_CLASS}
            style={{ appearance: 'none', paddingRight: '2.5rem' }}
          >
            <option value="new">+ New Customer (manual entry)</option>
            {loadingCustomers && <option disabled>Loading customers...</option>}
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.email ? ` — ${c.email}` : ''}{c.phone ? ` — ${c.phone}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </div>

        {/* Client info - always show, but auto-filled when customer selected */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={LABEL_CLASS}>
              Client Name {!isManualEntry && <span className="text-purple-400 normal-case tracking-normal">(auto-filled)</span>}
            </label>
            <input
              value={form.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
              placeholder="Business or individual"
              readOnly={!isManualEntry}
              className={`${INPUT_CLASS} ${!isManualEntry ? 'opacity-70 cursor-default' : ''}`}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Phone</label>
            <input
              value={form.clientPhone}
              onChange={(e) => handleChange('clientPhone', e.target.value)}
              placeholder="(555) 123-4567"
              readOnly={!isManualEntry}
              className={`${INPUT_CLASS} ${!isManualEntry ? 'opacity-70 cursor-default' : ''}`}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className={LABEL_CLASS}>Email</label>
          <input
            value={form.clientEmail}
            onChange={(e) => handleChange('clientEmail', e.target.value)}
            placeholder="client@email.com"
            readOnly={!isManualEntry}
            className={`${INPUT_CLASS} ${!isManualEntry ? 'opacity-70 cursor-default' : ''}`}
          />
        </div>

        {/* Wrap-specific fields */}
        {jobType === 'wrap' && (
          <>
            {/* Vehicle Year / Make / Model */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className={LABEL_CLASS}>Year</label>
                <input
                  value={form.vehicleYear}
                  onChange={(e) => handleChange('vehicleYear', e.target.value)}
                  placeholder="2024"
                  maxLength={4}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Make</label>
                <input
                  value={form.vehicleMake}
                  onChange={(e) => handleChange('vehicleMake', e.target.value)}
                  placeholder="Ford"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Model</label>
                <input
                  value={form.vehicleModel}
                  onChange={(e) => handleChange('vehicleModel', e.target.value)}
                  placeholder="Transit"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* Vehicle Type + Wrap Scope */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={LABEL_CLASS}>Vehicle Type</label>
                <select
                  value={form.vehicleType}
                  onChange={(e) => handleChange('vehicleType', e.target.value)}
                  className={SELECT_CLASS}
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Wrap Scope</label>
                <select
                  value={form.wrapScope}
                  onChange={(e) => handleChange('wrapScope', e.target.value)}
                  className={SELECT_CLASS}
                >
                  {WRAP_SCOPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Deck-specific fields */}
        {jobType === 'deck' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={LABEL_CLASS}>Deck Type</label>
                <select
                  value={form.deckType}
                  onChange={(e) => handleChange('deckType', e.target.value)}
                  className={SELECT_CLASS}
                >
                  {DECK_TYPES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Material</label>
                <select
                  value={form.deckMaterial}
                  onChange={(e) => handleChange('deckMaterial', e.target.value)}
                  className={SELECT_CLASS}
                >
                  {DECK_MATERIALS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className={LABEL_CLASS}>Estimated SqFt</label>
              <input
                value={form.deckSqft}
                onChange={(e) => handleChange('deckSqft', e.target.value)}
                placeholder="Total square footage"
                className={INPUT_CLASS}
              />
            </div>
          </>
        )}

        {/* Assigned Sales Rep */}
        <div className="mb-4">
          <label className={LABEL_CLASS}>Assigned Sales Rep</label>
          <div className="relative">
            <select
              value={form.agentId}
              onChange={(e) => handleChange('agentId', e.target.value)}
              className={SELECT_CLASS}
              style={{ appearance: 'none', paddingRight: '2.5rem' }}
            >
              <option value="">Unassigned</option>
              {loadingSalesReps && <option disabled>Loading...</option>}
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name} ({rep.role.replace('_', ' ')})
                </option>
              ))}
            </select>
            <User
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Install date */}
        <div className="mb-4">
          <label className={LABEL_CLASS}>Target Install Date</label>
          <input
            type="date"
            value={form.installDate}
            onChange={(e) => handleChange('installDate', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className={LABEL_CLASS}>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder="Initial job notes, special requirements..."
            className={`${INPUT_CLASS} resize-none`}
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
