import type { Metadata } from 'next'

// The registration form is client-side, so metadata lives in this server
// layout — without it the page inherits only the root title/description.
export const metadata: Metadata = {
  title: { absolute: 'Events & Holiday Registration | Peak Performance Tutoring' },
  description:
    'Register your child for Peak Performance holiday tuition, revision clinics and academic events in Nairobi, Kenya.',
  alternates: { canonical: '/events/register' },
  openGraph: {
    title: 'Events & Holiday Registration | Peak Performance Tutoring',
    description:
      'Secure a seat in Peak holiday tuition and revision events. Small groups, diagnostics and visible progress.',
    url: 'https://www.peakcampus.co.ke/events/register',
    siteName: 'Peak Performance Tutoring',
  },
}

export default function EventsRegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
