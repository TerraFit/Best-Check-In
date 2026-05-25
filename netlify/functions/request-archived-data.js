import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { businessId, dateRange, format = 'csv', email } = JSON.parse(event.body);

    if (!businessId || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID and email required' })
      };
    }

    // Verify business ownership
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('trading_name, subscription_tier')
      .eq('id', businessId)
      .single();

    if (bizError || !business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    // Build query for archived data
    let query = supabase
      .from('bookings_archive')
      .select('*')
      .eq('business_id', businessId);

    if (dateRange) {
      const date = new Date();
      switch(dateRange) {
        case '30days':
          date.setDate(date.getDate() - 30);
          break;
        case '90days':
          date.setDate(date.getDate() - 90);
          break;
        case 'year':
          date.setFullYear(date.getFullYear() - 1);
          break;
        case 'all':
          date.setFullYear(date.getFullYear() - 10);
          break;
      }
      query = query.gte('archived_at', date.toISOString());
    }

    const { data: archivedBookings, error: archiveError } = await query
      .order('archived_at', { ascending: false });

    if (archiveError) throw archiveError;

    if (!archivedBookings || archivedBookings.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'No archived data found for the selected period',
          count: 0 
        })
      };
    }

    // Create CSV/Excel export
    let exportData;
    let filename;
    let contentType;

    if (format === 'csv') {
      const headers = [
        'Guest Name', 'Email', 'Phone', 'ID Number', 'Country', 'Province', 
        'City', 'Check-in Date', 'Check-out Date', 'Nights', 'Total Amount', 
        'Status', 'Referral Source', 'Archived Date', 'Archived Reason'
      ];
      
      const rows = archivedBookings.map(b => [
        `"${b.guest_name || ''}"`,
        `"${b.guest_email || ''}"`,
        `"${b.guest_phone || ''}"`,
        `"${b.guest_id_number || ''}"`,
        `"${b.guest_country || ''}"`,
        `"${b.guest_province || ''}"`,
        `"${b.guest_city || ''}"`,
        b.check_in_date || '',
        b.check_out_date || '',
        b.nights || 1,
        b.total_amount || 0,
        b.status || '',
        `"${b.booking_source || b.referral_source || ''}"`,
        b.archived_at ? new Date(b.archived_at).toLocaleDateString() : '',
        `"${b.archived_reason || ''}"`
      ]);
      
      exportData = [headers, ...rows].map(row => row.join(',')).join('\n');
      filename = `${business.trading_name}_archived_data_${new Date().toISOString().split('T')[0]}.csv`;
      contentType = 'text/csv';
    } else {
      // JSON format
      exportData = JSON.stringify(archivedBookings, null, 2);
      filename = `${business.trading_name}_archived_data_${new Date().toISOString().split('T')[0]}.json`;
      contentType = 'application/json';
    }

    // Send email with attachment
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const emailResult = await resend.emails.send({
      from: 'FastCheckin Data <data@fastcheckin.co.za>',
      to: [email],
      subject: `Archived Data Request - ${business.trading_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">📊 Archived Data Export Ready</h2>
          <p>Dear ${business.trading_name},</p>
          <p>Your requested archived data is attached below.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Summary:</strong></p>
            <ul>
              <li>Total Archived Records: ${archivedBookings.length}</li>
              <li>Date Range: ${dateRange || 'All time'}</li>
              <li>Format: ${format.toUpperCase()}</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 12px;">
            Note: This data represents historical check-ins that have been archived 
            to maintain optimal performance. The attachment contains ${archivedBookings.length} records.
          </p>
          
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #9ca3af;">
            FastCheckin - Seamless Check-in, Smarter Stay
          </p>
        </div>
      `,
      attachments: [{
        filename: filename,
        content: Buffer.from(exportData).toString('base64'),
        encoding: 'base64',
        contentType: contentType
      }]
    });

    console.log('✅ Archived data email sent:', emailResult.id);

    // Create request record for audit
    await supabase
      .from('data_export_requests')
      .insert({
        business_id: businessId,
        requested_by: email,
        date_range: dateRange,
        format: format,
        record_count: archivedBookings.length,
        created_at: new Date().toISOString()
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Archived data is being sent to your email',
        record_count: archivedBookings.length
      })
    };

  } catch (error) {
    console.error('Error in request-archived-data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
