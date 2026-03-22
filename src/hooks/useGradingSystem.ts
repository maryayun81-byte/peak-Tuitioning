import { useState, useCallback, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { GradingSystem, GradingScale } from '@/types/database'

export interface UseGradingSystemProps {
  curriculumId?: string
  classId?: string
  subjectId?: string
}

export function useGradingSystem({ curriculumId, classId, subjectId }: UseGradingSystemProps) {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [system, setSystem] = useState<GradingSystem | null>(null)
  const [scales, setScales] = useState<GradingScale[]>([])

  const loadSystem = useCallback(async () => {
    if (!curriculumId) return
    setLoading(true)
    try {
      // 1. Try to find the most specific system first
      // Order of preference:
      // a. subject + class specific
      // b. subject specific (all classes)
      // c. class specific (all subjects)
      // d. curriculum global
      
      let query = supabase
        .from('grading_systems')
        .select('*, scales:grading_scales(*)')
        .eq('curriculum_id', curriculumId)

      const { data: systems } = await query

      if (!systems || systems.length === 0) {
        setSystem(null)
        setScales([])
        return
      }

      // Hierarchy logic
      let selected = systems.find(s => s.subject_id === subjectId && s.class_id === classId) ||
                       systems.find(s => s.subject_id === subjectId && !s.class_id) ||
                       systems.find(s => !s.subject_id && s.class_id === classId) ||
                       systems.find(s => !s.subject_id && !s.class_id && s.is_default) ||
                       systems[0]

      setSystem(selected)
      setScales(selected.scales || [])
    } finally {
      setLoading(false)
    }
  }, [curriculumId, classId, subjectId, supabase])

  useEffect(() => {
    loadSystem()
  }, [loadSystem])

  const calculateGrade = useCallback((marks: number) => {
    if (scales.length === 0) return null
    
    const scale = scales.find(s => marks >= s.min_score && marks <= s.max_score)
    return scale ? { grade: scale.grade, points: scale.points, systemId: system?.id } : null
  }, [scales, system?.id])

  return {
    loading,
    system,
    scales,
    calculateGrade,
    refresh: loadSystem
  }
}
