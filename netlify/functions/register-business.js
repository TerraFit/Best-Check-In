// netlify/functions/register-business.js

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { business } = JSON.parse(event.body || '{}');
    
    console.log('📝 Registration received:', { 
      email: business?.email,
      businessName: business?.trading_name
    });

    if (!business || !business.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check if business already exists
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('email', business.email)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email already registered' })
      };
    }

    // Generate business ID and setup token
    const businessId = uuidv4();
    const setupToken = uuidv4();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 48);

    // Create physical_address and postal_address as JSON objects
    const physicalAddress = business.physical_address || {
      street: '',
      city: '',
      province: '',
      country: 'South Africa',
      postalCode: ''
    };

    const postalAddress = business.postal_address || physicalAddress;

    // Directors array
    const directors = business.director ? [{
      name: `${business.director.name || ''} ${business.director.surname || ''}`.trim(),
      id_number: business.director.id_number || '',
      id_photo_url: business.director.id_photo || '',
      email: business.director.email || business.email,
      phone: business.director.mobile_phone || business.mobile_phone,
      address: business.director.address || null
    }] : [];

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    // Create business record with ALL required columns
    const businessData = {
      id: businessId,
      business_number: `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      registered_name: business.legal_name || business.trading_name,
      legal_name: business.legal_name,
      trading_name: business.trading_name,
      registration_number: business.registration_number || null,
      vat_number: business.vat_number || null,
      establishment_type: business.establishment_type || null,
      tgsa_grading: business.tgsa_grading || 'NA',
      email: business.email,
      phone: business.mobile_phone,
      fixed_phone: business.fixed_phone || null,
      website: business.website || null,
      physical_address: physicalAddress,
      postal_address: postalAddress,
      directors: directors,
      total_rooms: business.total_rooms || 0,
      avg_price: null,
      subscription_tier: business.plan || 'starter',
      current_plan: business.plan || 'starter',
      max_rooms: business.max_rooms || 10,
      billing_cycle: business.billing_cycle || 'monthly',
      status: 'pending_setup',
      payment_status: 'pending',
      password_hash: null,  // ← NULL - user will set via email link
      trial_end: trialEnd.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Inserting business record with ID:', businessId);

    const { error: businessError } = await supabase
      .from('businesses')
      .insert(businessData);

    if (businessError) {
      console.error('❌ Business insert error:', businessError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create business record: ' + businessError.message })
      };
    }

    // Save setup token
    const { error: tokenError } = await supabase
      .from('setup_tokens')
      .insert({
        token: setupToken,
        business_id: businessId,
        email: business.email,
        expires_at: tokenExpiry.toISOString()
      });

    if (tokenError) {
      console.error('❌ Token insert error:', tokenError);
    }

    // Send setup email
    const setupLink = `https://fastcheckin.co.za/set-password/${setupToken}`;
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      await resend.emails.send({
        from: 'FastCheckin <noreply@fastcheckin.co.za>',
        to: [business.email],
        subject: `Complete Your FastCheckin Registration - ${business.trading_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fastcheckin.co.za/fastcheckin-logo.png" alt="FastCheckin" style="height: 50px;">
              <h1 style="color: #f59e0b; margin: 20px 0 0;">Welcome to FastCheckin!</h1>
            </div>
            
            <p>Dear ${business.trading_name},</p>
            
            <p>Thank you for registering with FastCheckin. Your application has been received and is pending approval.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Registration Summary:</strong></p>
              <p>Business: ${business.trading_name}</p>
              <p>Legal Name: ${business.legal_name || business.trading_name}</p>
              <p>Type: ${business.establishment_type || 'Not specified'}</p>
              <p>Plan: ${business.plan || 'Starter'}</p>
              <p>Rooms: ${business.total_rooms || 0}</p>
              <p>Trial Period: 14 days</p>
            </div>
            
            <p>Once your account is approved, you will need to set up your password using the link below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${setupLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Complete Registration
              </a>
            </div>
            
            <p style="font-size: 12px; color: #6b7280;">
              This link expires in 48 hours. You will receive a separate email once your account is approved.
            </p>
            
            <hr style="margin: 30px 0; border-color: #e5e7eb;">
            
            <p style="font-size: 12px; color: #6b7280; text-align: center;">
              FastCheckin - Seamless Check-in, Smarter Stay<br>
              <a href="https://fastcheckin.co.za" style="color: #f59e0b;">www.fastcheckin.co.za</a>
            </p>
          </div>
        `
      });
      console.log('✅ Setup email sent to:', business.email);
    } catch (emailError) {
      console.error('❌ Email error:', emailError);
    }

    console.log('✅ Business registered successfully:', businessId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        businessId: businessId,
        message: 'Registration submitted successfully. Please check your email to complete setup.'
      })
    };

  } catch (error) {
    console.error('❌ Registration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
