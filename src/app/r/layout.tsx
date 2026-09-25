import type { Metadata } from 'next'

// Short-link resolver (302s out of the site).
// These are client components, which cannot export `metadata`, so they used
// to inherit the root `robots: index, follow` and were fully crawlable.
export const metadata: Metadata = {
  title: { absolute: 'Short links | Peak Performance Tutoring' },
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
