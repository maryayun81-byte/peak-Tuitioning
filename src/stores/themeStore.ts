import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type Theme, DEFAULT_THEME, getTheme, type ThemeConfig } from '@/lib/themes'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface ThemeState {
  theme: Theme
  config: ThemeConfig
  setTheme: (theme: Theme) => void
  syncThemeToProfile: (theme: Theme, profileId: string) => Promise<void>
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      config: getTheme(DEFAULT_THEME),
      setTheme: (theme) => set({ theme, config: getTheme(theme) }),
      syncThemeToProfile: async (theme, profileId) => {
        set({ theme, config: getTheme(theme) })
        const supabase = getSupabaseBrowserClient()
        const { error } = await supabase.from('profiles').update({ theme }).eq('id', profileId)
        if (error) {
          console.warn('Failed to sync theme:', error.message)
          toast.error('Theme applied locally, but failed to save to account.')
        }
      }
    }),
    { name: 'ppt-theme' }
  )
)
