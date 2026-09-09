'use client'

import { useEffect } from 'react'

export function ServiceWorkerUnregister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
        }
      })
    } else {
      if (!localStorage.getItem('ppt_pwa_patch_v1')) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
          }
          localStorage.setItem('ppt_pwa_patch_v1', 'true')
          window.location.reload()
        })
      }
    }
  }, [])

  return null
}
