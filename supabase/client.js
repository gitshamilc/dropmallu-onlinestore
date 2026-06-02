// supabase/client.js
// Initialize Supabase client for global use
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.4/dist/esm/index.js";

const url = (window.CONFIG && window.CONFIG.SUPABASE_URL) || '';
const key = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) || '';

export const supabase = createClient(url, key);
