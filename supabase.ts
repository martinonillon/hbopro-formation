import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lltugwxgbacrqxnaoxft.supabase.co';
// Normalize URL in case user provided rest/v1 suffix
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsdHVnd3hnYmFjcnF4bmFveGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NDE3MzYsImV4cCI6MjEwMTMxNzczNn0.5WjQisV4MGGXC3MtsZz366fcfnTRsnIg0Id3GrerrGg';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const SUPABASE_BASE_URL = supabaseUrl;
