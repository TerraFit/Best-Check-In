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
    // Add directors field - but we'll clean it
    const { data, error } = await supabase
      .from('businesses')
      .select('id, trading_name, registered_name, email, phone, status, directors')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Remove idPhoto from directors to keep size small
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
