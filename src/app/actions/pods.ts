'use server'

import { createClient } from '@/lib/supabase/server'

export async function getStudentPods(studentId: string, classId?: string) {
  const supabase = await createClient()
  
  // Get pods the student is a member of, or pods that belong to their class
  const { data: memberPods } = await supabase
    .from('pod_members')
    .select('pod_id')
    .eq('student_id', studentId)

  const memberPodIds = (memberPods || []).map(m => m.pod_id)

  let query = supabase
    .from('study_pods')
    .select('*, members:pod_members(count), subject:subjects(name)')
    
  if (classId && memberPodIds.length > 0) {
    query = query.or(`class_id.eq.${classId},id.in.(${memberPodIds.join(',')})`)
  } else if (classId) {
    query = query.eq('class_id', classId)
  } else if (memberPodIds.length > 0) {
    query = query.in('id', memberPodIds)
  } else {
    // No class and no memberships, return empty
    return []
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  
  // Tag which ones the student has joined
  return data.map((p: any) => ({
    ...p,
    hasJoined: memberPodIds.includes(p.id)
  }))
}

export async function joinPod(podId: string, studentId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('pod_members')
    .insert({ pod_id: podId, student_id: studentId })
  
  if (error) throw error
  return true
}

export async function createPod(name: string, description: string, studentId: string, classId?: string) {
  const supabase = await createClient()
  const { data: pod, error: pError } = await supabase
    .from('study_pods')
    .insert({ name, description, created_by: studentId, class_id: classId })
    .select()
    .single()
  
  if (pError) throw pError

  // Auto-join the creator
  await joinPod(pod.id, studentId)

  return pod
}

export async function getPodMessages(podId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pod_messages')
    .select('*, student:students(full_name, avatar_url)')
    .eq('pod_id', podId)
    .order('created_at', { ascending: true })
    .limit(50)
  
  if (error) throw error
  return data
}

export async function sendPodMessage(podId: string, studentId: string, content: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pod_messages')
    .insert({ pod_id: podId, student_id: studentId, content })
    .select('*, student:students(full_name, avatar_url)')
    .single()
  
  if (error) throw error
  return data
}
