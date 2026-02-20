import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { Truck, CheckCircle, Clock, Palette, Package, Wrench, Star } from 'lucide-react'

interface Props {
  params: { token: string }
}

const STAGES = [
  { key: 'sales_in',    label: 'Order Received',  icon: CheckCircle, color: '#22c07a' },
  { key: 'production',  label: 'In Production',   icon: Package,     color: '#4f7fff' },
  { key: 'install',     label: 'Installation',    icon: Wrench,      color: '#22d3ee' },
  { key: 'prod_review', label: 'Quality Check',   icon: Star,        color: '#f59e0b' },
  { key: 'sales_close', label: 'Final Review',    icon: Clock,       color: '#8b5cf6' },
  { key: 'done',        label: 'Complete',        icon: CheckCircle, color: '#22c07a' },
]

export default async function TrackPage({ params }: Props) {
  const admin = getSupabaseAdmin()

  // Look up by customer_intake_tokens
  const { data: intake } = await admin
    .from('customer_intake_tokens')
    .select('*, project:project_id(*)')
    .eq('token', params.token)
    .single()

  if (!intake) notFound()

  const project = intake.project as any
  const fd      = (project?.form_data as any) || {}
  const stage   = project?.pipe_stage || 'sales_in'
  const stageIdx = STAGES.findIndex(s => s.key === stage)

  const hasDesign   = fd.designNeeded || fd.driveLink
  const designDone  = fd.approvalStatus === 'approved'
  const signoffDone = (project?.actuals as any)?.installerSignoff === 'approved'

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', padding: '40px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Truck size={28} style={{ color: '#4f7fff' }} />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900 }}>
              USA WRAP CO
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
            Job Status
          </h1>
          <p style={{ color: '#9299b5', fontSize: 14 }}>
            {fd.client || project?.title || 'Your Project'}
            {fd.vehicle || project?.vehicle_desc ? ` · ${fd.vehicle || project?.vehicle_desc}` : ''}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>
            Progress
          </div>
          <div style={{ position: 'relative' }}>
            {/* Track line */}
            <div style={{ position: 'absolute', top: 18, left: 18, right: 18, height: 3, background: '#1a1d27', zIndex: 0 }} />
            <div style={{
              position: 'absolute', top: 18, left: 18, height: 3, zIndex: 1,
              background: 'linear-gradient(to right, #22c07a, #4f7fff)',
              width: `${Math.min(100, (stageIdx / (STAGES.length - 1)) * 100)}%`,
              transition: 'width 0.5s ease',
            }} />

            {/* Stage dots */}
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
              {STAGES.map((s, i) => {
                const done    = i < stageIdx
                const active  = i === stageIdx
                const Icon    = s.icon
                return (
                  <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: done ? '#22c07a' : active ? s.color : '#1a1d27',
                      border: `2px solid ${done ? '#22c07a' : active ? s.color : '#2a2d3a'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.3s ease',
                    }}>
                      <Icon size={16} style={{ color: done || active ? '#fff' : '#5a6080' }} />
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: active ? 800 : 600,
                      color: done ? '#22c07a' : active ? s.color : '#5a6080',
                      textAlign: 'center', maxWidth: 60, lineHeight: 1.3,
                    }}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Current status card */}
        <div style={{ background: '#13151c', border: `1px solid ${STAGES[stageIdx]?.color || '#1a1d27'}40`, borderRadius: 14, padding: '20px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Current Status
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: STAGES[stageIdx]?.color || '#e8eaed', marginBottom: 6 }}>
            {STAGES[stageIdx]?.label || 'In Progress'}
          </div>
          {project?.install_date && (
            <div style={{ fontSize: 13, color: '#9299b5' }}>
              Expected completion: {new Date(project.install_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 14, padding: '20px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Job Milestones
          </div>
          {[
            { label: 'Order Received & Confirmed', done: stageIdx >= 0 },
            { label: 'Deposit / Contract Signed', done: fd.deposit && fd.contractSigned },
            { label: 'Design Approved', done: !hasDesign || designDone },
            { label: 'Production Brief Signed Off', done: signoffDone },
            { label: 'Vehicle Installed', done: stageIdx >= 2 },
            { label: 'Quality Check Passed', done: stageIdx >= 3 },
            { label: 'Job Complete', done: stage === 'done' || project?.status === 'closed' },
          ].map(({ label, done }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #1a1d27' }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: done ? '#22c07a' : '#1a1d27',
                border: `2px solid ${done ? '#22c07a' : '#2a2d3a'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done && <CheckCircle size={10} style={{ color: '#fff' }} />}
              </div>
              <span style={{ fontSize: 13, color: done ? '#e8eaed' : '#5a6080', fontWeight: done ? 600 : 400 }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Contact footer */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ fontSize: 12, color: '#5a6080' }}>
            Questions about your project? Contact us at{' '}
            <a href="mailto:info@usawrapco.com" style={{ color: '#4f7fff', textDecoration: 'none' }}>
              info@usawrapco.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
