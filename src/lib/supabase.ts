// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

// ✅ Use SUPABASE_URL (not VITE_) to avoid exposing secrets in browser bundle
// ✅ VITE_SUPABASE_ANON_KEY is safe to expose (publishable key)
const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';
const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY || '';

// ============================================================
// DEBUG LOG (remove after confirming)
// ============================================================

console.log('🔍 Supabase Config:', {
  url: supabaseUrl ? '✅ Set' : '❌ Missing',
  key: supabaseKey ? '✅ Set' : '❌ Missing',
  serviceKey: serviceKey ? '✅ Set' : '❌ Missing',
});

// ============================================================
// VALIDATION
// ============================================================

if (!supabaseUrl) {
  console.warn('⚠️ SUPABASE_URL is not set. Supabase client will not work.');
}

if (!supabaseKey) {
  console.warn('⚠️ VITE_SUPABASE_ANON_KEY is not set. Supabase client will not work.');
}

// ============================================================
// CLIENT INSTANCES
// ============================================================

/**
 * Public/Anonymous client for browser-side operations
 */
export const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Admin client with service role key (for backend operations)
 * Use this sparingly and NEVER in client-side code
 */
export const supabaseAdmin: SupabaseClient | null = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey)
  : null;

// ============================================================
// WINDOW COMPATIBILITY (for existing code)
// ============================================================

if (supabase) {
  (window as any).supabase = supabase;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseKey && !!supabase;
};

/**
 * Get the Supabase URL (for debugging)
 */
export const getSupabaseUrl = (): string => {
  return supabaseUrl || '';
};

/**
 * Safe Supabase query executor with error handling
 */
export const executeQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<T> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  const { data, error } = await queryFn();
  
  if (error) {
    console.error('🔴 Supabase Error:', error);
    throw error;
  }
  
  if (data === null || data === undefined) {
    throw new Error('No data returned from query');
  }
  
  return data;
};

/**
 * Safe Supabase list query executor
 */
export const executeListQuery = async <T>(
  queryFn: () => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  const { data, error } = await queryFn();
  
  if (error) {
    console.error('🔴 Supabase Error:', error);
    throw error;
  }
  
  return data || [];
};

// ============================================================
// TYPES
// ============================================================

export type Booking = {
  id: string;
  guest_name?: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_id_number?: string;
  guest_id_photo?: string;
  guest_signature?: string;
  guest_province?: string;
  guest_city?: string;
  guest_country?: string;
  check_in_date?: string;
  check_out_date?: string;
  nights?: number;
  adults?: number;
  children?: number;
  total_amount?: number;
  status?: string;
  booking_source?: string;
  referral_source?: string;
  marketing_consent?: boolean;
  arriving_from?: string;
  next_destination?: string;
  created_at?: string;
  updated_at?: string;
  business_id?: string;
};

export type Business = {
  id: string;
  trading_name: string;
  registered_name: string;
  email: string;
  status: 'pending' | 'approved' | 'suspended' | 'archived';
  subscription_tier?: string;
  total_rooms?: number;
  logo_url?: string;
  hero_image_url?: string;
  phone?: string;
  physical_address?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
  };
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default supabase;
