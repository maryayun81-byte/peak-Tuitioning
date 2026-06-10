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

export function createLoginClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
      },
      global: {
        fetch: resilientFetch,
      },
    }
  )
}

// Singleton for client components
let client: ReturnType<typeof createClient> | null = null
let loginClient: ReturnType<typeof createLoginClient> | null = null

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createClient()
  }
  return client
}

export function getSupabaseLoginClient() {
  if (!loginClient) {
    loginClient = createLoginClient()
  }
  return loginClient
}
