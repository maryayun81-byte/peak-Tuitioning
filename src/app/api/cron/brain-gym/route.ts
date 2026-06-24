import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/app/actions/push'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const hour = new Date().getHours()
  const minute = new Date().getMinutes()

  const isMorning = hour < 15
  const sessionLabel = isMorning ? 'Morning' : 'Evening'
  const isReminder = minute >= 55 // 5-minute reminders fire at :55
  const notificationType = isReminder ? 'reminder' : 'ready'

  // Fetch all students who have a user_id (active accounts)
  const { data: students, error: sErr } = await admin
    .from('students')
    .select('id, user_id, full_name')

  if (sErr || !students) {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }

  // Filter to those who haven't played Brain Gym today
  const { data: streaks, error: stErr } = await admin
    .from('brain_gym_streaks')
    .select('student_id')
    .eq('last_played_date', today)

  if (stErr) {
    return NextResponse.json({ error: 'Failed to fetch streaks' }, { status: 500 })
  }

  const playedToday = new Set((streaks || []).map(s => s.student_id))
  const eligible = students.filter(s => !playedToday.has(s.id))

  if (eligible.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

  let title: string
  let body: string
  let pushBody: string

  if (isReminder) {
    title = `⏰ ${sessionLabel} Brain Gym in 5 Minutes!`
    body = `${sessionLabel.toLowerCase()} brain gym starts soon. Get ready to challenge your mind!`
    pushBody = `Your ${sessionLabel.toLowerCase()} brain gym is starting in 5 minutes! Don't miss it.`
  } else {
    title = `🧠 ${sessionLabel} Brain Gym Ready!`
    body = `Your ${sessionLabel.toLowerCase()} brain gym session is waiting. Keep your streak alive!`
    pushBody = `Your ${sessionLabel.toLowerCase()} brain gym is ready! Complete it to keep your streak going.`
  }

  const notifications = eligible.map(s => ({
    user_id: s.user_id,
    title,
    body,
    type: 'brain_gym',
    data: { href: '/student/brain-gym', session: isMorning ? 'morning' : 'evening', reminder: isReminder },
  }))

  const { error: nErr } = await admin.from('notifications').insert(notifications)
  if (nErr) {
    return NextResponse.json({ error: 'Failed to insert notifications' }, { status: 500 })
  }

  // Send push notifications for when user is not on the app
  const userIds = eligible.map(s => s.user_id)
  await sendPushNotification(userIds, {
    title,
    body: pushBody,
    href: '/student/brain-gym',
    tag: `brain-gym-${isReminder ? 'reminder' : 'ready'}-${isMorning ? 'am' : 'pm'}`,
  })

  return NextResponse.json({
    notified: eligible.length,
    session: isMorning ? 'morning' : 'evening',
    type: notificationType,
  })
}
