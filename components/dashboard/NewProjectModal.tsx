'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  onClose: () => void
  teammates: { id: string; name: string; role: string }[]
}
type Tab = 1 | 2 | 3
type JobType = 'wrap' | 'decking' | 'ppf' | 'design'
const VEHICLE_TYPES = ['Passenger Car','SUV / Crossover','Pickup Truck','Full-Size Van','Cargo Van','Box Truck','Semi / Big Rig','Trailer','Bus / Coach','Boat / Marine','Golf Cart','Other']

export default function NewProjectModal({ profile, onClose, teammates }: Props) {
  const [tab, setTab] = useState<Tab>(1)
  const [tab2Done, setTab2Done] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Tab 1
  const [clientName, setClientName] = useState('')
  const [bizName, setBizName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [vehicleDesc, setVehicleDesc] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [jobType, setJobType] = useState<JobType>('wrap')
  const [agentId, setAgentId] = useState(profile.id)
  const [leadType, setLeadType] = useState('inbound')
  const [salePrice, setSalePrice] = useState('')
  const [sqft, setSqft] = useState('')
  const [matCost, setMatCost] = useState('')
  const [laborPay, setLaborPay] = useState('')
  const [designFee, setDesignFee] = useState('150')
  const [misc, setMisc] = useState('0')
  const [priority, setPriority] = useState('normal')
  const [installerId, setInstallerId] = useState('')

  // Tab 2
  const [coverage, setCoverage] = useState('')
  const [exclusions, setExclusions] = useState('')
  const [designNeeded, setDesignNeeded] = useState(false)
  const [designNotes, setDesignNotes] = useState('')
  const [assetStatus, setAssetStatus] = useState('')
  const [proofLink, setProofLink] = useState('')
  const [driveLink, setDriveLink] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('')
  const [brandColors, setBrandColors] = useState('')
  const [revisionNotes, setRevisionNotes] = useState('')
  const [cannotWrap, setCannotWrap] = useState('')

  // Tab 3
  const [installDate, setInstallDate] = useState('')
  const [access, setAccess] = useState('')
  const [depositPaid, setDepositPaid] = useState(false)
  const [contractSigned, setContractSigned] = useState(false)
  const [removal, setRemoval] = useState(false)
  const [removalDetail, setRemovalDetail] = useState('')
  const [projDesc, setProjDesc] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [warnings, setWarnings] = useState('')
  const [clientReminders, setClientReminders] = useState('')
  const [installNotes, setInstallNotes] = useState('')

  const sale = parseFloat(salePrice)||0, mat=parseFloat(matCost)||0
  const lab=parseFloat(laborPay)||0, des=parseFloat(designFee)||0
  const mis=parseFloat(misc)||0, cogs=mat+lab+des+mis
  const profit=sale-cogs, gpm=sale>0?(profit/sale)*100:0
  const gpmColor=gpm>=70?'#22c07a':gpm>=55?'#f59e0b':'#f25a5a'

  const agents=teammates.filter(t=>['admin','sales'].includes(t.role))
  const installers=teammates.filter(t=>['installer','admin'].includes(t.role))

  function fld(label: string, children: React.ReactNode, required=false) {
    return (
      <div>
        <label className="field-label">{label}{required&&<span style={{color:'var(--red)'}}> *</span>}</label>
        {children}
      </div>
    )
  }

  function sectionHead(title: string) {
    return <div style={{fontSize:10,fontWeight:800,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',paddingBottom:6,borderBottom:'1px solid var(--border)',marginBottom:10}}>{title}</div>
  }

  async function handleSave(asSalesOrder=false) {
    if(!clientName.trim()){setError('Client name required');setTab(1);return}
    setSaving(true);setError('')
    try {
      const {data,error:err}=await supabase.from('projects').insert({
        org_id:profile.org_id, type:jobType,
        title:bizName||clientName, status:asSalesOrder?'active':'estimate',
        agent_id:agentId||profile.id, installer_id:installerId||null,
        priority, vehicle_desc:vehicleDesc, install_date:installDate||null,
        revenue:sale||null, profit:profit||null, gpm:gpm||null,
        pipe_stage:'sales_in',
        form_data:{clientName,bizName,clientEmail,clientPhone,vehicleColor,vehicleType,
          leadType,sqft,coverage,exclusions,designNeeded,designNotes,assetStatus,
          proofLink,driveLink,approvalStatus,brandColors,revisionNotes,cannotWrap,
          access,depositPaid,contractSigned,removal,removalDetail,
          projDesc,internalNotes,warnings,clientReminders,installNotes},
        fin_data:{sales:sale,material:mat,labor:lab,designFee:des,misc:mis,cogs,profit,gpm},
      }).select().single()
      if(err)throw err
      router.push(`/projects/${data.id}`)
      onClose()
    } catch(e:any){setError(e.message);setSaving(false)}
  }

  const tabDef=[
    {n:1,label:'Quote & Materials'},{n:2,label:'Design & Scope'},{n:3,label:'Logistics'}
  ] as const

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:9999,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,
        width:'100%',maxWidth:800,maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header */}
        <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border)',
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:22,fontWeight:900}}>＋ New Project</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{clientName||'New client'}{vehicleDesc?` · ${vehicleDesc}`:''}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text3)',fontSize:22,cursor:'pointer',padding:'4px 8px'}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
          {tabDef.map(({n,label})=>{
            const done=(n===1&&!!clientName)||(n===2&&tab2Done)||(n===3)
            const accessible=n===1||(n===2&&!!clientName&&!!vehicleDesc)||(n===3&&tab2Done)
            return <button key={n} onClick={()=>{if(accessible)setTab(n as Tab)}} style={{
              flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,
              padding:'12px 16px',background:'none',border:'none',
              borderBottom:tab===n?'2px solid var(--accent)':'2px solid transparent',
              color:tab===n?'var(--accent)':done&&n<tab?'var(--green)':'var(--text3)',
              fontWeight:700,fontSize:13,cursor:accessible?'pointer':'default',transition:'all .15s'}}>
              <span style={{width:22,height:22,borderRadius:'50%',display:'inline-flex',
                alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,
                background:tab===n?'var(--accent)':done&&n<tab?'var(--green)':'var(--surface2)',
                color:tab===n||done&&n<tab?'#fff':'var(--text3)'}}>
                {done&&n<tab?'✓':n}
              </span>
              {label}
            </button>
          })}
        </div>

        {/* Live fin bar */}
        {sale>0&&(
          <div style={{display:'flex',gap:24,padding:'8px 24px',background:'var(--bg)',
            borderBottom:'1px solid var(--border)',alignItems:'center',flexWrap:'wrap'}}>
            {[{l:'Sale',v:`$${sale.toLocaleString()}`,c:'var(--accent)'},
              {l:'COGS',v:`$${cogs.toLocaleString()}`,c:'var(--text2)'},
              {l:'Profit',v:`$${profit.toLocaleString()}`,c:'var(--green)'},
              {l:'GPM',v:`${gpm.toFixed(0)}%`,c:gpmColor}].map(s=>(
              <div key={s.l} style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:10,color:'var(--text3)',fontWeight:700}}>{s.l}</span>
                <span style={{fontFamily:'monospace',fontWeight:800,fontSize:15,color:s.c}}>{s.v}</span>
              </div>
            ))}
            <div style={{flex:1,minWidth:80,height:4,background:'var(--border)',borderRadius:2,overflow:'hidden'}}>
              <div style={{width:`${Math.min(gpm,100)}%`,height:'100%',background:gpmColor,transition:'all .3s',borderRadius:2}}/>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          {error&&<div style={{marginBottom:16,padding:'10px 14px',borderRadius:8,
            background:'rgba(242,90,90,.1)',border:'1px solid rgba(242,90,90,.3)',
            color:'var(--red)',fontSize:13}}>{error}</div>}

          {/* TAB 1 */}
          {tab===1&&(
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div>
                {sectionHead('Client Information')}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {fld('Client Name',<input className="field" placeholder="John Smith" value={clientName} onChange={e=>setClientName(e.target.value)}/>,true)}
                  {fld('Business Name',<input className="field" placeholder="Smith Logistics LLC" value={bizName} onChange={e=>setBizName(e.target.value)}/>)}
                  {fld('Email',<input className="field" type="email" placeholder="client@email.com" value={clientEmail} onChange={e=>setClientEmail(e.target.value)}/>)}
                  {fld('Phone',<input className="field" type="tel" placeholder="(555) 000-0000" value={clientPhone} onChange={e=>setClientPhone(e.target.value)}/>)}
                </div>
              </div>
              <div>
                {sectionHead('Vehicle / Project')}
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:12}}>
                  {fld('Vehicle Description',<input className="field" placeholder="2023 Ford Transit 350 High Roof" value={vehicleDesc} onChange={e=>setVehicleDesc(e.target.value)}/>,true)}
                  {fld('Color',<input className="field" placeholder="White" value={vehicleColor} onChange={e=>setVehicleColor(e.target.value)}/>)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                  {fld('Vehicle Type',<select className="field" value={vehicleType} onChange={e=>setVehicleType(e.target.value)}><option value="">Select…</option>{VEHICLE_TYPES.map(v=><option key={v}>{v}</option>)}</select>)}
                  {fld('Job Type',<select className="field" value={jobType} onChange={e=>setJobType(e.target.value as JobType)}><option value="wrap">Vehicle Wrap</option><option value="ppf">PPF / Paint Protection</option><option value="decking">Boat Decking</option><option value="design">Design Only</option></select>)}
                  {fld('Priority',<select className="field" value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">🔴 Urgent</option></select>)}
                </div>
              </div>
              <div>
                {sectionHead('Financials')}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
                  {fld('Sale Price ($)',<input className="field" type="number" placeholder="3500" value={salePrice} onChange={e=>setSalePrice(e.target.value)}/>)}
                  {fld('Est. Sqft',<input className="field" type="number" placeholder="0" value={sqft} onChange={e=>setSqft(e.target.value)}/>)}
                  {fld('Lead Type',<select className="field" value={leadType} onChange={e=>setLeadType(e.target.value)}><option value="inbound">Inbound</option><option value="outbound">Outbound</option><option value="referral">Referral</option><option value="presold">Pre-Sold</option><option value="repeat">Repeat Customer</option></select>)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                  {fld('Material ($)',<input className="field" type="number" placeholder="0" value={matCost} onChange={e=>setMatCost(e.target.value)}/>)}
                  {fld('Installer Pay ($)',<input className="field" type="number" placeholder="0" value={laborPay} onChange={e=>setLaborPay(e.target.value)}/>)}
                  {fld('Design Fee ($)',<input className="field" type="number" placeholder="150" value={designFee} onChange={e=>setDesignFee(e.target.value)}/>)}
                  {fld('Misc ($)',<input className="field" type="number" placeholder="0" value={misc} onChange={e=>setMisc(e.target.value)}/>)}
                </div>
              </div>
              <div>
                {sectionHead('Assignment')}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {fld('Sales Agent',<select className="field" value={agentId} onChange={e=>setAgentId(e.target.value)}>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>)}
                  {fld('Installer (optional)',<select className="field" value={installerId} onChange={e=>setInstallerId(e.target.value)}><option value="">Assign later</option>{installers.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select>)}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 */}
          {tab===2&&(
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div>
                {sectionHead('Wrap Scope')}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  {fld('Parts to Wrap / Coverage',<textarea className="field" rows={3} placeholder="Both sides, rear doors, roof, front bumper fascia..." value={coverage} onChange={e=>setCoverage(e.target.value)} style={{resize:'vertical'}}/>,true)}
                  {fld('Areas NOT to Wrap / Exclusions',<textarea className="field" rows={3} placeholder="Mirrors, door handles, roof rails, glass..." value={exclusions} onChange={e=>setExclusions(e.target.value)} style={{resize:'vertical'}}/>)}
                </div>
                {fld('Areas That Cannot Be Wrapped (note for customer)',<textarea className="field" rows={2} placeholder="Textured plastic cladding, compound curves at hood corners..." value={cannotWrap} onChange={e=>setCannotWrap(e.target.value)} style={{resize:'vertical'}}/>)}
              </div>
              <div>
                {sectionHead('Design & Artwork')}
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <input type="checkbox" id="dn" checked={designNeeded} onChange={e=>setDesignNeeded(e.target.checked)} style={{width:16,height:16}}/>
                  <label htmlFor="dn" style={{fontSize:13,fontWeight:600,cursor:'pointer'}}>Design / Artwork Required?</label>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {fld('Design Instructions',<textarea className="field" rows={3} placeholder="Logo placement, color refs, text content, bleed zones..." value={designNotes} onChange={e=>setDesignNotes(e.target.value)} style={{resize:'vertical'}}/>)}
                  {fld('File / Asset Status',<textarea className="field" rows={3} placeholder="Have AI vector logo, need updated phone number..." value={assetStatus} onChange={e=>setAssetStatus(e.target.value)} style={{resize:'vertical'}}/>)}
                  {fld('Brand Colors / Pantone',<input className="field" placeholder="PMS 286C Blue, white, black" value={brandColors} onChange={e=>setBrandColors(e.target.value)}/>)}
                  {fld('Revision Notes / Change Log',<input className="field" placeholder="Track revisions..." value={revisionNotes} onChange={e=>setRevisionNotes(e.target.value)}/>)}
                </div>
              </div>
              <div>
                {sectionHead('Files & Links')}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                  {fld('Google Drive / Assets',<input className="field" type="url" placeholder="https://drive.google.com/..." value={driveLink} onChange={e=>setDriveLink(e.target.value)}/>)}
                  {fld('Proof / PVO Link',<input className="field" type="url" placeholder="https://..." value={proofLink} onChange={e=>setProofLink(e.target.value)}/>)}
                  {fld('Approval Status',<select className="field" value={approvalStatus} onChange={e=>setApprovalStatus(e.target.value)}><option value="">Not Started</option><option value="proof_sent">Proof Sent</option><option value="revisions">Revisions Requested</option><option value="approved">Design Approved ✓</option></select>)}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 */}
          {tab===3&&(
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div>
                {sectionHead('Scheduling & Logistics')}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
                  {fld('Target Install Date',<input className="field" type="date" value={installDate} onChange={e=>setInstallDate(e.target.value)}/>)}
                  {fld('Vehicle Access / Drop-off',<select className="field" value={access} onChange={e=>setAccess(e.target.value)}><option value="">Select…</option><option value="customer_drop">Customer Drop-off</option><option value="we_pickup">We Pick Up</option><option value="shop">Already at Shop</option><option value="mobile">Mobile Install</option></select>)}
                  {fld('Assign Installer',<select className="field" value={installerId} onChange={e=>setInstallerId(e.target.value)}><option value="">Assign later</option>{installers.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select>)}
                </div>
                <div style={{display:'flex',gap:24,marginBottom:12}}>
                  {[{id:'dep',l:'💳 Deposit Received?',v:depositPaid,s:setDepositPaid},
                    {id:'con',l:'📝 Contract Signed?',v:contractSigned,s:setContractSigned},
                    {id:'rem',l:'🔧 Removal Required?',v:removal,s:setRemoval}].map(({id,l,v,s})=>(
                    <label key={id} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                      <input type="checkbox" checked={v} onChange={e=>s(e.target.checked)} style={{width:16,height:16}}/>{l}
                    </label>
                  ))}
                </div>
                {removal&&fld('Removal Details',<textarea className="field" rows={2} placeholder="Existing wrap details, substrate condition..." value={removalDetail} onChange={e=>setRemovalDetail(e.target.value)} style={{resize:'vertical'}}/>)}
              </div>
              <div>
                {sectionHead('Notes')}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>
                    <label className="field-label" style={{color:'var(--accent)'}}>Internal Notes / To-Do</label>
                    <textarea className="field" rows={3} placeholder="• Follow up on proof approval&#10;• Order material by Friday..." value={internalNotes} onChange={e=>setInternalNotes(e.target.value)} style={{resize:'vertical'}}/>
                  </div>
                  <div>
                    <label className="field-label" style={{color:'var(--red)'}}>Warnings / Production Flags</label>
                    <textarea className="field" rows={3} placeholder="Substrate rust near fender, compound curves..." value={warnings} onChange={e=>setWarnings(e.target.value)} style={{resize:'vertical'}}/>
                  </div>
                  {fld('Client-Facing Reminders',<textarea className="field" rows={2} placeholder="Wash vehicle before drop-off, remove magnetics..." value={clientReminders} onChange={e=>setClientReminders(e.target.value)} style={{resize:'vertical'}}/>)}
                  {fld('Install Notes for Crew',<textarea className="field" rows={2} placeholder="Special application notes, edge treatments..." value={installNotes} onChange={e=>setInstallNotes(e.target.value)} style={{resize:'vertical'}}/>)}
                  <div style={{gridColumn:'1 / 3'}}>
                    {fld('Project Description (one-liner)',<input className="field" placeholder="Full fleet wrap, both vans, matching blue scheme" value={projDesc} onChange={e=>setProjDesc(e.target.value)}/>)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 24px',borderTop:'1px solid var(--border)',
          display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg)'}}>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',
            color:'var(--text3)',padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>Cancel</button>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {tab===1&&<>
              <button onClick={()=>handleSave(false)} disabled={saving||!clientName.trim()}
                style={{background:'none',border:'1px solid var(--border)',color:'var(--text2)',
                  padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>💾 Save Estimate</button>
              <button onClick={()=>{if(!clientName.trim()||!vehicleDesc.trim()){setError('Fill in client name and vehicle first');return}setError('');setTab(2)}}
                style={{background:'var(--accent)',color:'#fff',border:'none',padding:'8px 20px',
                  borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700}}>Next: Design & Scope →</button>
            </>}
            {tab===2&&<>
              <button onClick={()=>setTab(1)}
                style={{background:'none',border:'1px solid var(--border)',color:'var(--text3)',
                  padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>← Back</button>
              <button onClick={()=>{
                if(!coverage.trim()){setError('Fill in "Parts to Wrap" scope first');return}
                setError('');setTab2Done(true);setTab(3)}}
                style={{background:'var(--green)',color:'#fff',border:'none',padding:'8px 20px',
                  borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700}}>✓ Scope Complete — Next: Logistics →</button>
            </>}
            {tab===3&&<>
              <button onClick={()=>setTab(2)}
                style={{background:'none',border:'1px solid var(--border)',color:'var(--text3)',
                  padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>← Back</button>
              <button onClick={()=>handleSave(false)} disabled={saving}
                style={{background:'none',border:'1px solid var(--border)',color:'var(--text2)',
                  padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>💾 Save Estimate</button>
              <button onClick={()=>handleSave(true)} disabled={saving}
                style={{background:'var(--green)',color:'#fff',border:'none',padding:'8px 24px',
                  borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:800}}>
                {saving?'Saving…':'✓ Save as Sales Order'}</button>
            </>}
          </div>
        </div>
      </div>
    </div>
  )
}
