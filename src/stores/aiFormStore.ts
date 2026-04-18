import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AIIntent = 'assignment' | 'quiz' | 'trivia' | 'resource'

export interface AIFormState {
  parsedData: any | null
  intent: AIIntent | null
  status: 'idle' | 'parsing' | 'extracting' | 'generating' | 'completed' | 'failed'
  lastGeneratedAt: number | null
  
  // Actions
  setParsedData: (data: any, intent: AIIntent) => void
  setStatus: (status: AIFormState['status']) => void
  clear: () => void
}

export const useAIFormStore = create<AIFormState>()(
  persist(
    (set) => ({
      parsedData: null,
      intent: null,
      status: 'idle',
      lastGeneratedAt: null,

      setParsedData: (data, intent) => set({ 
        parsedData: data, 
        intent, 
        status: 'completed', 
        lastGeneratedAt: Date.now() 
      }),
      
      setStatus: (status) => set({ status }),
      
      clear: () => set({ 
        parsedData: null, 
        intent: null, 
        status: 'idle', 
        lastGeneratedAt: null 
      }),
    }),
    {
      name: 'peak_teacher_ai_form_store',
    }
  )
)
