import { getSupabaseAdmin } from '@/lib/supabase/service'
import BrandPortfolioPublic from './BrandPortfolioPublic'
import { notFound } from 'next/navigation'

export default async function BrandPortfolioPage({ params, searchParams }: {
  params: { portfolioId: string }
  searchParams: { edit?: string }
}) {
  const admin = getSupabaseAdmin()

  const { data: portfolio } = await admin
    .from('brand_portfolios')
    .select('*')
    .eq('id', params.portfolioId)
    .single()

  if (!portfolio) notFound()

  // Track view
  if (portfolio.status === 'sent') {
    admin.from('brand_portfolios').update({ status: 'viewed', updated_at: new Date().toISOString() }).eq('id', params.portfolioId)
  }

  const editMode = searchParams.edit === 'true'

  return <BrandPortfolioPublic portfolio={portfolio} editMode={editMode} />
}
