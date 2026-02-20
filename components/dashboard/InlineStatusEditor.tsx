'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, MapPin } from 'lucide-react';

const STATUS_OPTIONS = [
  { key: 'estimate', label: 'Estimate', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  { key: 'active', label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  { key: 'in_production', label: 'In Production', color: '#22c07a', bg: 'rgba(34,192,122,0.15)', border: 'rgba(34,192,122,0.3)' },
  { key: 'install_scheduled', label: 'Install Scheduled', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)' },
  { key: 'installed', label: 'Installed', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  { key: 'qc', label: 'QC', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  { key: 'closing', label: 'Closing', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
  { key: 'closed', label: 'Closed', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
];

const STAGE_OPTIONS = [
  { key: 'sales_in', label: 'Sales Intake', color: '#4f7fff', bg: 'rgba(79,127,255,0.15)', border: 'rgba(79,127,255,0.3)' },
  { key: 'production', label: 'Production', color: '#22c07a', bg: 'rgba(34,192,122,0.15)', border: 'rgba(34,192,122,0.3)' },
  { key: 'install', label: 'Install', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)', border: 'rgba(34,211,238,0.3)' },
  { key: 'prod_review', label: 'QC Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  { key: 'sales_close', label: 'Sales Close', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
];

interface InlineChipProps {
  projectId: string;
  type: 'status' | 'stage';
  value: string;
  onUpdate?: (newValue: string) => void;
}

export default function InlineStatusEditor({ projectId, type, value, onUpdate }: InlineChipProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const options = type === 'status' ? STATUS_OPTIONS : STAGE_OPTIONS;
  const field = type === 'status' ? 'status' : 'pipe_stage';
  const activeOption = options.find((o) => o.key === current) || options[0];

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (newValue: string) => {
    setSaving(true);
    setCurrent(newValue);
    setOpen(false);

    const { error } = await supabase
      .from('projects')
      .update({ [field]: newValue, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) {
      console.error(`Failed to update ${type}:`, error);
      setCurrent(value); // revert
    } else {
      onUpdate?.(newValue);
    }
    setSaving(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Chip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="px-3 py-1 rounded-full text-xs font-bold tracking-wide cursor-pointer 
          transition-all duration-200 hover:scale-105 hover:brightness-125 select-none"
        style={{
          background: activeOption.bg,
          color: activeOption.color,
          border: `1px solid ${activeOption.border}`,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {type === 'status' ? <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'currentColor', verticalAlign:'middle', marginRight:3 }} /> : <MapPin size={10} style={{ display:'inline', verticalAlign:'middle', marginRight:3 }} />} {activeOption.label}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-1.5 left-0 min-w-[180px] z-50
            bg-[#1a2540] border border-[#2a3f6a] rounded-lg py-1.5
            shadow-[0_12px_40px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              className={`w-full flex items-center gap-2 px-3.5 py-2 text-sm font-semibold 
                transition-colors hover:bg-[#162036] text-left ${
                  opt.key === current ? 'text-white' : 'text-gray-300'
                }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: opt.color }}
              />
              {opt.label}
              {opt.key === current && (
                <Check size={11} className="ml-auto text-green-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
