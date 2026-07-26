// netlify/functions/generate-housekeeping-tasks.js
// ✅ FIXED: Properly handles bookings with room numbers

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  try {
    const { businessId, forceRegenerate = false } = JSON.parse(event.body);

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // 1. Get business settings
    const settingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=housekeeping_policy,housekeeping_full_service_frequency,housekeeping_first_full_service_day,housekeeping_min_nights_before_full_service,auto_generate_housekeeping`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const settingsData = await settingsResponse.json();
    const settings = settingsData[0];

    if (!settings) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    if (!settings.auto_generate_housekeeping) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Auto-generation is disabled for this business',
          tasksCreated: 0
        })
      };
    }

    const policy = settings.housekeeping_policy || 'standard';
    const fullServiceFrequency = settings.housekeeping_full_service_frequency || 3;
    const firstFullServiceDay = settings.housekeeping_first_full_service_day || 3;
    const minNightsBeforeFullService = settings.housekeeping_min_nights_before_full_service || 3;

    // 2. Get active bookings with room numbers
    const today = new Date().toISOString().split('T')[0];
    
    const bookingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?business_id=eq.${businessId}&status=in.(${encodeURIComponent('checked_in,confirmed')})&check_out_date=gte.${today}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const bookings = await bookingsResponse.json();
    console.log(`📊 Found ${bookings.length} active bookings`);

    let tasksCreated = 0;
    let tasksSkipped = 0;

    for (const booking of bookings) {
      // ✅ Skip if no room number
      if (!booking.room_number) {
        console.log(`⚠️ Booking ${booking.id} has no room number, skipping`);
        continue;
      }

      // Generate tasks for this booking
      const tasks = generateTasksForBooking(booking, policy, fullServiceFrequency, firstFullServiceDay, minNightsBeforeFullService);

      console.log(`📋 Booking ${booking.id} (${booking.guest_name}, Room ${booking.room_number}): ${tasks.length} tasks`);

      for (const task of tasks) {
        // Check if task already exists
        const existingResponse = await fetch(
          `${supabaseUrl}/rest/v1/housekeeping_tasks?booking_id=eq.${booking.id}&scheduled_date=eq.${task.scheduled_date}&task_type=eq.${task.taskType}`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        );

        const existing = await existingResponse.json();

        if (existing && existing.length > 0) {
          tasksSkipped++;
          continue;
        }

        // Create task
        const taskData = {
          business_id: businessId,
          booking_id: booking.id,
          room_number: booking.room_number,
          guest_name: booking.guest_name || 'Guest',
          task_type: task.taskType,
          scheduled_date: task.scheduled_date,
          stay_night: task.stayNight,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log(`✅ Creating ${task.taskType} task for room ${booking.room_number} on ${task.scheduled_date}`);

        const createResponse = await fetch(
          `${supabaseUrl}/rest/v1/housekeeping_tasks`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify([taskData])
          }
        );

        if (createResponse.ok) {
          tasksCreated++;
        } else {
          const errorText = await createResponse.text();
          console.error(`❌ Failed to create task: ${errorText}`);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Generated ${tasksCreated} tasks (${tasksSkipped} skipped)`,
        tasksCreated,
        tasksSkipped,
        bookingsProcessed: bookings.length
      })
    };

  } catch (error) {
    console.error('❌ Error generating tasks:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate tasks'
      })
    };
  }
};

// Helper: Generate tasks for a single booking
function generateTasksForBooking(booking, policy, fullServiceFrequency, firstFullServiceDay, minNightsBeforeFullService) {
  const tasks = [];
  const checkIn = new Date(booking.check_in_date);
  const checkOut = new Date(booking.check_out_date);
  
  // Calculate total nights
  const totalNights = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  console.log(`📊 ${booking.guest_name}: ${totalNights} nights`);

  // If total nights is 1, only generate checkout task
  if (totalNights <= 1) {
    tasks.push({
      taskType: 'full_service',
      scheduled_date: checkOut.toISOString().split('T')[0],
      stayNight: 1
    });
    return tasks;
  }

  // Calculate Full Service nights based on the same logic
  const fullServiceNights = [];
  
  // First Full Service
  if (firstFullServiceDay <= totalNights) {
    fullServiceNights.push(firstFullServiceDay);
  }
  
  // Subsequent Full Services
  let nextService = firstFullServiceDay + fullServiceFrequency;
  while (nextService < totalNights) {
    fullServiceNights.push(nextService);
    nextService += fullServiceFrequency;
  }

  console.log(`📋 Full service nights for ${booking.guest_name}:`, fullServiceNights);

  // Generate tasks for each night
  let current = new Date(checkIn);
  let stayNight = 1;

  while (current < checkOut) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Check if this is the checkout day
    const isCheckout = current.getTime() === checkOut.getTime();
    
    // Determine task type
    let taskType = null;

    // Checkout day - always Full Service
    if (isCheckout) {
      taskType = 'full_service';
    } 
    // Check if this night is a Full Service night (and not the last night)
    else if (fullServiceNights.includes(stayNight) && stayNight < totalNights) {
      taskType = 'full_service';
    } 
    // Refresh on other nights
    else if (stayNight < totalNights) {
      taskType = 'refresh';
    }

    if (taskType) {
      tasks.push({
        taskType,
        scheduled_date: dateStr,
        stayNight
      });
    }

    current.setDate(current.getDate() + 1);
    stayNight++;
  }

  return tasks;
}
