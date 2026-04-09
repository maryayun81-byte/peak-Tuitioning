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
  isInitialRevalidationComplete: boolean
  setProfile: (profile: Profile | null) => void
  setStudent: (student: Student | null) => void
  setTeacher: (teacher: Teacher | null) => void
  setParent: (parent: Parent | null) => void
  setSelectedStudent: (student: Student | null) => void
  setLoading: (loading: boolean) => void
  setRevalidationComplete: (complete: boolean) => void
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
      // Start as true — onRehydrateStorage below will set it to false
      // immediately when a persisted profile already exists, so pages that
      // rehydrate from localStorage never flash a full spinner.
      isLoading: true,
      isInitialRevalidationComplete: false,

      setProfile: (profile) => set({ profile }),
      setStudent: (student) => set({ student }),
      setTeacher: (teacher) => set({ teacher }),
      setParent: (parent) => set({ parent }),
      setSelectedStudent: (selectedStudent) => set({ selectedStudent }),
      setLoading: (isLoading) => set({ isLoading }),
      setRevalidationComplete: (isInitialRevalidationComplete) => set({ isInitialRevalidationComplete }),
      reset: () => set({ 
        profile: null, 
        student: null, 
        teacher: null, 
        parent: null, 
        selectedStudent: null, 
        isLoading: false,
        isInitialRevalidationComplete: false 
      }),
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
      // After rehydration: if we already have a persisted profile, there's no
      // need to block the UI with isLoading=true — the user is visibly logged in.
      // AuthHandler will still silently refresh the session in the background.
      onRehydrateStorage: () => (state) => {
        if (state?.profile) {
          state.isLoading = false
        }
      },
    }
  )
)
