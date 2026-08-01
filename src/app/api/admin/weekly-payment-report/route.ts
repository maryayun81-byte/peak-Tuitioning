import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'
import { rateLimit } from '@/lib/rate-limit'
import { runWeeklyPaymentReport } from '@/lib/reports/weekly-payment-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Manual trigger for the weekly payments report — same pipeline the Friday
// cron uses. Allows an admin to generate + email the report on demand.
export async function POST(req: NextRequest) {
  let user: any
  try {
    const auth = await requireAdmin()
    user = auth.user
    const limitRes = rateLimit(`weekly_report_${user.id}`, { limit: 1, windowMs: 60000 })
    if (!limitRes.success) {
      throw new Error('Too many requests. Please wait a minute.')
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Too many') ? 429 : 403 }
    )
  }

  const supabase = await createAdminClient()
  try {
    const body = await req.json().catch(() => ({}))
    const result = await runWeeklyPaymentReport({
      supabase,
      eventId: body.eventId || null,
      weekStart: body.weekStart || null,
    })
    return NextResponse.json({
      ok: true,
      emailed: result.emailed,
      recipients: result.recipients,
      week: result.summary.weekLabel,
      summary: {
        expected: result.summary.expected,
        collected: result.summary.collected,
        outstanding: result.summary.outstanding,
        collectionRate: result.summary.collectionRate,
        flaggedCount: result.summary.flaggedCount,
      },
      pdfs: [
        { name: `weekly-payments-report-${result.summary.weekStart}.pdf`, data: result.pdf1 },
        { name: `weekly-payments-outstanding-${result.summary.weekStart}.pdf`, data: result.pdf2 },
      ],
    })
  } catch (error: any) {
    console.error('[admin:weekly-payment-report]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
