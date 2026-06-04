// supabase/client.js
// Initialize Supabase client for global use
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.4/dist/esm/index.js";

const url = (window.CONFIG && window.CONFIG.SUPABASE_URL) || '';
const key = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) || '';

// Avoid throwing error if CONFIG URL/key is blank or invalid
export const supabase = (url && key) ? createClient(url, key) : null;
