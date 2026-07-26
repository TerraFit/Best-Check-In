// netlify/functions/manage-rooms.js
// ✅ CRUD operations for rooms

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    try {
        // GET rooms
        if (event.httpMethod === 'GET') {
            const { businessId } = event.queryStringParameters || {};
            if (!businessId) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
            }

            const response = await fetch(
                `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&order=room_number.asc`,
                {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                }
            );
            const data = await response.json();
            return { statusCode: 200, headers, body: JSON.stringify(data) };
        }

        // POST - Create room
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { businessId, room_number, room_name, room_type } = body;

            const response = await fetch(`${supabaseUrl}/rest/v1/rooms`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify([{
                    business_id: businessId,
                    room_number,
                    room_name,
                    room_type: room_type || 'Standard',
                    status: 'active'
                }])
            });

            const data = await response.json();
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data[0] }) };
        }

        // PUT - Update room
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            const { roomId, room_number, room_name, room_type, status } = body;

            const response = await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${roomId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ room_number, room_name, room_type, status, updated_at: new Date().toISOString() })
            });

            const data = await response.json();
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data[0] }) };
        }

        // DELETE - Remove room
        if (event.httpMethod === 'DELETE') {
            const body = JSON.parse(event.body);
            const { roomId } = body;

            await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${roomId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });

            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
