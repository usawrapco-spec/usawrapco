'use client'

import { useState } from 'react'
import MockupBox from '@/components/projects/MockupBox'
import ProofingPanel from '@/components/projects/ProofingPanel'
import JobChat from '@/components/chat/JobChat'
import { Image as ImageIcon, CheckSquare, MessageSquare } from 'lucide-react'
import type { Profile, Project } from '@/types'

interface Props {
  project: Project
  profile: Profile
  orgId: string
  currentUserId: string
  currentUserName: string
}

type Section = 'mockups' | 'proofs' | 'chat'

export default function JobDesignTab({ project, profile, orgId, currentUserId, currentUserName }: Props) {
  const [section, setSection] = useState<Section>('mockups')

  const fd = (project.form_data as any) || {}
  const customerName = project.customer?.name || fd.client || fd.clientName || project.title || ''
  const customerPhone = fd.clientPhone || fd.phone || (project.customer as any)?.phone || null
  const customerEmail = fd.clientEmail || fd.email || project.customer?.email || null
  const vehicle = project.vehicle_desc || [fd.vehicleYear, fd.vehicleMake, fd.vehicleModel].filter(Boolean).join(' ') || ''
  const proofToken = fd.proof_token || null

  const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'mockups', label: 'Mockups', icon: <ImageIcon size={13} /> },
    { key: 'proofs',  label: 'Proofs',  icon: <CheckSquare size={13} /> },
    { key: 'chat',    label: 'Designer Chat', icon: <MessageSquare size={13} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section selector */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: section === s.key ? 'var(--accent)' : 'transparent',
              color: section === s.key ? '#fff' : 'var(--text2)',
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {section === 'mockups' && (
        <MockupBox
          projectId={project.id}
          orgId={orgId}
          proofToken={proofToken}
          customerName={customerName}
          customerPhone={customerPhone}
          customerEmail={customerEmail}
          vehicle={vehicle}
        />
      )}

      {section === 'proofs' && (
        <ProofingPanel project={project} profile={profile} />
      )}

      {section === 'chat' && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', height: 480 }}>
          <JobChat
            projectId={project.id}
            orgId={orgId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            customerName={customerName}
            installerName=""
            defaultChannel="designer"
          />
        </div>
      )}
    </div>
  )
}
