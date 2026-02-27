'use client'

import { useState } from 'react'
import {
  Briefcase, DollarSign, Palette, Factory, Wrench, Hammer,
  CheckCircle, FileText, Users, Printer, Search, Shield,
  Car, Waves, Anchor, AlertTriangle, ArrowRight, ClipboardList,
  type LucideIcon,
} from 'lucide-react'

// ── Pipeline Process Definitions ──────────────────────────────────────────────

interface StageProcess {
  name: string
  icon: LucideIcon
  color: string
  responsible: string
  checklist: string[]
  outputs: string[]
  trigger: string
  warnings: string[]
}

interface PipelineProcess {
  key: string
  label: string
  icon: LucideIcon
  color: string
  stages: StageProcess[]
}

const PROCESSES: PipelineProcess[] = [
  {
    key: 'wraps',
    label: 'Vehicle Wraps',
    icon: Car,
    color: '#4f7fff',
    stages: [
      {
        name: 'Sales Intake',
        icon: Briefcase,
        color: '#4f7fff',
        responsible: 'Sales Agent',
        checklist: [
          'Collect customer info (name, phone, email, company)',
          'Identify vehicle (year, make, model, color)',
          'Determine wrap type (full, partial, decal, color change)',
          'Take reference photos of vehicle',
          'Discuss budget and timeline expectations',
          'Create estimate with line items',
        ],
        outputs: ['Estimate document', 'Customer record', 'Vehicle photos'],
        trigger: 'Customer approves estimate and deposit is collected',
        warnings: [
          'Never quote without seeing the vehicle or getting exact specs',
          'Always confirm vinyl availability before promising dates',
          'Get written approval on design direction before proceeding',
        ],
      },
      {
        name: 'Design',
        icon: Palette,
        color: '#8b5cf6',
        responsible: 'Designer',
        checklist: [
          'Review design brief and brand guidelines',
          'Create initial mockup on vehicle template',
          'Submit proof to customer for review',
          'Process revision requests (max 3 rounds)',
          'Get written design approval from customer',
          'Prepare print-ready files (CMYK, bleed, safe zones)',
        ],
        outputs: ['Approved mockup', 'Print-ready files', 'Design approval signature'],
        trigger: 'Customer signs off on final design proof',
        warnings: [
          'Always spell-check all text on the design',
          'Verify logo files are vector (not low-res raster)',
          'Double-check color mode is CMYK, not RGB',
        ],
      },
      {
        name: 'Production',
        icon: Factory,
        color: '#22c07a',
        responsible: 'Production Manager',
        checklist: [
          'Verify material inventory (vinyl + laminate)',
          'Queue print job on RIP software',
          'Print vinyl panels',
          'Apply laminate overlay',
          'Quality check print (color accuracy, no banding)',
          'Cut and weed vinyl panels',
          'Stage materials for install bay',
        ],
        outputs: ['Printed + laminated panels', 'Cut sheets', 'QC pass report'],
        trigger: 'All panels printed, laminated, cut, and QC passed',
        warnings: [
          'Never skip lamination - unlaminated prints fade in weeks',
          'Check for nozzle clogs before every print run',
          'Store printed panels flat, never rolled, before install',
        ],
      },
      {
        name: 'Install',
        icon: Hammer,
        color: '#22d3ee',
        responsible: 'Installer',
        checklist: [
          'Clean and prep vehicle surface (IPA wipe down)',
          'Remove necessary trim, handles, mirrors',
          'Apply vinyl panels (heat gun + squeegee)',
          'Post-heat all edges and curves',
          'Trim excess material',
          'Reinstall trim pieces',
          'Final detail and clean',
          'Take completion photos',
        ],
        outputs: ['Installed wrap', 'Completion photos', 'Install time log'],
        trigger: 'Install complete and installer signs off',
        warnings: [
          'Never install on a cold vehicle (min 60F surface temp)',
          'Always post-heat recessed areas and edges',
          'Photo-document any pre-existing damage before starting',
        ],
      },
      {
        name: 'QC / Sales Close',
        icon: CheckCircle,
        color: '#f59e0b',
        responsible: 'Sales Agent + QC Inspector',
        checklist: [
          'Walk around inspection (bubbles, lifting, alignment)',
          'Check all edges and seams',
          'Verify color consistency across panels',
          'Customer walkthrough and approval',
          'Deliver care instructions to customer',
          'Generate and send final invoice',
          'Collect remaining balance',
          'Request Google review',
        ],
        outputs: ['QC checklist', 'Final invoice', 'Payment receipt', 'Review request'],
        trigger: 'Full payment received and customer signs off',
        warnings: [
          'Never release vehicle without full payment',
          'Always provide written care instructions',
          'Send review request within 48 hours of pickup',
        ],
      },
    ],
  },
  {
    key: 'decking',
    label: 'DekWave Decking',
    icon: Waves,
    color: '#22d3ee',
    stages: [
      {
        name: 'Lead',
        icon: Briefcase,
        color: '#4f7fff',
        responsible: 'Sales Agent',
        checklist: [
          'Qualify lead (residential vs commercial)',
          'Collect property info and measurements',
          'Understand customer goals and budget',
          'Schedule site visit if needed',
        ],
        outputs: ['Lead record', 'Initial measurements'],
        trigger: 'Lead expresses interest and site info collected',
        warnings: ['Always verify property ownership before proceeding'],
      },
      {
        name: 'Estimate Sent',
        icon: DollarSign,
        color: '#f59e0b',
        responsible: 'Sales Agent',
        checklist: [
          'Create detailed estimate with materials + labor',
          'Include product options and color selections',
          'Send estimate to customer',
          'Follow up within 48 hours',
        ],
        outputs: ['Estimate document', 'Product samples sent'],
        trigger: 'Customer approves estimate',
        warnings: ['Include all permits and fees in the estimate'],
      },
      {
        name: 'Site Scan & Template',
        icon: Search,
        color: '#22d3ee',
        responsible: 'Field Tech',
        checklist: [
          'Conduct on-site measurements',
          'Create digital template / scan',
          'Document existing conditions',
          'Verify material requirements',
          'Confirm install access and logistics',
        ],
        outputs: ['Site scan data', 'Template files', 'Site photos'],
        trigger: 'Site scan complete and template verified',
        warnings: ['Always check for underground utilities before drilling'],
      },
      {
        name: 'Manufacturing',
        icon: Factory,
        color: '#22c07a',
        responsible: 'Production',
        checklist: [
          'Order materials from supplier',
          'Confirm lead times and delivery dates',
          'Track order status',
          'Receive and inspect materials',
          'Pre-cut or pre-fabricate components',
        ],
        outputs: ['Materials received', 'Pre-fab components'],
        trigger: 'All materials received and inspected',
        warnings: ['Verify material lot numbers match for color consistency'],
      },
      {
        name: 'Install',
        icon: Hammer,
        color: '#8b5cf6',
        responsible: 'Install Crew',
        checklist: [
          'Prep site (remove old decking if needed)',
          'Install substructure/framing',
          'Install decking boards',
          'Install railing and accessories',
          'Final cleanup',
          'Customer walkthrough',
        ],
        outputs: ['Completed deck', 'Completion photos', 'Warranty documents'],
        trigger: 'Installation complete and customer approves',
        warnings: [
          'Follow local building codes for spacing and fasteners',
          'Always leave expansion gaps per manufacturer spec',
        ],
      },
    ],
  },
  {
    key: 'ppf',
    label: 'Paint Protection Film',
    icon: Shield,
    color: '#22c07a',
    stages: [
      {
        name: 'Lead',
        icon: Briefcase,
        color: '#4f7fff',
        responsible: 'Sales Agent',
        checklist: [
          'Identify vehicle and coverage areas',
          'Discuss PPF options (full front, full body, track pack)',
          'Collect customer contact info',
        ],
        outputs: ['Lead record', 'Vehicle info'],
        trigger: 'Customer requests quote',
        warnings: ['Check film availability for exotic vehicles'],
      },
      {
        name: 'Estimate',
        icon: DollarSign,
        color: '#f59e0b',
        responsible: 'Sales Agent',
        checklist: [
          'Calculate coverage area and film usage',
          'Select film brand and grade',
          'Create detailed estimate',
          'Send to customer',
        ],
        outputs: ['Estimate document'],
        trigger: 'Customer approves and schedules',
        warnings: ['PPF pricing varies dramatically by vehicle complexity'],
      },
      {
        name: 'Scheduled',
        icon: ClipboardList,
        color: '#22d3ee',
        responsible: 'Scheduler',
        checklist: [
          'Confirm appointment with customer',
          'Verify film stock is available',
          'Assign installer',
          'Send prep instructions to customer',
        ],
        outputs: ['Scheduled appointment', 'Customer confirmation'],
        trigger: 'Appointment date arrives',
        warnings: ['Customer must bring clean, dry vehicle'],
      },
      {
        name: 'Install',
        icon: Hammer,
        color: '#22c07a',
        responsible: 'PPF Installer',
        checklist: [
          'Clay bar and decontaminate paint',
          'Cut PPF patterns (plotter or hand-cut)',
          'Apply film with slip solution',
          'Squeegee and tuck edges',
          'Heat-set all edges',
          'Final inspection under lights',
          'Take completion photos',
        ],
        outputs: ['Installed PPF', 'Completion photos'],
        trigger: 'Install complete and QC passed',
        warnings: [
          'Never install in direct sunlight',
          'Check for paint defects before applying film',
        ],
      },
      {
        name: 'QC & Invoice',
        icon: CheckCircle,
        color: '#8b5cf6',
        responsible: 'QC Inspector',
        checklist: [
          'Inspect all edges and seams',
          'Check for bubbles, debris, or lifting',
          'Customer walkthrough',
          'Generate invoice and collect payment',
          'Provide care instructions and warranty card',
        ],
        outputs: ['QC report', 'Invoice', 'Warranty card'],
        trigger: 'Payment received',
        warnings: ['PPF needs 48hrs to fully cure - inform customer'],
      },
    ],
  },
  {
    key: 'marine',
    label: 'Marine Wraps',
    icon: Anchor,
    color: '#f59e0b',
    stages: [
      {
        name: 'Lead',
        icon: Briefcase,
        color: '#4f7fff',
        responsible: 'Sales Agent',
        checklist: [
          'Identify vessel (type, length, material)',
          'Determine wrap areas (hull, deck, transom)',
          'Collect customer info and photos',
          'Discuss marine-grade material options',
        ],
        outputs: ['Lead record', 'Vessel photos'],
        trigger: 'Customer requests marine wrap quote',
        warnings: ['Marine wraps require specialized materials - never use standard vehicle vinyl'],
      },
      {
        name: 'Estimate & Design',
        icon: Palette,
        color: '#8b5cf6',
        responsible: 'Sales + Designer',
        checklist: [
          'Measure or estimate vessel surface area',
          'Select marine-grade vinyl and laminate',
          'Create design mockup',
          'Send estimate and design proof',
          'Get customer approval',
        ],
        outputs: ['Estimate', 'Design proof', 'Material order'],
        trigger: 'Customer approves design and estimate',
        warnings: ['Marine environments are harsh - only use marine-rated materials'],
      },
      {
        name: 'Production',
        icon: Factory,
        color: '#22c07a',
        responsible: 'Production',
        checklist: [
          'Print marine-grade vinyl',
          'Apply marine laminate',
          'QC check for print quality',
          'Cut panels to size',
        ],
        outputs: ['Printed marine panels'],
        trigger: 'All panels printed and ready',
        warnings: ['Marine laminate is thicker - adjust printer settings'],
      },
      {
        name: 'Haul Out & Install',
        icon: Anchor,
        color: '#f59e0b',
        responsible: 'Marine Installer',
        checklist: [
          'Coordinate haul out with marina',
          'Clean and prep hull surface',
          'Apply bottom paint barrier if needed',
          'Install vinyl panels',
          'Post-heat all seams',
          'Apply edge sealant',
          'Coordinate launch',
        ],
        outputs: ['Installed wrap', 'Completion photos'],
        trigger: 'Vessel launched and customer approves',
        warnings: [
          'Hull must be completely dry before application',
          'Seal all edges to prevent water intrusion',
          'Coordinate with marina on haul out/launch schedule',
        ],
      },
      {
        name: 'Invoice & Close',
        icon: CheckCircle,
        color: '#22d3ee',
        responsible: 'Sales Agent',
        checklist: [
          'Final walkthrough with customer',
          'Generate and send invoice',
          'Collect payment',
          'Provide marine care instructions',
          'Schedule 30-day follow-up check',
        ],
        outputs: ['Invoice', 'Payment receipt', 'Care guide'],
        trigger: 'Full payment received',
        warnings: ['Marine wraps need inspection after first month of water exposure'],
      },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProcessPageClient() {
  const [activePipeline, setActivePipeline] = useState('wraps')

  const pipeline = PROCESSES.find(p => p.key === activePipeline) || PROCESSES[0]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 28,
          fontWeight: 900,
          color: 'var(--text1)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          marginBottom: 4,
        }}>
          Process Guide
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Standard operating procedures for each pipeline. Use this as a training reference.
        </p>
      </div>

      {/* Pipeline Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {PROCESSES.map(pl => {
          const isActive = activePipeline === pl.key
          const Icon = pl.icon
          return (
            <button
              key={pl.key}
              onClick={() => setActivePipeline(pl.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 12,
                border: isActive ? `2px solid ${pl.color}` : '2px solid rgba(255,255,255,0.06)',
                background: isActive ? `${pl.color}12` : 'var(--surface)',
                cursor: 'pointer', fontSize: 14, fontWeight: isActive ? 700 : 500,
                fontFamily: 'Barlow Condensed, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                color: isActive ? pl.color : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={18} />
              {pl.label}
            </button>
          )
        })}
      </div>

      {/* Pipeline Flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {pipeline.stages.map((stage, idx) => {
          const Icon = stage.icon
          return (
            <div key={stage.name}>
              {/* Stage Card */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 24,
                borderLeft: `4px solid ${stage.color}`,
              }}>
                {/* Stage Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${stage.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} color={stage.color} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, color: stage.color,
                        background: `${stage.color}20`, padding: '2px 8px',
                        borderRadius: 6, fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        STEP {idx + 1}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: 'var(--text3)',
                        background: 'rgba(255,255,255,0.06)', padding: '2px 8px',
                        borderRadius: 6,
                      }}>
                        {stage.responsible}
                      </span>
                    </div>
                    <h3 style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontSize: 20, fontWeight: 800, color: 'var(--text1)',
                      textTransform: 'uppercase', letterSpacing: '0.02em',
                      marginTop: 4,
                    }}>
                      {stage.name}
                    </h3>
                  </div>
                </div>

                {/* Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Checklist */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Checklist
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {stage.checklist.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <CheckCircle size={13} color={stage.color} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.4 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outputs + Trigger + Warnings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Outputs */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Outputs
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {stage.outputs.map((out, i) => (
                          <span key={i} style={{
                            fontSize: 11, fontWeight: 600, color: 'var(--green)',
                            background: 'rgba(34,192,122,0.1)', padding: '3px 10px',
                            borderRadius: 6, border: '1px solid rgba(34,192,122,0.15)',
                          }}>
                            {out}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Trigger */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Moves to Next Stage When
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--accent)', fontWeight: 600,
                        background: 'rgba(79,127,255,0.08)', padding: '8px 12px',
                        borderRadius: 8, border: '1px solid rgba(79,127,255,0.15)',
                      }}>
                        {stage.trigger}
                      </div>
                    </div>

                    {/* Warnings */}
                    {stage.warnings.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Common Mistakes
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {stage.warnings.map((w, i) => (
                            <div key={i} style={{
                              display: 'flex', gap: 6, alignItems: 'flex-start',
                              fontSize: 12, color: 'var(--red)',
                              background: 'rgba(242,90,90,0.06)', padding: '6px 10px',
                              borderRadius: 6, border: '1px solid rgba(242,90,90,0.1)',
                            }}>
                              <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                              <span style={{ lineHeight: 1.3 }}>{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Arrow connector */}
              {idx < pipeline.stages.length - 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'center', padding: '8px 0',
                }}>
                  <ArrowRight size={20} color="var(--text3)" style={{ transform: 'rotate(90deg)', opacity: 0.4 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
