'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client (Client Components)
 * Singleton — reuses the same instance across renders
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
