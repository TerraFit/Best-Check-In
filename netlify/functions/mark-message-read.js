import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { 
      conversationId, 
      messageIds,
      readerType // 'admin' or 'business'
    } = JSON.parse(event.body);

    if (!conversationId || !readerType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Conversation ID and reader type required' })
      };
    }

    let query = supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('is_read', false);

    // Mark specific messages or all in conversation
    if (messageIds && messageIds.length > 0) {
      query = query.in('id', messageIds);
    }

    // Only mark messages not sent by the reader
    if (readerType === 'admin') {
      query = query.eq('sender_type', 'business');
    } else {
      query = query.eq('sender_type', 'admin');
    }

    const { error: updateError } = await query;

    if (updateError) {
      console.error('❌ Error marking messages as read:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to mark messages as read' })
      };
    }

    // Update unread counts in conversation
    const updateField = readerType === 'admin' 
      ? { unread_count_admin: 0 }
      : { unread_count_business: 0 };

    await supabase
      .from('conversations')
      .update(updateField)
      .eq('id', conversationId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Messages marked as read'
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
