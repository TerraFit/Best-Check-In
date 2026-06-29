// netlify/functions/export-marketing-contacts.js
import { createClient } from '@supabase/supabase-js';

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { businessId, filters, format } = JSON.parse(event.body);

    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
    }

    // Build query
    let query = supabase
      .from('bookings')
      .select('guest_first_name, guest_last_name, guest_email, guest_phone, guest_country, marketing_consent, marketing_email_confirmed, marketing_unsubscribed_at, created_at')
      .eq('business_id', businessId)
      .eq('marketing_consent', true);

    // Apply filters
    if (filters?.marketingConsent === 'subscribed') {
      query = query.eq('marketing_email_confirmed', true).is('marketing_unsubscribed_at', null);
    } else if (filters?.marketingConsent === 'consent_given') {
      query = query.eq('marketing_email_confirmed', false);
    } else if (filters?.marketingConsent === 'unsubscribed') {
      query = query.not('marketing_unsubscribed_at', 'is', null);
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

    // Transform data
    const contacts = data.map(row => ({
      firstName: row.guest_first_name || '',
      lastName: row.guest_last_name || '',
      email: row.guest_email || '',
      phone: row.guest_phone || '',
      country: row.guest_country || ''
    }));

    // Generate CSV or XLSX
    let contentType;
    let fileData;
    let filename;

    if (format === 'csv') {
      contentType = 'text/csv';
      const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Country'];
      const rows = contacts.map(c => [
        `"${c.firstName}"`,
        `"${c.lastName}"`,
        `"${c.email}"`,
        `"${c.phone}"`,
        `"${c.country}"`
      ]);
      fileData = [headers, ...rows].map(row => row.join(',')).join('\n');
      filename = `marketing-contacts-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // XLSX format - using simple CSV for now, but you can add xlsx library
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      // Simple fallback to CSV if xlsx not installed
      const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Country'];
      const rows = contacts.map(c => [
        `"${c.firstName}"`,
        `"${c.lastName}"`,
        `"${c.email}"`,
        `"${c.phone}"`,
        `"${c.country}"`
      ]);
      fileData = [headers, ...rows].map(row => row.join(',')).join('\n');
      filename = `marketing-contacts-${new Date().toISOString().split('T')[0]}.csv`;
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: fileData
    };

  } catch (error) {
    console.error('Export error:', error);
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
