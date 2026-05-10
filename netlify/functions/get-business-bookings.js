import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getSupabase = () => {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
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
            dateRange,
            limit = 10000 
        } = event.queryStringParameters || {};

        let targetBusinessId = businessIdFromQuery || businessIdFromToken;
        
        if (businessIdFromQuery && businessIdFromToken && businessIdFromQuery !== businessIdFromToken) {
            console.error(`❌ Security violation: Token business_id (${businessIdFromToken}) does not match requested (${businessIdFromQuery})`);
            return createResponse(403, { 
                error: 'Forbidden',
                message: 'You do not have permission to access this business data'
            });
        }
        
        if (!targetBusinessId) {
            return createResponse(400, { error: 'Missing businessId parameter' });
        }

        console.log(`✅ Authenticated request for business: ${targetBusinessId}`);
        console.log(`📊 Date range: ${dateRange}, Custom: ${startDate} - ${endDate}`);

        const supabase = getSupabase();
        
        // Start with base query
        let query = supabase
            .from('ONLINE CHECKING J-BAY ZEBRA LODGE')
            .select('*', { count: 'exact' })
            .eq('business_id', targetBusinessId)
            .order('check_in_date', { ascending: false });

        // ============================================================
        // APPLY DATE FILTERS BASED ON SELECTED RANGE
        // ============================================================
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Case 1: Custom date range (highest priority)
        if (startDate && endDate) {
            console.log(`📅 Using custom date range: ${startDate} to ${endDate}`);
            query = query
                .gte('check_in_date', startDate)
                .lte('check_in_date', endDate);
        }
        // Case 2: Preset ranges with actual date arithmetic
        else if (dateRange === '7days') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const dateStr = sevenDaysAgo.toISOString().split('T')[0];
            console.log(`📅 Last 7 days: >= ${dateStr}`);
            query = query.gte('check_in_date', dateStr);
        }
        else if (dateRange === '30days') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
            console.log(`📅 Last 30 days: >= ${dateStr}`);
            query = query.gte('check_in_date', dateStr);
        }
        else if (dateRange === '90days') {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const dateStr = ninetyDaysAgo.toISOString().split('T')[0];
            console.log(`📅 Last 90 days: >= ${dateStr}`);
            query = query.gte('check_in_date', dateStr);
        }
        else if (dateRange === '12months') {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
            const dateStr = twelveMonthsAgo.toISOString().split('T')[0];
            console.log(`📅 Last 12 months: >= ${dateStr}`);
            query = query.gte('check_in_date', dateStr);
        }
        else if (dateRange === 'all' || !dateRange) {
            console.log(`📅 All time - NO date filters`);
            // No date filter - return everything
        }

        // ============================================================
        // FETCH ALL RECORDS WITH PAGINATION (Fixes the 1000 limit issue)
        // ============================================================
        
        let allBookings = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
            const { data: batch, error: batchError, count } = await query
                .range(from, from + pageSize - 1);
            
            if (batchError) {
                console.error('Error fetching batch:', batchError);
                break;
            }
            
            if (batch && batch.length > 0) {
                allBookings = [...allBookings, ...batch];
                from += pageSize;
                hasMore = batch.length === pageSize;
            } else {
                hasMore = false;
            }
        }
        
        console.log(`✅ Total bookings fetched: ${allBookings.length}`);

        // ============================================================
        // CALCULATE ANALYTICS
        // ============================================================
        
        const totalRevenue = allBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        
        const statusBreakdown = allBookings.reduce((acc, b) => {
            const status = b.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        
        const bookingsByMonth = allBookings.reduce((acc, b) => {
            if (b.check_in_date) {
                const date = new Date(b.check_in_date);
                const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                acc[monthYear] = (acc[monthYear] || 0) + 1;
            }
            return acc;
        }, {});
        
        const guestOrigins = {
            provinces: {},
            cities: {},
            countries: {}
        };
        
        allBookings.forEach(b => {
            if (b.guest_province) guestOrigins.provinces[b.guest_province] = (guestOrigins.provinces[b.guest_province] || 0) + 1;
            if (b.guest_city) guestOrigins.cities[b.guest_city] = (guestOrigins.cities[b.guest_city] || 0) + 1;
            if (b.guest_country) guestOrigins.countries[b.guest_country] = (guestOrigins.countries[b.guest_country] || 0) + 1;
        });

        const averageNights = allBookings.length > 0
            ? (allBookings.reduce((sum, b) => sum + (b.nights || 1), 0) / allBookings.length).toFixed(1)
            : 0;

        return createResponse(200, {
            success: true,
            bookings: allBookings,
            summary: {
                total_bookings: allBookings.length,
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
        console.error('❌ get-business-bookings error:', err);
        
        if (err.message.startsWith('UNAUTHORIZED:')) {
            return createResponse(401, { success: false, error: err.message.replace('UNAUTHORIZED: ', '') });
        }
        if (err.message.startsWith('FORBIDDEN:')) {
            return createResponse(403, { success: false, error: err.message.replace('FORBIDDEN: ', '') });
        }
        
        return createResponse(500, {
            success: false,
            error: 'Internal Server Error',
            message: err.message
        });
    }
};
