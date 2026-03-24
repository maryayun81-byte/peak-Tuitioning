import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Notification } from '@/types/database'
import type { SoundVariant } from '@/lib/sounds'

export interface NotificationPreferences {
  soundEnabled: boolean
  soundVariant: SoundVariant
  levelUp: boolean
  questReminders: boolean
  teacherIntel: boolean
  globalNews: boolean
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  preferences: NotificationPreferences
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  deleteNotification: (id: string) => void
  clearAll: () => void
  updatePreference: <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      preferences: {
        soundEnabled: true,
        soundVariant: 'classic',
        levelUp: true,
        questReminders: true,
        teacherIntel: true,
        globalNews: true,
      },

      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter(n => !n.read).length,
        }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + (notification.read ? 0 : 1),
        })),

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      deleteNotification: (id) =>
        set((state) => {
          const notif = state.notifications.find(n => n.id === id)
          return {
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: state.unreadCount - (notif && !notif.read ? 1 : 0),
          }
        }),

      clearAll: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),

      updatePreference: (key, value) => 
        set((state) => ({
          preferences: { ...state.preferences, [key]: value }
        })),
    }),
    {
      name: 'peak-notification-settings',
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
)
