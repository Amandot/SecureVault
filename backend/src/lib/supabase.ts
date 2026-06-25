import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/** Supabase JS expects the project root URL, not the PostgREST `/rest/v1` path. */
const normalizeSupabaseUrl = (url: string): string =>
  url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Supabase URL or Service Role Key is missing. Storage functions may fail.');
}

// Service Role client for backend use (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
