'use client'

import { useState } from 'react'

/**
 * Peak Campus emblem for examination papers. Every exam surface —
 * builder preview, student briefing, live paper, marked result, print —
 * carries the logo so papers always look official.
 * Falls back gracefully if the file is ever missing.
 */
export function SchoolLogo({ size = 44 }: { size?: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-label="Peak Campus"
      >
        P
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Peak Campus logo"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  )
}
