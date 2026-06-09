// netlify/functions/create-indemnity-record.ts
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    console.log('✅ create-indemnity-record called for booking:', body.booking_id);
    
    // Generate a test token
    const accessToken = `test-token-${body.booking_id}-${Date.now()}`;
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        access_token: accessToken,
        message: 'Indemnity recorded (test mode - no database yet)'
      })
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ error: 'Internal error' })
    };
  }
};
