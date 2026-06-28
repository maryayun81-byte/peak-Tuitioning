import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { AuthHandler } from '@/components/AuthHandler'
import { HydrationGuard } from '@/components/auth/HydrationGuard'
import { PWAHandler } from '@/components/PWAHandler'
import { NavigationProgress } from '@/components/ui/NavigationProgress'
import { NetworkBanner } from '@/components/ui/NetworkBanner'
import { NavigationRefetchManager } from '@/components/NavigationRefetchManager'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.peakcampus.co.ke'),
  title: "Peak Performance Tutoring Kenya | KCSE & CBC Tuition Centre",
  description:
    "Peak Performance Tutoring is a diagnostic, tiered tutoring system for Kenyan 8-4-4 and CBC learners, built around targeted intervention, active recall, and visible progress.",
  applicationName: 'Peak Performance Tutoring',
  keywords: [
    'Peak Performance Tutoring',
    'Peak Campus',
    'KCSE tutoring Kenya',
    'CBC tutoring Kenya',
    'Nairobi tuition centre',
    '8-4-4 revision',
    'KPSEA',
    'KJSEA',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Peak Performance Tutoring Kenya | KCSE & CBC Tuition Centre",
    description: "Diagnostic-first KCSE and CBC tutoring for Kenyan learners, with tiered groups, guided practice, active recall, and parent-visible progress.",
    url: 'https://www.peakcampus.co.ke',
    siteName: 'Peak Performance Tutoring',
    locale: 'en_KE',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'Peak Performance Tutoring Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peak Performance Tutoring Kenya | KCSE & CBC Tuition Centre',
    description: 'Diagnostic-first tutoring that helps students move from potential to performance.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#0B0F1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'EducationalOrganization',
      '@id': 'https://www.peakcampus.co.ke/#organization',
      name: 'Peak Performance Tutoring',
      alternateName: 'Peak Campus',
      url: 'https://www.peakcampus.co.ke',
      logo: 'https://www.peakcampus.co.ke/icon-512.png',
      description:
        'Diagnostic KCSE and CBC tutoring for Kenyan learners, with targeted intervention, active recall, and visible progress.',
      areaServed: 'Kenya',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.peakcampus.co.ke/#website',
      name: 'Peak Performance Tutoring',
      alternateName: 'Peak Campus',
      url: 'https://www.peakcampus.co.ke',
      publisher: {
        '@id': 'https://www.peakcampus.co.ke/#organization',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon-48x48.png" sizes="48x48" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        {process.env.NODE_ENV === 'development' ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                      registration.unregister();
                    }
                  });
                }
              `,
            }}
          />
        ) : (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  if (!localStorage.getItem('ppt_pwa_patch_v1')) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for(let registration of registrations) {
                        registration.unregister();
                      }
                      localStorage.setItem('ppt_pwa_patch_v1', 'true');
                      window.location.reload();
                    });
                  }
                }
              `,
            }}
          />
        )}
      </head>
      <body>
        <QueryProvider>
          <NavigationRefetchManager />
          <ThemeProvider>
            <NavigationProgress />
            <AuthHandler />
            <NetworkBanner />
            <PWAHandler />
            <HydrationGuard>
              {children}
            </HydrationGuard>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--card)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: { primary: '#10B981', secondary: 'white' },
                },
                error: {
                  iconTheme: { primary: '#EF4444', secondary: 'white' },
                },
              }}
            />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
