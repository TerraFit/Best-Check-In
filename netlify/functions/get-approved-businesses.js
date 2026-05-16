import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import ws from 'ws';

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
    process.env.SUPABASE_SERVICE_KEY,
    {
      realtime: { ws: ws },
      auth: { persistSession: false }
    }
  );

  try {
    const { businessId } = JSON.parse(event.body);

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching business:', fetchError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error fetching business details' })
      };
    }

    const verificationToken = uuidv4();
    const verificationLink = `https://fastcheckin.co.za/verify-email/${verificationToken}`;

    const { error: tokenError } = await supabase
      .from('email_verifications')
      .insert([
