import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { supabaseFetch, supabaseInsert, createHandlerResponse, errorResponse } from './lib/supabase-rest.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return createHandlerResponse(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return createHandlerResponse(405, errorResponse('Method not allowed'));
  }

  try {
    const { business } = JSON.parse(event.body || '{}');
    
    if (!business?.email) {
      return createHandlerResponse(400, errorResponse('Email is required'));
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // Check existing
    const existing = await supabaseFetch(`businesses?email=eq.${encodeURIComponent(business.email)}`);
    if (existing?.length > 0) {
      return createHandlerResponse(400, errorResponse('Email already registered'));
    }

    const businessId = uuidv4();
    const setupToken = uuidv4();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 48);

    // Create business record
    const businessData = {
      id: businessId,
      business_number: `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      registered_name: business.legal_name || business.trading_name,
      legal_name: business.legal_name,
      trading_name: business.trading_name,
      registration_number: business.registration_number || '',
      vat_number: business.vat_number || '',
      establishment_type: business.establishment_type || '',
      tgsa_grading: business.tgsa_grading || 'NA',
      email: business.email,
      phone: business.mobile_phone,
      fixed_phone: business.fixed_phone || '',
      website: business.website || '',
      physical_address: business.physical_address || {
        street: business.physicalStreet || '',
        city: business.physicalCity || '',
        province: business.physicalProvince || '',
        country: business.physicalCountry || 'South Africa',
        postalCode: business.physicalPostalCode || ''
      },
      postal_address: business.postal_address || null,
      directors: business.director ? [{
        name: `${business.director.name || ''} ${business.director.surname || ''}`.trim(),
        id_number: business.director.id_number || '',
        id_photo_url: business.director.id_photo || '',
        email: business.director.email || business.email,
        phone: business.director.mobile_phone || business.mobile_phone
      }] : [],
      total_rooms: business.total_rooms || 0,
      avg_price: 0,
      subscription_tier: business.plan || 'starter',
      current_plan: business.plan || 'starter',
      max_rooms: business.max_rooms || 10,
      billing_cycle: business.billing_cycle || 'monthly',
      payment_method: 'pending',
      payment_status: 'pending',
      status: 'pending',
      password_hash: null,
      trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabaseInsert('businesses', businessData);

    // Save setup token
    await supabaseInsert('setup_tokens', [{
      token: setupToken,
      business_id: businessId,
      email: business.email,
      expires_at: tokenExpiry.toISOString()
    }]);

    // Send email
    const setupLink = `https://fastcheckin.co.za/set-password/${setupToken}`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'FastCheckin <noreply@fastcheckin.co.za>',
      to: [business.email],
      subject: `Complete Your FastCheckin Registration - ${business.trading_name}`,
      html: generateRegistrationEmail(business.trading_name, setupLink)
    });

    return createHandlerResponse(200, {
      success: true,
      businessId,
      message: 'Registration submitted successfully. Please check your email to complete setup.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return createHandlerResponse(500, errorResponse(error.message));
  }
};

function generateRegistrationEmail(businessName, setupLink) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #f59e0b;">FastCheckin</h1>
      <p>Dear ${businessName},</p>
      <p>Thank you for registering with FastCheckin. Your application has been received and is pending approval.</p>
      <p>Once your account is approved, you will need to set up your password using the link below:</p>
      <a href="${setupLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Complete Registration</a>
      <p>This link expires in 48 hours.</p>
    </div>
  `;
}
