// supabase/client.js
// Initialize Supabase client dynamically to prevent CDN block/offline crashes

const url = (window.CONFIG && window.CONFIG.SUPABASE_URL) || '';
const key = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) || '';

export let supabase = null;

export async function initSupabase() {
  if (url && key) {
    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.4/dist/esm/index.js");
      supabase = createClient(url, key);
      return supabase;
    } catch (e) {
      console.warn("Failed to load Supabase SDK from CDN (offline or blocked):", e);
    }
  }
  return null;
}
