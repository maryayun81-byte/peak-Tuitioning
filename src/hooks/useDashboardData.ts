'use client'

import { usePageData } from './usePageData'
import { getSupabaseBrowserClient } from '../lib/supabase/client'
import { useAuthStore } from '../stores/authStore'
import type { Student } from '../types/database'

const supabase = getSupabaseBrowserClient()

/**
 * useStudentStats
 * Fetches core counts: assignments submitted, certificates/badges earned.
 */
export function useStudentStats(studentId?: string) {
  const { isInitialRevalidationComplete } = useAuthStore()
  return usePageData({
    cacheKey: ['student', 'stats', studentId || ''],
    enabled: isInitialRevalidationComplete && !!studentId,
    fetcher: async () => {
      const [subs, certs, badges] = await Promise.all([
        supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
        supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
        supabase.from('study_badges').select('id', { count: 'exact', head: true }).eq('student_id', studentId)
      ])
      
      return {
        data: {
          tasks: subs.count || 0,
          awards: (certs.count || 0) + (badges.count || 0),
          attendance: 98 // Placeholder for now
        },
        error: subs.error || certs.error || badges.error
      }
    }
  })
}

/**
 * useStudentQuests
 * Fetches the top 3 published assignments for the student's subjects.
 */
export function useStudentQuests(studentId?: string) {
  const { isInitialRevalidationComplete } = useAuthStore()
  return usePageData({
    cacheKey: ['student', 'quests', studentId || ''],
    enabled: isInitialRevalidationComplete && !!studentId,
    fetcher: async () => {
      // 1. Get student's subject IDs
      const { data: subData, error: subError } = await supabase
        .from('student_subjects').select('subject_id').eq('student_id', studentId)
      
      if (subError) return { data: null, error: subError }
      const subjectIds = subData?.map(s => s.subject_id) || []

      if (subjectIds.length === 0) return { data: [], error: null }

      // 2. Fetch assignments (selective fields only)
      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, description, due_date, status, total_marks, subject:subjects(name)')
        .in('subject_id', subjectIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3)

      return {
        data: (data ?? []).map((q: any) => ({
          ...q,
          subject: Array.isArray(q.subject) ? q.subject[0] : q.subject
        })),
        error
      }
    }
  })
}

/**
 * useStudentIntel
 * Fetches recent notifications for the student.
 */
export function useStudentIntel(userId?: string) {
  return usePageData({
    cacheKey: ['student', 'intel', userId || ''],
    enabled: !!userId,
    fetcher: async () => {
      const res = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)
      return { data: res.data, error: res.error }
    }
  })
}

/**
 * useLeaderboardData
 * Fetches the top performers and the current student's global rank.
 */
export function useLeaderboardData(studentId?: string, studentXp?: number) {
  const { isInitialRevalidationComplete } = useAuthStore()
  return usePageData({
    cacheKey: ['student', 'leaderboard', studentId || ''],
    enabled: isInitialRevalidationComplete && !!studentId,
    fetcher: async () => {
      // 1. Fetch top 20 students by XP for Hall of Fame
      let entries: any[] = []
      try {
        // Try global leaderboard RPC if it exists, otherwise fallback to table
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_global_leaderboard', { p_limit: 20 })
        
        if (!rpcError && rpcData) {
          entries = rpcData
        } else {
          // Table fallback (selective fields for efficiency)
          const { data: lbData, error: lbError } = await supabase
            .from('students')
            .select('id, full_name, xp, avatar_url, class:classes(name)')
            .order('xp', { ascending: false })
            .limit(20)

          if (!lbError && lbData) {
            entries = lbData.map((item: any) => ({
              ...item,
              class: Array.isArray(item.class) ? item.class[0] : item.class
            }))
          } else if (lbError) {
            console.warn('[HallOfFame] RLS or Table query failed:', lbError.message)
          }
        }
      } catch (e) {
        console.warn('[HallOfFame] Could not fetch leaderboard:', e)
      }

      // 2. Fetch student global rank
      let rank: number | null = null
      try {
        const { data: rankRes, error: rankErr } = await supabase.rpc('get_student_rank', { input_student_id: studentId })
        if (!rankErr && rankRes != null) {
          rank = rankRes
        } else if (rankErr) {
          console.warn('[Rank] get_student_rank RPC failed:', rankErr.message)
        }
      } catch (e) {
        console.warn('[Rank] get_student_rank RPC error:', e)
      }

      if (rank === null) {
        try {
          // Table fallback for rank
          const { count, error: countErr } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .gt('xp', studentXp || 0)
          
          if (!countErr) {
            rank = (count ?? 0) + 1
          } else {
            console.warn('[Rank] Table fallback failed:', countErr.message)
          }
        } catch (e) {
          console.warn('[Rank] Table fallback error:', e)
          rank = null
        }
      }

      return {
        data: { entries, studentRank: rank },
        error: null
      }
    }
  })
}

/**
 * useStudentAssignments
 * Paginated fetch of assignments for the student's subjects/class/center.
 * Also returns a map of the student's submissions for these assignments.
 */
export function useStudentAssignments(params: {
  studentId?: string
  tuitionCenterId?: string | null
  classId?: string | null
  page: number
  pageSize: number
}) {
  const { studentId, tuitionCenterId, classId, page, pageSize } = params
  const { isInitialRevalidationComplete } = useAuthStore()

  return usePageData({
    cacheKey: ['student', 'assignments', studentId || '', String(page)],
    enabled: isInitialRevalidationComplete && !!studentId,
    fetcher: async () => {
      // 1. Get subject IDs (minimal select)
      const { data: subData } = await supabase
        .from('student_subjects').select('subject_id').eq('student_id', studentId)
      const subjectIds = subData?.map(s => s.subject_id) || []

      if (subjectIds.length === 0) return { data: { assignments: [], submissions: {}, count: 0 }, error: null }

      // 2. Fetch assignments (selective fields)
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('assignments')
        .select('id, title, description, due_date, status, total_marks, max_marks, is_workbook, attachment_url, lock_after_deadline, worksheet, subject:subjects(name), teacher:teachers(full_name)', { count: 'exact' })
        .in('subject_id', subjectIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (tuitionCenterId) {
        query = query.or(`tuition_center_id.eq.${tuitionCenterId},tuition_center_id.is.null`)
      }

      if (classId) {
        query = query.eq('class_id', classId)
      }

      const { data: assignments, count, error: aError } = await query
      if (aError) return { data: null, error: aError }

      // 3. Fetch submissions for these assignments (selective fields)
      const assignmentIds = assignments?.map(a => a.id) || []
      const { data: subDataList, error: sError } = await supabase
        .from('submissions')
        .select('id, assignment_id, student_id, status, marks, submitted_at, worksheet_answers')
        .eq('student_id', studentId)
        .in('assignment_id', assignmentIds)

      const submissionMap = (subDataList ?? []).reduce((acc, s) => {
        acc[s.assignment_id] = s
        return acc
      }, {} as Record<string, any>)

      return {
        data: {
          assignments: assignments || [],
          submissions: submissionMap,
          count: count || 0
        },
        error: sError
      }
    },
    deps: [page, pageSize, tuitionCenterId, classId]
  })
}

/**
 * useStudentQuizzes
 * Fetches quizzes targeted to this student (all_classes OR specific class).
 * Returns { quizzes, attempts }.
 */
export function useStudentQuizzes(studentId?: string, classId?: string | null, tuitionCenterId?: string | null) {
  const { isInitialRevalidationComplete } = useAuthStore()
  return usePageData({
    cacheKey: ['student', 'quizzes', studentId || ''],
    enabled: isInitialRevalidationComplete && !!studentId,
    fetcher: async () => {
      // 1. Fetch IDs of quizzes for "all_classes" or student's specific class
      const now = new Date().toISOString()
      
      const [allRes, classRes, aRes] = await Promise.all([
        supabase.from('quizzes')
          .select('id')
          .eq('audience', 'all_classes')
          .eq('is_published', true)
          .or(`publish_at.is.null,publish_at.lte.${now}`)
          .or(`tuition_center_id.eq.${tuitionCenterId},tuition_center_id.is.null`),
        classId
          ? supabase.from('quizzes')
              .select('id')
              .in('audience', ['class', 'class_subject'])
              .eq('class_id', classId)
              .eq('is_published', true)
              .or(`publish_at.is.null,publish_at.lte.${now}`)
              .or(`tuition_center_id.eq.${tuitionCenterId},tuition_center_id.is.null`)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('quiz_attempts').select('id, quiz_id, student_id, score, completed_at, status').eq('student_id', studentId)
      ])

      const matchedIds = [...(allRes.data || []), ...(classRes.data || [])].map((q: any) => q.id)
      
      let quizzes: any[] = []
      if (matchedIds.length > 0) {
        const { data: finalData, error: qError } = await supabase
          .from('quizzes')
          .select('*, subject:subjects(name), teacher:teachers(full_name)')
          .in('id', matchedIds)
          .order('created_at', { ascending: false })
        
        if (qError) return { data: null, error: qError }
        quizzes = finalData || []
      }

      const attempts = (aRes.data ?? []).reduce((acc: Record<string, any[]>, a: any) => {
        if (!acc[a.quiz_id]) acc[a.quiz_id] = []
        acc[a.quiz_id].push(a)
        return acc
      }, {})

      return {
        data: {
          quizzes,
          attempts
        },
        error: aRes.error
      }
    }
  })
}

/**
 * useKnowledgeFeed
 * Fetches dynamic "Word of the Day" and "Quick Fact" from the database.
 * Rotates 4 times a day based on a consistent seed.
 */
export function useKnowledgeFeed() {
  return usePageData({
    cacheKey: ['knowledge', 'feed'],
    fetcher: async () => {
      const { data, error } = await supabase
        .from('app_knowledge_base')
        .select('*')
        .eq('is_active', true)
      
      if (error) return { data: null, error }

      // Rotation Logic: 4 items per day
      const now = new Date()
      const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24))
      const hourSegment = Math.floor(now.getHours() / 6)
      const seed = daysSinceEpoch * 4 + hourSegment

      const vocabs = data?.filter((i: any) => i.category === 'vocabulary') || []
      const facts = data?.filter((i: any) => i.category === 'fact') || []

      return {
        data: {
          word: vocabs.length > 0 ? vocabs[seed % vocabs.length].content : null,
          fact: facts.length > 0 ? facts[seed % facts.length].content : null
        },
        error: null
      }
    }
  })
}

/**
 * useLibraryBooks
 * Fetches all published books from the Peak Library.
 */
export function useLibraryBooks() {
  return usePageData({
    cacheKey: ['library', 'books'],
    fetcher: async () => {
      return await supabase
        .from('library_books')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
    }
  })
}

/**
 * useStudentLibrary
 * Fetches the student's personal reading shelf and progress.
 */
export function useStudentLibrary(studentId?: string) {
  return usePageData({
    cacheKey: ['library', 'student', studentId || 'guest'],
    fetcher: async () => {
      if (!studentId) return { data: null, error: null }
      return await supabase
        .from('library_student_progress')
        .select('*, book:library_books(*)')
        .eq('student_id', studentId)
    }
  })
}
