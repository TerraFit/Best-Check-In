import auth from './_auth.cjs';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);
  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) return authFailure({ status: 403, error: 'Forbidden' }, headers);
  } else if (!requireBusinessPermission(principal, 'canViewGuestDetails')) {
    return authFailure({ status: 403, error: 'Forbidden' }, headers);
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const { businessId: requestedBusinessId, dateRange, format = 'csv', email } = body;
  if (!requestedBusinessId || !email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID and email required' }) };
  }
  if (!['csv', 'json'].includes(format)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid export format' }) };
  }

  const tenant = resolveTenant(principal, requestedBusinessId);
  if (!tenant.ok) return authFailure(tenant, headers);
  const businessId = tenant.businessId;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { realtime: { enabled: false } });

  try {
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('trading_name, subscription_tier')
      .eq('id', businessId)
      .single();
    if (bizError || !business) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };

    let query = supabase.from('bookings_archive').select('*').eq('business_id', businessId);
    if (dateRange) {
      const date = new Date();
      switch (dateRange) {
        case '30days': date.setDate(date.getDate() - 30); break;
        case '90days': date.setDate(date.getDate() - 90); break;
        case 'year': date.setFullYear(date.getFullYear() - 1); break;
        case 'all': date.setFullYear(date.getFullYear() - 10); break;
        default: return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid date range' }) };
      }
      query = query.gte('archived_at', date.toISOString());
    }

    const { data: archivedBookings, error: archiveError } = await query.order('archived_at', { ascending: false });
    if (archiveError) throw archiveError;
    if (!archivedBookings || archivedBookings.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'No archived data found for the selected period', count: 0 }) };
    }

    let exportData;
    let filename;
    let contentType;
    if (format === 'csv') {
      const columns = ['Guest Name','Email','Phone','ID Number','Country','Province','City','Check-in Date','Check-out Date','Nights','Total Amount','Status','Referral Source','Archived Date','Archived Reason'];
      const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const rows = archivedBookings.map(b => [
        quote(b.guest_name), quote(b.guest_email), quote(b.guest_phone), quote(b.guest_id_number), quote(b.guest_country),
        quote(b.guest_province), quote(b.guest_city), b.check_in_date || '', b.check_out_date || '', b.nights || 1,
        b.total_amount || 0, quote(b.status), quote(b.booking_source || b.referral_source || ''),
        b.archived_at ? new Date(b.archived_at).toLocaleDateString() : '', quote(b.archived_reason)
      ]);
      exportData = [columns.join(','), ...rows.map(row => row.join(','))].join('\n');
      filename = `${business.trading_name}_archived_data_${new Date().toISOString().split('T')[0]}.csv`;
      contentType = 'text/csv';
    } else {
      exportData = JSON.stringify(archivedBookings, null, 2);
      filename = `${business.trading_name}_archived_data_${new Date().toISOString().split('T')[0]}.json`;
      contentType = 'application/json';
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailResult = await resend.emails.send({
      from: 'Fastcheckin Data <data@fastcheckin.co.za>',
      to: [String(email).trim()],
      subject: `Archived Data Request - ${business.trading_name}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#f59e0b">Archived Data Export Ready</h2><p>Dear ${String(business.trading_name || 'Business').replace(/[<>]/g, '')},</p><p>Your requested archived data is attached.</p><p>Total records: ${archivedBookings.length}</p></div>`,
      attachments: [{ filename, content: Buffer.from(exportData).toString('base64'), encoding: 'base64', contentType }]
    });
    console.log('Archived data email sent:', emailResult.id);

    await supabase.from('data_export_requests').insert({
      business_id: businessId,
      requested_by: principal.email || String(email).trim(),
      date_range: dateRange,
      format,
      record_count: archivedBookings.length,
      created_at: new Date().toISOString()
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Archived data is being sent to your email', record_count: archivedBookings.length }) };
  } catch (error) {
    console.error('Error in request-archived-data:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to create archived data export' }) };
  }
};
