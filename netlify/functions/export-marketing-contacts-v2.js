// netlify/functions/export-marketing-contacts-v2.js
// ✅ With enhanced debug logging to diagnose 400 error

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

console.log('🚀 EXPORT FUNCTION VERSION: WS FIX DEPLOYED v3');
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

  // Handle CORS preflight
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
    // ✅ DEBUG: Log the request
    console.log('📥 Request received');
    console.log('📥 Body:', event.body);
    console.log('📥 Content-Type:', event.headers['content-type']);
    console.log('📥 Headers:', JSON.stringify(event.headers, null, 2));

    // Parse the body
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('📥 Parsed body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Invalid JSON body:', event.body);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message,
          received: event.body
        })
      };
    }

    const { businessId, filters, format } = body;

    // Validate businessId
    if (!businessId) {
      console.error('❌ Missing businessId in request');
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ 
          error: 'Business ID required',
          details: 'Please provide a valid businessId in the request body',
          received: body
        }) 
      };
    }

    console.log('✅ businessId found:', businessId);
    console.log('✅ filters:', filters);
    console.log('✅ format:', format);

    // Create Supabase client with ws transport
    console.log('🔧 Creating Supabase client with ws transport...');
    console.log('🔧 SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('🔧 SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);
    
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

    // Build the Supabase query
    console.log('🔍 Building query...');
    let query = supabase
      .from('bookings')
      .select('guest_first_name, guest_last_name, guest_email, guest_phone, guest_country, marketing_consent, created_at')
      .eq('business_id', businessId);

    if (filters?.marketingConsent === 'subscribed') {
      query = query.eq('marketing_consent', true);
      console.log('🔍 Filter: marketing_consent = true');
    } else if (filters?.marketingConsent === 'no_consent') {
      query = query.eq('marketing_consent', false);
      console.log('🔍 Filter: marketing_consent = false');
    } else if (filters?.marketingConsent !== 'all') {
      query = query.eq('marketing_consent', true);
      console.log('🔍 Filter: marketing_consent = true (default)');
    } else {
      console.log('🔍 Filter: all guests (no consent filter)');
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
      console.log('🔍 Filter: created_at >=', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
      console.log('🔍 Filter: created_at <=', filters.dateTo);
    }
    if (filters?.country) {
      query = query.eq('guest_country', filters.country);
      console.log('🔍 Filter: guest_country =', filters.country);
    }

    console.log('🔍 Executing query...');
    const { data, error } = await query;

    if (error) {
      console.error('❌ Query error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('✅ Query successful, found', data?.length || 0, 'records');

    if (!data || data.length === 0) {
      console.log('⚠️ No records found for businessId:', businessId);
      // Return empty CSV instead of error
      const emptyCSV = 'First Name,Last Name,Email,Phone,Country\n';
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="marketing-contacts-empty-${new Date().toISOString().split('T')[0]}.csv"`
        },
        body: emptyCSV
      };
    }

    // Transform data
    console.log('🔄 Transforming data...');
    const contacts = data.map(row => ({
      firstName: row.guest_first_name || '',
      lastName: row.guest_last_name || '',
      email: row.guest_email || '',
      phone: row.guest_phone || '',
      country: row.guest_country || ''
    }));

    // Generate CSV content
    console.log('📄 Generating CSV...');
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

    console.log('✅ Export successful, returning CSV (', contacts.length, 'records,', csvContent.length, 'bytes)');

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
    console.error('❌ Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Export failed', 
        details: error.message,
        stack: error.stack
      })
    };
  }
};
