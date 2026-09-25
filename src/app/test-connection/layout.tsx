import type { Metadata } from 'next'

// Internal connectivity check.
// These are client components, which cannot export `metadata`, so they used
// to inherit the root `robots: index, follow` and were fully crawlable.
export const metadata: Metadata = {
  title: { absolute: 'Connection test | Peak Performance Tutoring' },
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
