import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  // Only allow scheduled runs or admin triggers
  const isScheduled = event.headers['x-nf-schedule'] === 'true';
  const adminKey = event.headers['x-admin-key'];
  
  if (!isScheduled && adminKey !== process.env.ADMIN_MIGRATION_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const results = {
    processed: 0,
    archived: 0,
    errors: [],
    businesses: []
  };

  try {
    // Get all active businesses
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('id, trading_name, subscription_tier, max_active_bookings, archive_after_days, auto_archive_enabled')
      .eq('status', 'approved')
      .eq('auto_archive_enabled', true);

    if (bizError) throw bizError;

    for (const business of businesses) {
      try {
        // Get current booking count
        const { count: currentCount, error: countError } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id);

        if (countError) throw countError;

        // Check if over limit
        const isOverLimit = currentCount > business.max_active_bookings;
        
        // Get cutoff date for age-based archiving
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - business.archive_after_days);
        const cutoffDateStr = cutoffDate.toISOString();

        // Archive old bookings first (age-based)
        const { data: oldBookings, error: oldError } = await supabase
          .from('bookings')
          .select('*')
          .eq('business_id', business.id)
          .lt('created_at', cutoffDateStr)
          .order('created_at', { ascending: true })
          .limit(isOverLimit ? 500 : 100); // Archive more aggressively if over limit

        if (oldError) throw oldError;

        let archivedCount = 0;

        // Archive age-based bookings
        if (oldBookings && oldBookings.length > 0) {
          const { error: insertError } = await supabase
            .from('bookings_archive')
            .insert(oldBookings.map(b => ({
              ...b,
              archived_at: new Date().toISOString(),
              archived_reason: `Age exceeded ${business.archive_after_days} days`
            })));

          if (insertError) throw insertError;

          const { error: deleteError } = await supabase
            .from('bookings')
            .delete()
            .in('id', oldBookings.map(b => b.id));

          if (deleteError) throw deleteError;
          
          archivedCount += oldBookings.length;
        }

        // If still over limit, archive oldest bookings (by date)
        if (isOverLimit) {
          const excessToArchive = currentCount - business.max_active_bookings + (oldBookings?.length || 0);
          
          if (excessToArchive > 0) {
            const { data: excessBookings, error: excessError } = await supabase
              .from('bookings')
              .select('*')
              .eq('business_id', business.id)
              .order('created_at', { ascending: true })
              .limit(Math.min(excessToArchive, 1000));

            if (excessError) throw excessError;

            if (excessBookings && excessBookings.length > 0) {
              const { error: insertError } = await supabase
                .from('bookings_archive')
                .insert(excessBookings.map(b => ({
                  ...b,
                  archived_at: new Date().toISOString(),
                  archived_reason: `Exceeded tier limit of ${business.max_active_bookings} active bookings`
                })));

              if (insertError) throw insertError;

              const { error: deleteError } = await supabase
                .from('bookings')
                .delete()
                .in('id', excessBookings.map(b => b.id));

              if (deleteError) throw deleteError;
              
              archivedCount += excessBookings.length;
            }
          }
        }

        results.businesses.push({
          name: business.trading_name,
          tier: business.subscription_tier,
          limit: business.max_active_bookings,
          archived: archivedCount,
          remaining: currentCount - archivedCount
        });
        
        results.archived += archivedCount;

      } catch (err) {
        results.errors.push({ business: business.id, error: err.message });
        console.error(`Error processing ${business.id}:`, err.message);
      }
      
      results.processed++;
    }

    console.log('✅ Archive complete:', results);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('❌ Archive failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
