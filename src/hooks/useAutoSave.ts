'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AutoSaveOptions {
  /** Debounce delay in ms before writing to localStorage (default: 1500ms) */
  debounceMs?: number
  /** Whether to show a browser "Leave page?" warning when there is unsaved data */
  warnOnLeave?: boolean
}

/**
 * useAutoSave
 * Persists form state to localStorage on every data change (debounced).
 * Shows a browser "Are you sure you want to leave?" prompt if dirty.
 * Exposes { hasSavedDraft, restore, clear, draftAge }.
 */
export function useAutoSave<T>(
  storageKey: string,
  data: T,
  onRestore?: (savedData: T) => void,
  options: AutoSaveOptions = {}
) {
  const { debounceMs = 1500, warnOnLeave = true } = options

  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  const [draftAge, setDraftAge] = useState<string | null>(null)
  const isDirtyRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedStr = useRef<string | null>(null)
  const initialStr = useRef<string | null>(null)

  // ── 1. Check for existing draft on mount ──────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(`draft_${storageKey}`)
    if (saved) {
      try {
        JSON.parse(saved) // validate
        setHasSavedDraft(true)

        // Compute age
        const ts = localStorage.getItem(`draft_${storageKey}_ts`)
        if (ts) {
          const diff = Date.now() - Number(ts)
          const mins = Math.floor(diff / 60000)
          const hrs = Math.floor(mins / 60)
          setDraftAge(
            hrs > 0
              ? `${hrs}h ${mins % 60}m ago`
              : mins > 0
              ? `${mins}m ago`
              : 'just now'
          )
        }
      } catch {
        localStorage.removeItem(`draft_${storageKey}`)
        localStorage.removeItem(`draft_${storageKey}_ts`)
      }
    }

    // Capture initial state so we don't warn on clean load
    initialStr.current = JSON.stringify(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // ── 2. Debounced auto-save on every data change ───────────────────
  useEffect(() => {
    const currentStr = JSON.stringify(data)

    // Don't save if nothing changed
    if (currentStr === lastSavedStr.current) return

    // Mark as dirty once data diverges from initial
    if (initialStr.current !== null && currentStr !== initialStr.current) {
      isDirtyRef.current = true
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(`draft_${storageKey}`, currentStr)
      localStorage.setItem(`draft_${storageKey}_ts`, String(Date.now()))
      lastSavedStr.current = currentStr
      // console.debug(`[AutoSave] Saved draft: ${storageKey}`)
    }, debounceMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [data, storageKey, debounceMs])

  // ── 3. beforeunload warning ───────────────────────────────────────
  useEffect(() => {
    if (!warnOnLeave) return

    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
      e.returnValue = '' // Chrome requires returnValue to be set
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [warnOnLeave])

  // ── Restore ───────────────────────────────────────────────────────
  const restore = useCallback(() => {
    const saved = localStorage.getItem(`draft_${storageKey}`)
    if (saved && onRestore) {
      try {
        onRestore(JSON.parse(saved))
        setHasSavedDraft(false)
        isDirtyRef.current = false
      } catch {
        // corrupted — remove
        localStorage.removeItem(`draft_${storageKey}`)
        localStorage.removeItem(`draft_${storageKey}_ts`)
        setHasSavedDraft(false)
      }
    }
  }, [storageKey, onRestore])

  // ── Clear ─────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    localStorage.removeItem(`draft_${storageKey}`)
    localStorage.removeItem(`draft_${storageKey}_ts`)
    setHasSavedDraft(false)
    isDirtyRef.current = false
  }, [storageKey])

  return { hasSavedDraft, restore, clear, draftAge }
}
