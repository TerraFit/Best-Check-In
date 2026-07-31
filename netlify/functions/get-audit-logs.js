// netlify/functions/get-audit-logs.js
// CJS exports.handler — no local require (esbuild + type:module safe)
// RBAC: canViewAuditLog when JWT is an employee token

function assertPermission(event, permission) {
  const authHeader =
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (!authHeader) {
    return { ok: true, principal: { actorType: 'business', role: 'business_owner', active: true } };
  }
  try {
    const jwt = require('jsonwebtoken');
    const token = authHeader.replace('Bearer ', '').trim();
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    const meta = (decoded && decoded.user_metadata) || {};
    if (decoded.role === 'service_role' || meta.super_admin) {
      return { ok: true, principal: { actorType: 'super_admin', role: 'super_admin', active: true } };
    }
    if (meta.business_id && !meta.employee_id) {
      return { ok: true, principal: { actorType: 'business', role: 'business_owner', active: true } };
    }
    // Employee: business owner defaults are not assumed — need canViewAuditLog
    // Business-owner tokens already returned above. For employees, allow if role is privileged.
    const role = meta.staff_role || meta.role || '';
    const privileged = [
      'business_owner',
      'general_manager',
      'administration',
      'supervisor',
      'night_auditor',
      'super_admin',
    ];
    const perms = Array.isArray(meta.permission_set) ? meta.permission_set : [];
    if (
      privileged.includes(role) ||
      perms.includes(permission) ||
      perms.includes('canViewAuditLog')
    ) {
      return { ok: true, principal: { actorType: 'employee', role, active: true } };
    }
    return {
      ok: false,
      status: 403,
      error: 'Missing permission: ' + permission,
    };
  } catch (e) {
    return { ok: true, principal: { actorType: 'business', role: 'business_owner', active: true } };
  }
}

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const gate = assertPermission(event, 'canViewAuditLog');
  if (!gate.ok) {
    return {
      statusCode: gate.status || 403,
      headers,
      body: JSON.stringify({ error: gate.error }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    const { businessId, limit = 50, offset = 0 } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' }),
      };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/audit_logs?business_id=eq.${encodeURIComponent(businessId)}&select=*&order=created_at.desc&limit=${parseInt(limit)}&offset=${parseInt(offset)}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch audit logs' }),
      };
    }

    const data = await response.json();

    const mappedData = data.map((log) => ({
      id: log.id,
      business_id: log.business_id,
      user_id: log.user_id,
      user_name: log.user_name || 'Unknown User',
      action: log.action,
      details: log.details || {},
      description: log.description || log.action,
      booking_id: log.booking_id,
      guest_name: log.guest_name || log.details?.guest_name || 'Unknown Guest',
      ip_address: log.ip_address || 'unknown',
      user_agent: log.user_agent || 'unknown',
      created_at: log.created_at,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: mappedData,
        total: mappedData.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }),
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch audit logs',
      }),
    };
  }
};
