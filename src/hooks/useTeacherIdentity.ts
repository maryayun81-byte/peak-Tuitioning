'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function useTeacherIdentity() {
  const { profile, teacher } = useAuthStore()

  const teacherIds = useMemo(() => {
    const ids = new Set<string>()
    if (teacher?.id) ids.add(teacher.id)
    ;((teacher as any)?.linked_teacher_ids || []).forEach((id: string) => {
      if (id) ids.add(id)
    })
    return Array.from(ids)
  }, [teacher?.id, (teacher as any)?.linked_teacher_ids])

  return {
    profile,
    teacher,
    teacherIds,
    primaryTeacherId: teacher?.id || teacherIds[0] || '',
    hasTeacherIdentity: teacherIds.length > 0,
  }
}
