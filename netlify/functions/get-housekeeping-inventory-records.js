import auth from './_auth.cjs';

const { requireBusinessActor, resolveTenant, requireBusinessPermission } = auth;
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
function response(statusCode, payload) { return { statusCode, headers, body: JSON.stringify(payload) }; }
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : null; }

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return response(405, { success: false, error: 'Method Not Allowed' });
  const gate = requireBusinessActor(event);
  if (!gate.ok) return response(gate.status || 401, { success: false, error: gate.error });
  if (!requireBusinessPermission(gate.principal, 'canViewHousekeeping')) {
    return response(403, { success: false, error: 'Missing permission: canViewHousekeeping' });
  }
  const scope = resolveTenant(gate.principal, event.queryStringParameters?.businessId || null);
  if (!scope.ok) return response(scope.status, { success: false, error: scope.error });

  const qs = event.queryStringParameters || {};
  const dateFrom = validDate(qs.dateFrom);
  const dateTo = validDate(qs.dateTo);
  const roomId = qs.roomId ? String(qs.roomId) : null;
  const bookingId = qs.bookingId ? String(qs.bookingId) : null;
  const limit = Math.min(500, Math.max(1, Number.parseInt(qs.limit || '250', 10) || 250));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return response(500, { success: false, error: 'Server configuration error' });
  const read = { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' };
  const q = encodeURIComponent;

  try {
    const filters = [
      'business_id=eq.' + q(scope.businessId),
      'order=created_at.desc',
      'limit=' + limit,
      'select=id,service_session_id,housekeeping_task_id,room_id,booking_id,employee_id,inventory_item_id,item_name_snapshot,category_snapshot,unit_snapshot,quantity_taken,quantity_restocked,unit_price_snapshot,currency,billing_status,external_system,external_item_id,external_reference,client_reference,notes,created_at',
    ];
    if (dateFrom) filters.push('created_at=gte.' + q(dateFrom + 'T00:00:00+02:00'));
    if (dateTo) {
      const next = new Date(dateTo + 'T00:00:00+02:00');
      next.setDate(next.getDate() + 1);
      filters.push('created_at=lt.' + q(next.toISOString()));
    }
    if (roomId) filters.push('room_id=eq.' + q(roomId));
    if (bookingId) filters.push('booking_id=eq.' + q(bookingId));

    const recordsRes = await fetch(url + '/rest/v1/housekeeping_inventory_records?' + filters.join('&'), { headers: read });
    if (!recordsRes.ok) {
      console.error('get-housekeeping-inventory-records failed:', recordsRes.status, await recordsRes.text());
      return response(502, { success: false, error: 'Unable to load inventory records' });
    }
    const records = await recordsRes.json();
    const ids = (field) => [...new Set(records.map((row) => row[field]).filter(Boolean).map(String))];
    const fetchByIds = async (table, select, values) => {
      if (!values.length) return [];
      const query = 'business_id=eq.' + q(scope.businessId) + '&id=in.(' + values.map(q).join(',') + ')&select=' + select;
      const res = await fetch(url + '/rest/v1/' + table + '?' + query, { headers: read });
      if (!res.ok) throw new Error('Unable to load ' + table);
      return res.json();
    };

    const [rooms, bookings, employees] = await Promise.all([
      fetchByIds('rooms', 'id,room_number,room_name', ids('room_id')),
      fetchByIds('bookings', 'id,guest_name,guest_first_name,guest_last_name,check_in_date,check_out_date,room_id,room_number', ids('booking_id')),
      fetchByIds('employees', 'id,full_name', ids('employee_id')),
    ]);
    const roomMap = new Map(rooms.map((row) => [String(row.id), row]));
    const bookingMap = new Map(bookings.map((row) => [String(row.id), row]));
    const employeeMap = new Map(employees.map((row) => [String(row.id), row]));

    const enriched = records.map((row) => {
      const room = roomMap.get(String(row.room_id));
      const booking = bookingMap.get(String(row.booking_id));
      const employee = employeeMap.get(String(row.employee_id));
      const guestName = booking?.guest_name || [booking?.guest_first_name, booking?.guest_last_name].filter(Boolean).join(' ') || null;
      return {
        ...row,
        room_number: room?.room_number ?? booking?.room_number ?? null,
        room_name: room?.room_name || null,
        guest_name: guestName,
        check_in_date: booking?.check_in_date || null,
        check_out_date: booking?.check_out_date || null,
        employee_name: employee?.full_name || null,
        sales_value: Number(row.quantity_taken || 0) * Number(row.unit_price_snapshot || 0),
        stay_day: row.created_at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date(row.created_at)) : null,
      };
    });
    return response(200, { success: true, records: enriched });
  } catch (error) {
    console.error('get-housekeeping-inventory-records fatal:', error?.message || error);
    return response(500, { success: false, error: 'Unable to load inventory records' });
  }
};
