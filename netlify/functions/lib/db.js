// netlify/functions/lib/db.js
// ✅ Database connection utility for Netlify Functions

import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

/**
 * Get or create a Supabase client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export const getSupabase = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials: SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
};

/**
 * Execute a SQL query using Supabase's RPC
 * @param {string} query - SQL query to execute
 * @param {any[]} params - Query parameters
 * @returns {Promise<any>}
 */
export const query = async (query, params = []) => {
  const supabase = getSupabase();
  
  try {
    // Use Supabase's rpc function to execute raw SQL
    const { data, error } = await supabase.rpc('execute_sql', {
      query_text: query,
      query_params: params
    });

    if (error) {
      console.error('SQL Error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

/**
 * Get a pool-like interface (for backward compatibility)
 * @returns {Object} Database pool interface
 */
export const pool = {
  query: async (text, params) => {
    return {
      rows: await query(text, params)
    };
  },
  connect: async () => {
    return {
      query: async (text, params) => {
        return { rows: await query(text, params) };
      },
      release: () => {}
    };
  }
};

export default {
  getSupabase,
  query,
  pool
};
