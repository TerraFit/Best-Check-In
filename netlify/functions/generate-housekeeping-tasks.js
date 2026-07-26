// netlify/functions/generate-housekeeping-tasks.js
// ✅ Generates housekeeping tasks from bookings

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
      `${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=housekeeping_policy,housekeeping_full_service_interval,auto_generate_housekeeping`,
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
    const customInterval = settings.housekeeping_full_service_interval || 3;

    // 2. Get active bookings (checked-in or confirmed)
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
      // Skip if no room number
      if (!booking.room_number) {
        console.log(`⚠️ Booking ${booking.id} has no room number, skipping`);
        continue;
      }

      // Generate tasks for this booking
      const tasks = generateTasksForBooking(booking, policy, customInterval);

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
          // Skip if task already exists
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
          console.log(`✅ Created ${task.taskType} task for room ${booking.room_number} on ${task.scheduled_date}`);
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
function generateTasksForBooking(booking, policy, customInterval) {
  const tasks = [];
  const checkIn = new Date(booking.check_in_date);
  const checkOut = new Date(booking.check_out_date);
  
  // Calculate housekeeping tasks using the same logic as the service
  let current = new Date(checkIn);
  let stayNight = 1;
  const totalNights = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  while (current <= checkOut) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Determine task type
    let taskType = null;
    let isCheckout = current.getTime() === checkOut.getTime();

    // Checkout day
    if (isCheckout) {
      taskType = 'full_service';
    } 
    // Last stay night - no service
    else if (stayNight === totalNights) {
      taskType = null;
    }
    // Daily Full Service
    else if (policy === 'daily_full_service') {
      taskType = 'full_service';
    }
    // Standard or Eco
    else if (policy === 'standard' || policy === 'eco') {
      if (stayNight % 3 === 0) {
        taskType = 'full_service';
      } else {
        taskType = 'refresh';
      }
    }
    // Custom
    else if (policy === 'custom') {
      if (stayNight % customInterval === 0) {
        taskType = 'full_service';
      } else {
        taskType = 'refresh';
      }
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
