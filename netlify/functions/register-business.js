import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function handler(event) {
  // Log EVERYTHING at the start
  console.log("🔵 FUNCTION STARTED");
  console.log("🔵 HTTP Method:", event.httpMethod);
  console.log("🔵 Headers:", JSON.stringify(event.headers));
  
  if (event.httpMethod !== 'POST') {
    console.log("🔴 Not a POST request");
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    // Log the raw body
    console.log("🔵 Raw body:", event.body);
    
    const data = JSON.parse(event.body);
    console.log("🔵 Parsed data:", JSON.stringify(data, null, 2));
    
    // Validate required fields
    if (!data.email || !data.password) {
      console.log("🔴 Missing required fields");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Hash password
    console.log("🔵 Hashing password...");
    const hashedPassword = await bcrypt.hash(data.password, 10);
    console.log("🔵 Password hashed successfully");

    // Prepare data for Supabase
    const businessId = uuidv4();
    const dbRecord = {
      id: businessId,
      registered_name: data.registeredName,
      business_number: data.businessNumber,
      trading_name: data.tradingName,
      phone: data.phone,
      physical_address: data.physicalAddress,
      postal_address: data.sameAsPhysical ? data.physicalAddress : data.postalAddress,
      directors: data.directors,
      email: data.email,
      password_hash: hashedPassword,
      subscription_tier: data.subscriptionTier || 'monthly',
      payment_method: data.paymentMethod || 'card',
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    console.log("🔵 Attempting Supabase insert...");
    console.log("🔵 Supabase URL:", process.env.SUPABASE_URL ? "Set" : "MISSING");
    console.log("🔵 Supabase Key:", process.env.SUPABASE_SERVICE_KEY ? "Set" : "MISSING");

    // Save to Supabase
    const { data: business, error: dbError } = await supabase
      .from('businesses')
      .insert([dbRecord])
      .select()
      .single();

    if (dbError) {
      console.log("🔴 Supabase error:", JSON.stringify(dbError));
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Database error', 
          details: dbError.message,
          code: dbError.code
        })
      };
    }

    console.log("✅ Success! Business created:", business.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        businessId: business.id,
        message: 'Registration successful'
      })
    };

  } catch (error) {
    console.log("🔥 Fatal error:", error);
    console.log("🔥 Error stack:", error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Registration failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
}
