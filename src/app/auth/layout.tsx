import type { Metadata } from 'next'

// Account sign-in / sign-up routes. Not content.
// These are client components, which cannot export `metadata`, so they used
// to inherit the root `robots: index, follow` and were fully crawlable.
export const metadata: Metadata = {
  title: { absolute: 'Authentication | Peak Performance Tutoring' },
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
