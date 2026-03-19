'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/stores/themeStore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config } = useThemeStore()

  useEffect(() => {
    const root = document.documentElement

    // Apply CSS variables
    root.style.setProperty('--bg', config.bg)
    root.style.setProperty('--card', config.card)
    root.style.setProperty('--card-border', config.cardBorder)
    root.style.setProperty('--primary', config.primary)
    root.style.setProperty('--primary-hover', config.primaryHover)
    root.style.setProperty('--accent', config.accent)
    root.style.setProperty('--text', config.text)
    root.style.setProperty('--text-muted', config.textMuted)
    root.style.setProperty('--sidebar', config.sidebar)
    root.style.setProperty('--input', config.input)
    root.style.setProperty('--gradient', config.gradient)
    root.style.setProperty('--font', config.font)

    // Apply background to body
    document.body.style.background = config.bg
    document.body.style.color = config.text
    document.body.style.fontFamily = `'${config.font}', sans-serif`

    // Load Google Font dynamically
    const existingLink = document.getElementById('theme-font')
    if (existingLink) existingLink.remove()

    const link = document.createElement('link')
    link.id = 'theme-font'
    link.rel = 'stylesheet'
    link.href = config.fontUrl
    document.head.appendChild(link)
  }, [config])

  return <>{children}</>
}
