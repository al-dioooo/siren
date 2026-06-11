"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

/** Client Supabase browser (anon) — hanya untuk Realtime channel (OPTIMIZATIONS.md §6). */
export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  client ??= createClient(url, key, { auth: { persistSession: false } })
  return client
}
