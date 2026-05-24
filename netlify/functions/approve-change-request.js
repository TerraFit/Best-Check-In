export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { requestId, action, reason, adminEmail } = JSON.parse(event.body);

    console.log('Processing change request:', { requestId, action, reason, adminEmail });

    if (!requestId || !action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request ID and action are required' })
      };
    }

    if (action !== 'approve' && action !== 'reject') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action must be "approve" or "reject"' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // 1. Get the change request
    const getResponse = await fetch(
      `${supabaseUrl}/rest/v1/change_requests?id=eq.${requestId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const changeRequests = await getResponse.json();
    const changeRequest = changeRequests?.[0];

    if (!changeRequest) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Change request not found' })
      };
    }

    if (changeRequest.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Change request already processed' })
      };
    }

    // 2. Get business details
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${changeRequest.business_id}&select=email,trading_name,physical_address`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const businesses = await businessResponse.json();
    const business = businesses?.[0];

    // 3. Update the change request status
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: adminEmail || 'super-admin',
      reviewed_at: new Date().toISOString()
    };
    
    if (action === 'reject') {
      updateData.rejection_reason = reason;
    }

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/change_requests?id=eq.${requestId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Update error:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update change request' })
      };
    }

    console.log('Change request status updated');

    // 4. If approved, update the business record
    let updateMessage = '';
    if (action === 'approve') {
      const fieldName = changeRequest.field_name;
      const requestedValue = changeRequest.requested_value;
      let updateBusinessData = {};

      switch (fieldName) {
        case 'Trading Name':
          updateBusinessData = { trading_name: requestedValue };
          updateMessage = `Your trading name has been updated to "${requestedValue}".`;
          break;
        case 'Registered Name':
          updateBusinessData = { registered_name: requestedValue };
          updateMessage = `Your registered name has been updated to "${requestedValue}".`;
          break;
        case 'Legal Name':
          updateBusinessData = { legal_name: requestedValue };
          updateMessage = `Your legal name has been updated to "${requestedValue}".`;
          break;
        case 'Location':
          const parts = requestedValue.split(',').map(s => s.trim());
          const city = parts[0] || '';
          const province = parts[1] || '';
          const existingAddress = business?.physical_address || {};
          updateBusinessData = {
            physical_address: {
              street: existingAddress.street || '',
              city: city,
              province: province,
              postalCode: existingAddress.postalCode || '',
              country: existingAddress.country || 'South Africa'
            }
          };
          updateMessage = `Your location has been updated to "${requestedValue}".`;
          break;
        default:
          const dbField = fieldName.toLowerCase().replace(/\s+/g, '_');
          updateBusinessData = { [dbField]: requestedValue };
          updateMessage = `Your ${fieldName} has been updated to "${requestedValue}".`;
      }

      const businessUpdateResponse = await fetch(
        `${supabaseUrl}/rest/v1/businesses?id=eq.${changeRequest.business_id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateBusinessData)
        }
      );

      if (!businessUpdateResponse.ok) {
        console.error('Failed to update business');
      } else {
        console.log('Business updated successfully');
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Change request ${action}d successfully`
      })
    };

  } catch (error) {
    console.error('Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
