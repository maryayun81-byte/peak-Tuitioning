import type { Metadata } from 'next'
import FinanceLayout from './FinanceLayout'

// Finance console is authenticated product UI, not marketing content.
// The previous client-side layout could not export `metadata`, so every
// portal URL inherited the root `robots: index, follow` and was presented to
// Google as indexable. This server layout keeps the whole segment out of the
// index while still allowing crawlers to follow links out of it.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <FinanceLayout>{children}</FinanceLayout>
}
