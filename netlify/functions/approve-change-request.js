const superAdminAuth = require('./_superAdminAuth.cjs');
const { requireSuperAdmin, authFailure } = superAdminAuth;

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = requireSuperAdmin(event);
  if (!auth.ok) return authFailure(auth, headers);

  try {
    const { requestId, action, reason } = JSON.parse(event.body || '{}');
    if (!requestId || !action) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Request ID and action are required' }) };
    if (!['approve', 'reject'].includes(action)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Action must be "approve" or "reject"' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };

    const authHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
    const getResponse = await fetch(`${supabaseUrl}/rest/v1/change_requests?id=eq.${encodeURIComponent(requestId)}&select=*`, { headers: authHeaders });
    if (!getResponse.ok) throw new Error(`Failed to load change request: HTTP ${getResponse.status}`);
    const changeRequests = await getResponse.json();
    const changeRequest = changeRequests?.[0];
    if (!changeRequest) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Change request not found' }) };
    if (changeRequest.status !== 'pending') return { statusCode: 400, headers, body: JSON.stringify({ error: 'Change request already processed' }) };

    if (action === 'approve') {
      const fieldName = String(changeRequest.field_name || '').trim();
      const requestedValue = changeRequest.requested_value;
      let updateBusinessData = {};
      switch (fieldName.toLowerCase()) {
        case 'trading name': updateBusinessData = { trading_name: requestedValue }; break;
        case 'registered name': updateBusinessData = { registered_name: requestedValue }; break;
        case 'legal name': updateBusinessData = { legal_name: requestedValue }; break;
        case 'slogan': updateBusinessData = { slogan: requestedValue }; break;
        case 'location': {
          const parts = String(requestedValue || '').split(',').map(s => s.trim());
          const businessResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(changeRequest.business_id)}&select=physical_address`, { headers: authHeaders });
          if (!businessResponse.ok) throw new Error(`Failed to load business address: HTTP ${businessResponse.status}`);
          const businesses = await businessResponse.json();
          const existingAddress = businesses?.[0]?.physical_address || {};
          updateBusinessData = { physical_address: { street: existingAddress.street || '', city: parts[0] || '', province: parts[1] || '', postalCode: existingAddress.postalCode || '', country: existingAddress.country || 'South Africa' } };
          break;
        }
        case 'directors': {
          let directors;
          try { directors = typeof requestedValue === 'string' ? JSON.parse(requestedValue) : requestedValue; } catch { directors = null; }
          if (!Array.isArray(directors)) {
            const name = String(requestedValue || '').trim();
            directors = name ? [{ name }] : [];
          }
          updateBusinessData = { directors };
          break;
        }
        default: {
          const fieldMap = { email:'email', 'secondary email':'secondary_email', phone:'phone', 'mobile phone':'mobile_phone', 'secondary phone':'secondary_phone', website:'website', 'postal address':'postal_address' };
          const dbField = fieldMap[fieldName.toLowerCase()] || fieldName.toLowerCase().replace(/\s+/g, '_');
          updateBusinessData = { [dbField]: requestedValue };
        }
      }

      const businessUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(changeRequest.business_id)}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(updateBusinessData)
      });
      if (!businessUpdateResponse.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Approved change could not be applied to the business profile' }) };
      const updatedBusinesses = await businessUpdateResponse.json();
      if (!Array.isArray(updatedBusinesses) || updatedBusinesses.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found while applying approved change' }) };
    }

    const updateData = { status: action === 'approve' ? 'approved' : 'rejected', reviewed_by: auth.principal.email || 'super-admin', reviewed_at: new Date().toISOString() };
    if (action === 'reject') updateData.rejection_reason = reason || null;
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/change_requests?id=eq.${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(updateData)
    });
    if (!updateResponse.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update change request status' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: `Change request ${action}d successfully` }) };
  } catch (error) {
    console.error('Unhandled error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
