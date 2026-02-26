import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import ConditionReportClient from './ConditionReportClient'

export default async function ConditionReportPage({ params }: { params: { token: string } }) {
  const admin = getSupabaseAdmin()

  const { data: report } = await admin
    .from('condition_reports')
    .select('*, projects(title, form_data)')
    .eq('report_token', params.token)
    .single()

  if (!report) notFound()

  return <ConditionReportClient report={report} token={params.token} />
}
