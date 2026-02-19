import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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
    const { conversationId, businessId, senderType, senderId, senderName, message, sendEmail } = JSON.parse(event.body);

    let finalConversationId = conversationId;

    // Create new conversation if needed
    if (!conversationId && businessId) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert([{
          business_id: businessId,
          subject: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          created_by: senderType === 'admin' ? senderId : null
        }])
        .select()
        .single();

      if (convError) throw convError;
      finalConversationId = newConversation.id;
    }

    // Insert message
    const { data: newMessage, error: msgError } = await supabase
      .from('messages')
        .insert([{
        conversation_id: finalConversationId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message: message
      }])
      .select()
      .single();

    if (msgError) throw msgError;

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', finalConversationId);

    // Create notification for recipient
    const recipientType = senderType === 'admin' ? 'business' : 'admin';
    const recipientId = senderType === 'admin' ? businessId : 'ADMIN_ID'; // You'll need to handle this

    await supabase
      .from('notifications')
      .insert([{
        user_type: recipientType,
        user_id: recipientId,
        type: 'message',
        title: `New message from ${senderName}`,
        message: message.substring(0, 100),
        related_id: finalConversationId
      }]);

    // Send email notification if enabled
    if (sendEmail) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Get recipient email based on type
      let recipientEmail;
      if (senderType === 'admin') {
        const { data: business } = await supabase
          .from('businesses')
          .select('email')
          .eq('id', businessId)
          .single();
        recipientEmail = business?.email;
      }

      if (recipientEmail) {
        await resend.emails.send({
          from: 'FastCheckin Messages <messages@fastcheckin.app>',
          to: [recipientEmail],
          subject: `New message from ${senderName}`,
          html: `
            <h3>You have a new message</h3>
            <p><strong>From:</strong> ${senderName}</p>
            <p><strong>Message:</strong> ${message}</p>
            <a href="https://fastcheckin.app/messages/${finalConversationId}">View Message</a>
          `
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        conversationId: finalConversationId,
        message: newMessage
      })
    };

  } catch (error) {
    console.error('🔥 Message error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
