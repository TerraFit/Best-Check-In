import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { 
      businessId, 
      status = 'active',
      limit = 50 
    } = event.queryStringParameters || {};

    let query = supabase
      .from('conversations')
      .select(`
        *,
        business:businesses (
          trading_name,
          email,
          phone
        ),
        last_message:messages (
          message,
          sender_name,
          created_at
        )
      `)
      .order('last_message_at', { ascending: false })
      .limit(parseInt(limit));

    // Filter by business if specified
    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error('❌ Error fetching conversations:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch conversations' })
      };
    }

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_type', 'admin'); // Count business messages unread by admin

        return {
          ...conv,
          unread_messages: count
        };
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conversations: conversationsWithUnread,
        total: conversationsWithUnread.length
      })
    };

  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
