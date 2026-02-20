'use client';

import { Check } from 'lucide-react'

const STAGES = [
  { key: 'sales_in', label: 'Sales Intake', color: '#4f7fff' },
  { key: 'production', label: 'Production', color: '#22c07a' },
  { key: 'install', label: 'Install', color: '#22d3ee' },
  { key: 'prod_review', label: 'QC Review', color: '#f59e0b' },
  { key: 'sales_close', label: 'Sales Close', color: '#8b5cf6' },
];

interface ProgressTicksProps {
  currentStage: string; // pipe_stage value from project
  className?: string;
  size?: 'sm' | 'md';
}

export default function ProgressTicks({ currentStage, className = '', size = 'md' }: ProgressTicksProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);
  const dotSize = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs';
  const labelSize = size === 'sm' ? 'text-[8px]' : 'text-[9px]';

  return (
    <div className={`relative ${className}`}>
      {/* Connecting line */}
      <div className="absolute top-3.5 left-3.5 right-3.5 h-0.5 bg-[#1e2d4a] z-0">
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{
            width: currentIndex >= 0 ? `${(currentIndex / (STAGES.length - 1)) * 100}%` : '0%',
            background: 'linear-gradient(90deg, #22c55e, #a855f7)',
          }}
        />
      </div>

      {/* Steps */}
      <div className="flex items-center relative z-[2]">
        {STAGES.map((stage, i) => {
          const state = i < currentIndex ? 'completed' : i === currentIndex ? 'current' : 'pending';

          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center">
              <div
                className={`${dotSize} rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${
                  state === 'completed'
                    ? 'bg-green-500 border-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                    : state === 'current'
                    ? 'bg-purple-500 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse'
                    : 'bg-[#111827] border-[#1e2d4a] text-gray-500'
                }`}
              >
                {state === 'completed' ? <Check size={12} /> : i + 1}
              </div>
              <span
                className={`${labelSize} font-semibold tracking-wide uppercase mt-1 text-center ${
                  state === 'completed'
                    ? 'text-green-400'
                    : state === 'current'
                    ? 'text-purple-400'
                    : 'text-gray-600'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
