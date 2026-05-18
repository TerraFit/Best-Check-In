import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getSupabase = () => {
    // CRITICAL FIX: Remove ALL options - just URL and key
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    return createClient(
        process.env.SUPABASE_URL,
        supabaseKey
        // NO options object at all! Not even { auth: { persistSession: false } }
    );
};

const verifyAuth = (authHeader) => {
    if (!authHeader) {
        throw new Error('UNAUTHORIZED: No authorization token provided');
    }
    
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader.split(' ')[1];
    
    if (!token) {
        throw new Error('UNAUTHORIZED: Invalid token format');
    }

    try {
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        if (!decoded.user_metadata?.business_id) {
            throw new Error('FORBIDDEN: Token missing business ID');
        }
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('UNAUTHORIZED: Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('UNAUTHORIZED: Invalid token signature');
        }
        throw new Error(`UNAUTHORIZED: ${error.message}`);
    }
};

const createResponse = (statusCode, body, headers = {}) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            ...headers
        },
        body: JSON.stringify(body)
    };
};

// ============================================================
// MAIN HANDLER
// ============================================================

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(204, {});
    }

    if (event.httpMethod !== 'GET') {
        return createResponse(405, { error: 'Method Not Allowed' });
    }

    try {
        const auth = verifyAuth(event.headers.authorization);
        const businessIdFromToken = auth.user_metadata.business_id;
        
        const { 
            businessId: businessIdFromQuery, 
            startDate, 
            endDate, 
            dateRange 
        } = event.queryStringParameters || {};

        let targetBusinessId = businessIdFromQuery || businessIdFromToken;
        
        if (businessIdFromQuery && businessIdFromToken && businessIdFromQuery !== businessIdFromToken) {
            console.error(`❌ Security violation`);
            return createResponse(403, { error: 'Forbidden' });
        }
        
        if (!targetBusinessId) {
            return createResponse(400, { error: 'Missing businessId' });
        }

        const supabase = getSupabase();
        
        // Build query
        let query = supabase
            .from('ONLINE CHECKING J-BAY ZEBRA LODGE')
            .select('*')
            .eq('business_id', targetBusinessId)
            .order('check_in_date', { ascending: false });

        // Apply date filters
        if (startDate && endDate) {
            query = query.gte('check_in_date', startDate).lte('check_in_date', endDate);
        } else if (dateRange === '7days') {
            const date = new Date();
            date.setDate(date.getDate() - 7);
            query = query.gte('check_in_date', date.toISOString().split('T')[0]);
        } else if (dateRange === '30days') {
            const date = new Date();
            date.setDate(date.getDate() - 30);
            query = query.gte('check_in_date', date.toISOString().split('T')[0]);
        } else if (dateRange === '90days') {
            const date = new Date();
            date.setDate(date.getDate() - 90);
            query = query.gte('check_in_date', date.toISOString().split('T')[0]);
        } else if (dateRange === '12months') {
            const date = new Date();
            date.setMonth(date.getMonth() - 12);
            query = query.gte('check_in_date', date.toISOString().split('T')[0]);
        }

        // Fetch all bookings
        const { data: allBookings, error } = await query;

        if (error) {
            console.error('Query error:', error);
            return createResponse(500, { error: error.message });
        }

        console.log(`✅ Total bookings fetched: ${allBookings?.length || 0}`);

        // Calculate analytics
        const totalRevenue = (allBookings || []).reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
        
        const statusBreakdown = (allBookings || []).reduce((acc, b) => {
            const status = b.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        
        const bookingsByMonth = (allBookings || []).reduce((acc, b) => {
            const dateField = b.check_in_date || b.check_in || b.created_at;
            if (dateField) {
                const date = new Date(dateField);
                if (!isNaN(date.getTime())) {
                    const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                    acc[monthYear] = (acc[monthYear] || 0) + 1;
                }
            }
            return acc;
        }, {});
        
        const guestOrigins = { provinces: {}, cities: {}, countries: {} };
        
        (allBookings || []).forEach(b => {
            if (b.guest_province) guestOrigins.provinces[b.guest_province] = (guestOrigins.provinces[b.guest_province] || 0) + 1;
            if (b.guest_city) guestOrigins.cities[b.guest_city] = (guestOrigins.cities[b.guest_city] || 0) + 1;
            if (b.guest_country) guestOrigins.countries[b.guest_country] = (guestOrigins.countries[b.guest_country] || 0) + 1;
        });

        const averageNights = allBookings?.length > 0
            ? (allBookings.reduce((sum, b) => sum + (Number(b.nights) || Number(b.num_nights) || 1), 0) / allBookings.length).toFixed(1)
            : 0;

        return createResponse(200, {
            success: true,
            bookings: allBookings || [],
            summary: {
                total_bookings: allBookings?.length || 0,
                total_revenue: totalRevenue,
                average_nights: parseFloat(averageNights),
                bookings_by_status: statusBreakdown,
                bookings_by_month: bookingsByMonth,
                guest_origins: guestOrigins
            },
            period: {
                date_range: dateRange || 'custom',
                start_date: startDate || null,
                end_date: endDate || null
            }
        });

    } catch (err) {
        console.error('❌ Error:', err);
        
        if (err.message?.startsWith('UNAUTHORIZED:') || err.message?.includes('token')) {
            return createResponse(401, { success: false, error: 'Invalid or expired token' });
        }
        
        return createResponse(500, {
            success: false,
            error: 'Internal Server Error',
            message: err.message
        });
    }
};
