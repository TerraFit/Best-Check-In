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
      businessId, 
      subject, 
      initialMessage,
      priority = 'normal'
    } = JSON.parse(event.body);

    if (!businessId || !subject) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID and subject required' })
      };
    }

    // Get business details
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('trading_name, email')
      .eq('id', businessId)
      .single();

    if (bizError) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert([{
        business_id: businessId,
        subject,
        priority,
        business_name: business.trading_name,
        business_email: business.email
      }])
      .select()
      .single();

    if (convError) {
      console.error('❌ Error creating conversation:', convError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create conversation' })
      };
    }

    // Add initial message if provided
    if (initialMessage) {
      const { error: msgError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation.id,
          sender_type: 'admin',
          sender_id: '00000000-0000-0000-0000-000000000000', // System admin
          sender_name: 'FastCheckin Support',
          message: initialMessage
        }]);

      if (msgError) {
        console.error('❌ Error adding initial message:', msgError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        conversation,
        message: 'Conversation created successfully'
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
