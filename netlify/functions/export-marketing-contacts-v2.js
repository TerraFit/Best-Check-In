// netlify/functions/export-marketing-contacts-v2.js
// ✅ With debug logging to verify deployment

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

console.log('🚀 EXPORT FUNCTION VERSION: WS FIX DEPLOYED v2');
console.log('📦 WebSocket type:', typeof WebSocket);
console.log('📦 WebSocket value:', WebSocket ? WebSocket.toString().substring(0, 50) : 'undefined');
console.log('🔧 Node version:', process.version);

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    console.log('🔧 Creating Supabase client with ws transport...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: {
          transport: WebSocket
        }
      }
    );

    console.log('✅ Supabase client created');

    const { businessId, filters, format } = JSON.parse(event.body);

    if (!businessId) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Business ID required' }) 
      };
    }

    // Build the Supabase query
    let query = supabase
      .from('bookings')
      .select('guest_first_name, guest_last_name, guest_email, guest_phone, guest_country, marketing_consent, created_at')
      .eq('business_id', businessId);

    if (filters?.marketingConsent === 'subscribed') {
      query = query.eq('marketing_consent', true);
    } else if (filters?.marketingConsent === 'no_consent') {
      query = query.eq('marketing_consent', false);
    } else if (filters?.marketingConsent !== 'all') {
      query = query.eq('marketing_consent', true);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters?.country) {
      query = query.eq('guest_country', filters.country);
    }

    const { data, error } = await query;

    if (error) throw error;

    const contacts = (data || []).map(row => ({
      firstName: row.guest_first_name || '',
      lastName: row.guest_last_name || '',
      email: row.guest_email || '',
      phone: row.guest_phone || '',
      country: row.guest_country || ''
    }));

    const headersRow = ['First Name', 'Last Name', 'Email', 'Phone', 'Country'];
    const rows = contacts.map(c => [
      `"${c.firstName.replace(/"/g, '""')}"`,
      `"${c.lastName.replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      `"${c.phone.replace(/"/g, '""')}"`,
      `"${c.country.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headersRow.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const filename = `marketing-contacts-${new Date().toISOString().split('T')[0]}.csv`;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: csvContent
    };

  } catch (error) {
    console.error('❌ Export error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Export failed', 
        details: error.message 
      })
    };
  }
};
