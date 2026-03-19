import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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
    const { token, password } = JSON.parse(event.body);

    if (!token || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token and password required' })
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      };
    }

    // Get the reset token record
    const { data: resetRecord, error: tokenError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .gte('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (tokenError || !resetRecord) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the business password
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ password_hash: hashedPassword })
      .eq('id', resetRecord.business_id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update password' })
      };
    }

    // Mark token as used
    await supabase
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetRecord.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Error in update-password:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
