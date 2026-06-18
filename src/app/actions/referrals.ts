'use server'

import { createClient } from '@/lib/supabase/server'

export async function getReferralSummary(studentId: string) {
  const supabase = await createClient()

  const { data: codeData, error: codeError } = await supabase.rpc('ensure_student_referral_code', { p_student_id: studentId })
  if (codeError) {
    return {
      referralCode: '',
      completedCount: 0,
      pendingCount: 0,
    }
  }
  const referralCode = codeData || ''

  const { count: completedCount, error: completedError } = await supabase
    .from('student_referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_student_id', studentId)
    .eq('status', 'completed')

  const { count: pendingCount, error: pendingError } = await supabase
    .from('student_referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_student_id', studentId)
    .eq('status', 'pending')

  return {
    referralCode,
    completedCount: completedError ? 0 : completedCount || 0,
    pendingCount: pendingError ? 0 : pendingCount || 0,
  }
}

export async function createReferralInvite(studentId: string) {
  const supabase = await createClient()
  const summary = await getReferralSummary(studentId)

  await supabase.from('student_referrals').insert({
    referrer_student_id: studentId,
    referral_code: summary.referralCode,
    status: 'pending',
  })

  return summary
}
