import { create } from 'zustand'

interface PWAState {
  installPrompt: any | null
  isIOS: boolean
  isStandalone: boolean
  setInstallPrompt: (prompt: any | null) => void
  setIsIOS: (isIOS: boolean) => void
  setIsStandalone: (isStandalone: boolean) => void
}

export const usePWAStore = create<PWAState>((set) => ({
  installPrompt: null,
  isIOS: false,
  isStandalone: false,
  setInstallPrompt: (installPrompt) => set({ installPrompt }),
  setIsIOS: (isIOS) => set({ isIOS }),
  setIsStandalone: (isStandalone) => set({ isStandalone }),
}))
