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
 *
 * FIX: Previously the debounce cleanup on unmount would cancel pending saves,
 * meaning any data typed < 1500ms before navigating away was silently lost.
 * Now we flush the pending save synchronously both on unmount AND in the
 * beforeunload handler so drafts always survive navigation and browser close.
 */
export function useAutoSave<T>(
  storageKey: string,
  data: T,
  onRestore?: (savedData: T) => void,
  options: AutoSaveOptions = {}
) {
  const { debounceMs = 1500, warnOnLeave = true } = options

  // ── 0. Internal State ──────────────────────────────────────────
  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  const [draftAge, setDraftAge] = useState<string | null>(null)
  const [isSuppressed, setIsSuppressed] = useState(false) // Flag to prevent overwriting existing draft

  const isDirtyRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedStr = useRef<string | null>(null)
  const initialStr = useRef<string | null>(null)
  // Holds the latest unsaved JSON string so we can flush on unmount / unload
  const pendingDataRef = useRef<string | null>(null)

  // ── 1. Check for existing draft on mount ──────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`draft_${storageKey}`)
      if (saved) {
        JSON.parse(saved) // validate
        setHasSavedDraft(true)
        setIsSuppressed(true) // Don't overwrite until resolved

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
      }
    } catch (e) {
      console.warn('[AutoSave] Failed to read draft from localStorage', e)
    }

    // Capture initial state so we don't warn on clean load
    initialStr.current = JSON.stringify(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // ── 2. Debounced auto-save on every data change ───────────────────
  useEffect(() => {
    const currentStr = JSON.stringify(data)

    // Don't save if nothing changed since last write
    if (currentStr === lastSavedStr.current) return

    // Don't save if we are suppressed (waiting for user to restore/discard existing draft)
    if (isSuppressed) return

    // Mark as dirty once data diverges from initial snapshot
    if (initialStr.current !== null && currentStr !== initialStr.current) {
      isDirtyRef.current = true
      pendingDataRef.current = currentStr // track latest unsaved data
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(`draft_${storageKey}`, currentStr)
      localStorage.setItem(`draft_${storageKey}_ts`, String(Date.now()))
      lastSavedStr.current = currentStr
      pendingDataRef.current = null // already persisted — clear pending ref
    }, debounceMs)

  }, [data, storageKey, debounceMs, isSuppressed])

  // ── 3. Synchronous flush on unmount (Next.js client navigation away) ─
  useEffect(() => {
    return () => {
      // If there is still-pending unsaved data and NOT suppressed, write it immediately
      if (!isSuppressed && isDirtyRef.current && pendingDataRef.current) {
        try {
          localStorage.setItem(`draft_${storageKey}`, pendingDataRef.current)
          localStorage.setItem(`draft_${storageKey}_ts`, String(Date.now()))
        } catch { /* ignore */ }
      }
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [storageKey, isSuppressed])

  // ── 4. beforeunload warning + emergency flush (browser close / refresh) ─
  useEffect(() => {
    if (!warnOnLeave) return

    const handler = (e: BeforeUnloadEvent) => {
      if (isSuppressed || !isDirtyRef.current) return
      if (pendingDataRef.current) {
        try {
          localStorage.setItem(`draft_${storageKey}`, pendingDataRef.current)
          localStorage.setItem(`draft_${storageKey}_ts`, String(Date.now()))
        } catch { /* ignore */ }
      }
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [warnOnLeave, storageKey, isSuppressed])

  // ── Restore ───────────────────────────────────────────────────────
  const restore = useCallback(() => {
    const saved = localStorage.getItem(`draft_${storageKey}`)
    if (saved && onRestore) {
      try {
        onRestore(JSON.parse(saved))
        setHasSavedDraft(false)
        setIsSuppressed(false) // Resume auto-saving the restored state
        isDirtyRef.current = false
        pendingDataRef.current = null
      } catch {
        localStorage.removeItem(`draft_${storageKey}`)
        localStorage.removeItem(`draft_${storageKey}_ts`)
        setHasSavedDraft(false)
        setIsSuppressed(false)
      }
    }
  }, [storageKey, onRestore])

  // ── Clear ─────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    localStorage.removeItem(`draft_${storageKey}`)
    localStorage.removeItem(`draft_${storageKey}_ts`)
    setHasSavedDraft(false)
    setIsSuppressed(false) // Resume auto-saving from fresh state
    isDirtyRef.current = false
    pendingDataRef.current = null
  }, [storageKey])

  return { hasSavedDraft, restore, clear, draftAge }
}

