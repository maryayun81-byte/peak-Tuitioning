import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, Student, Teacher, Parent } from '@/types/database'

interface AuthState {
  profile: Profile | null
  student: Student | null
  teacher: Teacher | null
  parent: Parent | null
  selectedStudent: Student | null
  isLoading: boolean
  setProfile: (profile: Profile | null) => void
  setStudent: (student: Student | null) => void
  setTeacher: (teacher: Teacher | null) => void
  setParent: (parent: Parent | null) => void
  setSelectedStudent: (student: Student | null) => void
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
      selectedStudent: null,
      isLoading: false, 

      setProfile: (profile) => set({ profile }),
      setStudent: (student) => set({ student }),
      setTeacher: (teacher) => set({ teacher }),
      setParent: (parent) => set({ parent }),
      setSelectedStudent: (selectedStudent) => set({ selectedStudent }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ profile: null, student: null, teacher: null, parent: null, selectedStudent: null, isLoading: false }),
    }),
    {
      name: 'ppt-auth',
      partialize: (state) => ({
        profile: state.profile,
        student: state.student,
        teacher: state.teacher,
        parent: state.parent,
        selectedStudent: state.selectedStudent,
      }),
    }
  )
)
