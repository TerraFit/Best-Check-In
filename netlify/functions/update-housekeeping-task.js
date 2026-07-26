// netlify/functions/update-housekeeping-task.js
// ✅ Updates housekeeping task status

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
    const { taskId, status, completedBy, completedByName, notes } = JSON.parse(event.body);

    if (!taskId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Task ID required' })
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

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = completedBy;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${taskId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Update error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update task' })
      };
    }

    const data = await response.json();
    const updated = data[0];

    // Create audit log
    try {
      const authHeader = event.headers.authorization || '';
      const auditLog = {
        business_id: updated.business_id,
        user_id: completedBy || 'system',
        user_name: completedByName || 'System',
        user_role: 'staff',
        action: 'HOUSEKEEPING_TASK_COMPLETED',
        details: {
          task_id: taskId,
          room_number: updated.room_number,
          task_type: updated.task_type,
          status: status
        },
        description: `Housekeeping task ${status} for room ${updated.room_number}`,
        booking_id: updated.booking_id,
        guest_name: updated.guest_name,
        ip_address: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown',
        user_agent: event.headers['user-agent'] || 'unknown',
        created_at: new Date().toISOString()
      };

      await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([auditLog])
      });
    } catch (auditError) {
      console.warn('Audit log error (non-critical):', auditError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: updated,
        message: `Task ${status} successfully`
      })
    };

  } catch (error) {
    console.error('Error updating task:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to update task'
      })
    };
  }
};
