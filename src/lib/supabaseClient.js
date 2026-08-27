import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loudly in dev rather than silently breaking every query later.
  console.warn(
    '[ResolveAI] Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    '(copy .env.example to .env.local locally, or add them in your host\'s project settings).'
  )
}

export const supabase = createClient(url, anonKey)
