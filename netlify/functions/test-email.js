import { Resend } from 'resend';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { email } = JSON.parse(event.body);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'FastCheckin <onboarding@resend.dev>', // Use Resend's test domain first
      to: [email],
      subject: 'Test Email from FastCheckin',
      html: '<p>Your Resend integration is working! 🎉</p>'
    });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, messageId: data.id })
    };
  } catch (error) {
    console.error('Email error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
