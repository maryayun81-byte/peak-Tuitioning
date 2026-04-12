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
  title: 'Peak Performance Tutoring',
  description: 'Premium tuition management platform for students, teachers, parents and administrators',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Peak Performance Tutoring',
    description: 'Premium tuition management platform',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0B0F1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap"
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
