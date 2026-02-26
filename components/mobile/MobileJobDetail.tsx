'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  MoreVertical,
  Trash2,
  User,
  Wrench,
  CalendarDays,
  Clock,
  Camera,
  Send,
  Play,
  Pause,
  Square,
  Flag,
  Check,
  AlertTriangle,
  FileText,
  DollarSign,
  Activity,
  ClipboardCheck,
  Package,
  Hammer,
  Shield,
  Lock,
  Image as ImageIcon,
} from 'lucide-react'
import {
  stageFor,
  gpmColor,
  formatK,
  ROLE_TABS,
  ALL_TABS,
  type MobileJob,
  type DemoRole,
} from './mobileConstants'
import MobileSignatureModal from './MobileSignatureModal'

export default function MobileJobDetail({
  job,
  role,
  onBack,
}: {
  job: MobileJob
  role: DemoRole
  onBack: () => void
}) {
  const stage = stageFor(job.stage)
  const visibleTabs = ALL_TABS.filter(t => ROLE_TABS[role].includes(t.key))
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key ?? 'overview')
  const [showMenu, setShowMenu] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [timerActive, setTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)

  const profit = job.revenue - job.cost

  // ─── Tab content renderer ──────────────────────────────────
  function renderTab() {
    switch (activeTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow label="Customer" value={job.customer} />
            <InfoRow label="Vehicle" value={job.vehicle} />
            <InfoRow label="Revenue" value={`$${job.revenue.toLocaleString()}`} color="var(--text1)" mono />
            <InfoRow label="Cost" value={`$${job.cost.toLocaleString()}`} color="var(--text2)" mono />
            <InfoRow label="Profit" value={`$${profit.toLocaleString()}`} color="var(--green)" mono />
            <InfoRow label="GPM" value={`${job.gpm.toFixed(1)}%`} color={gpmColor(job.gpm)} mono />
            <InfoRow label="Priority" value={job.priority} />
            {job.hasWarning && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 8,
                background: 'rgba(245,158,11,0.1)',
                borderRadius: 6,
                border: '1px solid rgba(245,158,11,0.3)',
                fontSize: 11,
                color: 'var(--amber)',
              }}>
                <AlertTriangle size={14} />
                {job.warningMsg}
              </div>
            )}
          </div>
        )

      case 'chat':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ChatBubble from="Marcus W." msg="Materials just shipped, ETA Friday" time="2h ago" self={false} />
            <ChatBubble from="You" msg="Got it. I'll prep the bay" time="1h ago" self />
            <ChatBubble from="Tony R." msg="Can we push install to Monday?" time="30m ago" self={false} />
            <div style={{
              display: 'flex',
              gap: 8,
              marginTop: 8,
              padding: '8px 0',
              borderTop: '1px solid var(--border)',
            }}>
              <input
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  color: 'var(--text1)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <button style={{
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 8,
                width: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}>
                <Send size={14} color="#fff" />
              </button>
            </div>
          </div>
        )

      case 'sales':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel icon={DollarSign} label="Financial Summary" />
            <InfoRow label="Revenue" value={`$${job.revenue.toLocaleString()}`} mono />
            <InfoRow label="Material Cost" value={`$${job.cost.toLocaleString()}`} mono />
            <InfoRow label="Gross Profit" value={`$${profit.toLocaleString()}`} color="var(--green)" mono />
            <InfoRow label="GPM" value={`${job.gpm.toFixed(1)}%`} color={gpmColor(job.gpm)} mono />
            <SectionLabel icon={FileText} label="Documents" />
            <DocItem label="Estimate #1042" status="Approved" />
            <DocItem label="Sales Order #891" status="Active" />
            <DocItem label="Invoice #723" status="Pending" />
          </div>
        )

      case 'production':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel icon={Package} label="Materials" />
            <InfoRow label="Primary Vinyl" value="3M 2080 Satin Black" />
            <InfoRow label="Qty Needed" value="85 sq ft" />
            <InfoRow label="Status" value={job.hasWarning ? 'Back-ordered' : 'In stock'} color={job.hasWarning ? 'var(--amber)' : 'var(--green)'} />
            <SectionLabel icon={ClipboardCheck} label="Checklist" />
            <CheckItem label="Design approved" done />
            <CheckItem label="Material ordered" done />
            <CheckItem label="Material received" done={!job.hasWarning} />
            <CheckItem label="Print completed" done={job.progress > 50} />
            <CheckItem label="Laminated" done={job.progress > 70} />
          </div>
        )

      case 'install':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel icon={Hammer} label="Install Details" />
            <InfoRow label="Installer" value={job.installer || 'Unassigned'} />
            <InfoRow label="Install Date" value={job.installDate} />
            <InfoRow label="Bay" value="Bay 2" />
            <SectionLabel icon={ClipboardCheck} label="Install Checklist" />
            <CheckItem label="Vehicle received" done={job.progress > 20} />
            <CheckItem label="Surface prep complete" done={job.progress > 40} />
            <CheckItem label="Wrap applied" done={job.progress > 60} />
            <CheckItem label="Trim and edges" done={job.progress > 80} />
            <CheckItem label="Final inspection" done={job.progress >= 100} />
          </div>
        )

      case 'qc':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel icon={Shield} label="Quality Control" />
            <CheckItem label="Edges sealed properly" done={job.progress > 85} />
            <CheckItem label="No bubbles or wrinkles" done={job.progress > 85} />
            <CheckItem label="Color match verified" done={job.progress > 90} />
            <CheckItem label="Customer photos taken" done={job.progress > 90} />
            <CheckItem label="QC sign-off" done={job.progress >= 100} />
            {job.progress < 100 && (
              <div style={{
                padding: 10,
                background: 'rgba(34,211,238,0.1)',
                borderRadius: 8,
                border: '1px solid rgba(34,211,238,0.3)',
                fontSize: 11,
                color: 'var(--cyan)',
              }}>
                Awaiting QC inspection before advancing to close
              </div>
            )}
          </div>
        )

      case 'close':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel icon={Lock} label="Close Requirements" />
            <CheckItem label="All photos uploaded" done={job.photoCount > 5} />
            <CheckItem label="Customer satisfaction confirmed" done={job.progress >= 95} />
            <CheckItem label="Final invoice sent" done={job.stage === 'done'} />
            <CheckItem label="Payment received" done={job.stage === 'done'} />
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: 4,
            }}>
              <div style={{
                background: 'var(--surface2)',
                borderRadius: 8,
                padding: 10,
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>Revenue</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${job.revenue.toLocaleString()}
                </div>
              </div>
              <div style={{
                background: 'var(--surface2)',
                borderRadius: 8,
                padding: 10,
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>Commission</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${Math.round(profit * 0.045).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )

      case 'photos':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionLabel icon={ImageIcon} label={`Photos (${job.photoCount})`} />
              <button style={{
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Camera size={12} /> Add
              </button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
            }}>
              {Array.from({ length: Math.min(job.photoCount, 6) }).map((_, i) => (
                <div key={i} style={{
                  aspectRatio: '1',
                  background: 'var(--surface2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ImageIcon size={20} color="var(--text3)" />
                </div>
              ))}
            </div>
            {job.photoCount > 6 && (
              <div style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'center' }}>
                +{job.photoCount - 6} more photos
              </div>
            )}
          </div>
        )

      case 'timer':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 16 }}>
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text1)',
            }}>
              {String(Math.floor(timerSeconds / 3600)).padStart(2, '0')}:
              {String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0')}:
              {String(timerSeconds % 60).padStart(2, '0')}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  if (timerActive) {
                    setTimerActive(false)
                  } else {
                    setTimerActive(true)
                    const id = setInterval(() => setTimerSeconds(s => s + 1), 1000)
                    // Store cleanup reference
                    ;(window as any).__mobileTimer = id
                  }
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: timerActive ? 'var(--amber)' : 'var(--green)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {timerActive ? <Pause size={20} color="#fff" /> : <Play size={20} color="#fff" />}
              </button>
              <button
                onClick={() => {
                  setTimerActive(false)
                  setTimerSeconds(0)
                  if ((window as any).__mobileTimer) {
                    clearInterval((window as any).__mobileTimer)
                  }
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Square size={18} color="var(--text2)" />
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {timerActive ? 'Timer running...' : 'Tap play to start tracking time'}
            </div>
          </div>
        )

      case 'expenses':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: 24 }}>
            <DollarSign size={32} color="var(--text3)" />
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>No expenses recorded yet</div>
            <button style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 16px',
              color: 'var(--text1)',
              fontSize: 12,
              cursor: 'pointer',
            }}>
              Add Expense
            </button>
          </div>
        )

      case 'activity':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ActivityItem action="Job created" by={job.agent} time="14 days ago" />
            <ActivityItem action="Moved to Production" by={job.agent} time="10 days ago" />
            <ActivityItem action="Material ordered" by="System" time="10 days ago" />
            <ActivityItem action="Design proof uploaded" by="Designer" time="8 days ago" />
            <ActivityItem action="Customer approved proof" by={job.customer} time="7 days ago" />
            {job.progress > 50 && <ActivityItem action="Print completed" by="Production" time="3 days ago" />}
          </div>
        )

      default:
        return (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
            Tab content placeholder
          </div>
        )
    }
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ArrowLeft size={18} />
          <span style={{ fontSize: 12 }}>Back</span>
        </button>
        <div style={{
          padding: '3px 10px',
          borderRadius: 99,
          background: stage.bg,
          color: stage.color,
          fontSize: 10,
          fontWeight: 700,
        }}>
          {stage.label}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}
          >
            <MoreVertical size={18} />
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 4,
              zIndex: 30,
              width: 140,
            }}>
              <button
                onClick={() => setShowMenu(false)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '8px 10px',
                  color: 'var(--red)',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 4,
                  textAlign: 'left',
                }}
              >
                <Trash2 size={14} /> Delete Job
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Job title */}
      <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text1)',
          fontFamily: 'Barlow Condensed, sans-serif',
        }}>
          {job.title}
        </div>

        {/* Meta row */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 6,
          fontSize: 10,
          color: 'var(--text2)',
          flexWrap: 'wrap',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <User size={10} /> {job.agent}
          </span>
          {job.installer && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Wrench size={10} /> {job.installer}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <CalendarDays size={10} /> {job.installDate}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} /> {job.daysOpen}d open
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>
            <span>Progress</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{job.progress}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
            <div style={{
              height: '100%',
              borderRadius: 2,
              width: `${job.progress}%`,
              background: stage.color,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </div>

      {/* Tab row */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        flexShrink: 0,
        padding: '0 12px',
        marginTop: 8,
      }}>
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text3)',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 12,
      }}>
        {renderTab()}
      </div>

      {/* Sign-off CTA */}
      {job.stage !== 'done' && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={() => setShowSignature(true)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: 'none',
              background: 'var(--green)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Flag size={14} />
            Sign Off — Advance Stage
          </button>
        </div>
      )}

      {/* Signature modal */}
      {showSignature && (
        <MobileSignatureModal job={job} onClose={() => setShowSignature(false)} />
      )}
    </div>
  )
}

// ─── Helper sub-components ───────────────────────────────────

function InfoRow({ label, value, color, mono }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <span style={{
        color: color ?? 'var(--text1)',
        fontWeight: 600,
        fontFamily: mono ? 'JetBrains Mono, monospace' : undefined,
      }}>
        {value}
      </span>
    </div>
  )
}

function SectionLabel({ icon: Icon, label }: { icon: typeof DollarSign; label: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--text2)',
      fontFamily: 'Barlow Condensed, sans-serif',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 4,
    }}>
      <Icon size={14} color="var(--accent)" />
      {label}
    </div>
  )
}

function CheckItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 11,
      color: done ? 'var(--text2)' : 'var(--text3)',
    }}>
      <div style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: `1px solid ${done ? 'var(--green)' : 'var(--border)'}`,
        background: done ? 'rgba(34,192,122,0.15)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {done && <Check size={10} color="var(--green)" />}
      </div>
      <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
    </div>
  )
}

function ChatBubble({ from, msg, time, self }: { from: string; msg: string; time: string; self: boolean }) {
  return (
    <div style={{
      alignSelf: self ? 'flex-end' : 'flex-start',
      maxWidth: '80%',
    }}>
      {!self && (
        <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>{from}</div>
      )}
      <div style={{
        background: self ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
        border: `1px solid ${self ? 'rgba(79,127,255,0.3)' : 'var(--border)'}`,
        borderRadius: self ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
        padding: '8px 10px',
        fontSize: 12,
        color: 'var(--text1)',
      }}>
        {msg}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, textAlign: self ? 'right' : 'left' }}>
        {time}
      </div>
    </div>
  )
}

function DocItem({ label, status }: { label: string; status: string }) {
  const statusColor = status === 'Approved' ? 'var(--green)' : status === 'Active' ? 'var(--accent)' : 'var(--amber)'
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 10px',
      background: 'var(--surface2)',
      borderRadius: 6,
      border: '1px solid var(--border)',
      fontSize: 11,
    }}>
      <span style={{ color: 'var(--text1)' }}>{label}</span>
      <span style={{ color: statusColor, fontWeight: 600, fontSize: 10 }}>{status}</span>
    </div>
  )
}

function ActivityItem({ action, by, time }: { action: string; by: string; time: string }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      fontSize: 11,
      padding: '6px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--accent)',
        flexShrink: 0,
        marginTop: 4,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text1)' }}>{action}</div>
        <div style={{ color: 'var(--text3)', fontSize: 10 }}>{by} &middot; {time}</div>
      </div>
    </div>
  )
}
