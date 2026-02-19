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
    const { userType, userId, unreadOnly = false, limit = 20 } = event.queryStringParameters || {};

    if (!userType || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User type and ID required' })
      };
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_type', userType)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', userType)
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        notifications,
        unread_count: count
      })
    };

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
