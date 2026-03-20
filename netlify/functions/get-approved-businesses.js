import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, registered_name, trading_name, business_number, phone, email, physical_address, postal_address, subscription_tier, payment_method, status, total_rooms, avg_price, seasons, setup_complete, approved_at, created_at, last_payment_date, payment_due_date, payment_status, payment_reminder_sent, payment_reminder_count, deleted_at, directors')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Remove idPhoto from directors to reduce size
    const cleanedData = data?.map(business => ({
      ...business,
      directors: business.directors?.map(({ idPhoto, ...director }) => director) || []
    })) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(cleanedData || [])
    };
  } catch (error) {
    console.error('Error in get-approved-businesses:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
