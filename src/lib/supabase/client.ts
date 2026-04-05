import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Removed global.fetch override because passing a custom fetch 
      // completely disables Supabase storage's ability to track upload progress 
      // (which relies on XMLHttpRequest internally).
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
