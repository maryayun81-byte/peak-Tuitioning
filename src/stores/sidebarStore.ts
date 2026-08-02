'use client'

import { create } from 'zustand'

interface SidebarState {
  collapsed: boolean
  mobileOpen: boolean
  setCollapsed: (collapsed: boolean) => void
  setMobileOpen: (mobileOpen: boolean) => void
  toggle: () => void
}

export const useSidebarStore = create<SidebarState>()((set, get) => ({
  collapsed: false,
  mobileOpen: false,
  setCollapsed: (collapsed) => set({ collapsed }),
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  toggle: () => set({ collapsed: !get().collapsed }),
}))

export const sidebarCollapsedKey = (userId: string) => `sidebar-collapsed-${userId}`

export const SIDEBAR_WIDTHS = {
  expanded: 280,
  collapsed: 80,
} as const
