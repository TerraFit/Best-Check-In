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
      total_rooms, 
      avg_price, 
      slogan,
      welcome_message,
      setup_complete,
      newsletter_enabled,
      newsletter_title,
      newsletter_prize,
      newsletter_cta,
      newsletter_terms,
      newsletter_draw_date,
      newsletter_share_text,
      email,
      phone
    } = JSON.parse(event.body);

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    // Build update object (text fields only - NO images)
    const updateData = {};
    if (total_rooms !== undefined) updateData.total_rooms = total_rooms;
    if (avg_price !== undefined) updateData.avg_price = avg_price;
    if (slogan !== undefined) updateData.slogan = slogan;
    if (welcome_message !== undefined) updateData.welcome_message = welcome_message;
    if (setup_complete !== undefined) updateData.setup_complete = setup_complete;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    
    if (newsletter_enabled !== undefined) updateData.newsletter_enabled = newsletter_enabled;
    if (newsletter_title !== undefined) updateData.newsletter_title = newsletter_title;
    if (newsletter_prize !== undefined) updateData.newsletter_prize = newsletter_prize;
    if (newsletter_cta !== undefined) updateData.newsletter_cta = newsletter_cta;
    if (newsletter_terms !== undefined) updateData.newsletter_terms = newsletter_terms;
    if (newsletter_draw_date !== undefined) updateData.newsletter_draw_date = newsletter_draw_date;
    if (newsletter_share_text !== undefined) updateData.newsletter_share_text = newsletter_share_text;
    
    updateData.updated_at = new Date().toISOString();

    // ✅ CRITICAL FIX: Remove .select().single() - don't return the data
    const { error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', businessId);

    if (error) {
      console.error('Error updating business:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update business profile' })
      };
    }

    // ✅ Return simple success (no large data payload)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Profile updated successfully'
      })
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
