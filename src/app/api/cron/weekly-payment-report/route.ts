import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runWeeklyPaymentReport } from '@/lib/reports/weekly-payment-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Scheduled every Friday at 11:30 (EAT / UTC+3). Vercel runs crons in UTC,
// so this is configured as "30 8 * * 5". Vercel appends an
// "Authorization: Bearer <CRON_SECRET>" header when CRON_SECRET is set.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Fail closed in production — never run the report unauthenticated.
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  const supabase = await createAdminClient()
  try {
    const result = await runWeeklyPaymentReport({ supabase })
    return NextResponse.json({
      ok: true,
      emailed: result.emailed,
      recipients: result.recipients,
      week: result.summary.weekLabel,
      collected: result.summary.collected,
      outstanding: result.summary.outstanding,
    })
  } catch (error: any) {
    console.error('[cron:weekly-payment-report]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
