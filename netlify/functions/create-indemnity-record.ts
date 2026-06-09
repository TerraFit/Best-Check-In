// netlify/functions/create-indemnity-record.ts - SIMPLIFIED TEST VERSION
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

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('📥 Received request body:', event.body);
    
    const body = JSON.parse(event.body || '{}');
    console.log('📦 Parsed body:', JSON.stringify(body, null, 2));
    
    // Return success for testing (skip actual database insert)
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        access_token: 'test-token-' + Date.now(),
        message: 'Test successful - function is working'
      })
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
