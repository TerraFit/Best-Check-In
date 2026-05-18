import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
);

export const handler = async function(event) {
  // Only allow POST with admin key for security
  const adminKey = event.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_MIGRATION_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    // Get all businesses with base64 images
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, trading_name, hero_image_url, logo_url')
      .or('hero_image_url.like.data:image%,logo_url.like.data:image%');

    if (error) throw error;

    const results = [];

    for (const business of businesses) {
      const updates = {};
      
      // Migrate hero_image
      if (business.hero_image_url?.startsWith('data:image')) {
        const heroUrl = await uploadBase64ToStorage(
          business.id,
          'hero',
          business.hero_image_url
        );
        if (heroUrl) updates.hero_image_url = heroUrl;
      }
      
      // Migrate logo
      if (business.logo_url?.startsWith('data:image')) {
        const logoUrl = await uploadBase64ToStorage(
          business.id,
          'logo',
          business.logo_url
        );
        if (logoUrl) updates.logo_url = logoUrl;
      }
      
      // Update business with new URLs
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('businesses')
          .update(updates)
          .eq('id', business.id);
          
        results.push({
          business: business.trading_name,
          success: !updateError,
          error: updateError?.message,
          updates
        });
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, results })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function uploadBase64ToStorage(businessId, type, base64String) {
  try {
    // Extract mime type and data
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches) return null;
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Determine file extension
    const ext = mimeType.split('/')[1];
    const fileName = `${businessId}/${type}.${ext}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('business-images')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      });
      
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('business-images')
      .getPublicUrl(fileName);
      
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading ${type} for ${businessId}:`, error);
    return null;
  }
}
