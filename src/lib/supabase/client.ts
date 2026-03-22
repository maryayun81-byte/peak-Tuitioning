import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
          // Apply a 12-second timeout to standard database queries ONLY.
          if (typeof url === 'string' && (url.includes('/rest/v1') || url.includes('/graphql/v1'))) {
             const controller = new AbortController()
             const timeoutId = setTimeout(() => controller.abort(), 12000)
             try {
                const response = await fetch(url, { ...options, signal: controller.signal })
                return response
             } finally {
                clearTimeout(timeoutId)
             }
          }
          return fetch(url, options)
        }
      }
    }
  )
}

// Singleton for client components
let client: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createClient()
  }
  return client
}
