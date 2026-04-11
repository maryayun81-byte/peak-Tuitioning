import { createBrowserClient } from '@supabase/ssr'
import { resilientFetch } from '../resilientFetch'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: resilientFetch,
      },
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
