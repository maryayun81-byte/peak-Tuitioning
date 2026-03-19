import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, Student, Teacher, Parent } from '@/types/database'

interface AuthState {
  profile: Profile | null
  student: Student | null
  teacher: Teacher | null
  parent: Parent | null
  isLoading: boolean
  setProfile: (profile: Profile | null) => void
  setStudent: (student: Student | null) => void
  setTeacher: (teacher: Teacher | null) => void
  setParent: (parent: Parent | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      student: null,
      teacher: null,
      parent: null,
      isLoading: false, // Profile is persisted — don't block UI on mount

      setProfile: (profile) => set({ profile }),
      setStudent: (student) => set({ student }),
      setTeacher: (teacher) => set({ teacher }),
      setParent: (parent) => set({ parent }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ profile: null, student: null, teacher: null, parent: null, isLoading: false }),
    }),
    {
      name: 'ppt-auth',
      partialize: (state) => ({
        profile: state.profile,
        student: state.student,
        teacher: state.teacher,
        parent: state.parent,
      }),
    }
  )
)
