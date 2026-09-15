import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/app/actions/push'

/**
 * POST /api/push/test — sends a test push to the caller's own devices and
 * returns the delivery summary. This is the user-facing proof that push
 * works: if `sent` is 0 with reason `no-subscriptions`, the browser has no
 * subscription (enable notifications first); `missing-vapid-keys` means the
 * server is misconfigured (Vercel env).
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const summary = await sendPushNotification([user.id], {
      title: '🔔 Peak test notification',
      body: 'Push is working on this device. You will get assignment and message alerts here.',
      href: '/',
      tag: 'peak-push-test',
    })

    return NextResponse.json({ ok: summary.sent > 0, ...summary })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Test failed' }, { status: 500 })
  }
}
