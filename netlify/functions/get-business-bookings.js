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
    // Check if authorization header exists
    if (!authHeader) {
        throw new Error('UNAUTHORIZED: No authorization token provided');
    }
    
    // Extract token from "Bearer <token>"
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader.split(' ')[1];
    
    if (!token) {
        throw new Error('UNAUTHORIZED: Invalid token format');
    }

    try {
        // Verify JWT with Supabase JWT secret
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        
        // Validate business_id exists in token metadata
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
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(204, {});
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return createResponse(405, { error: 'Method Not Allowed' });
    }

    try {
        // ✅ STEP 1: Verify JWT and extract business_id
        const auth = verifyAuth(event.headers.authorization);
        const businessIdFromToken = auth.user_metadata.business_id;
        
        // ✅ STEP 2: Get parameters from query string
        const { 
            businessId: businessIdFromQuery, 
            startDate, 
            endDate, 
            limit = 5000,
            futureOnly = 'false'  // NEW PARAMETER - controls date filtering
        } = event.queryStringParameters || {};

        // ✅ STEP 3: Determine which business_id to use
        let targetBusinessId = businessIdFromQuery || businessIdFromToken;
        
        // ✅ STEP 4: If both exist, they MUST match
        if (businessIdFromQuery && businessIdFromToken && businessIdFromQuery !== businessIdFromToken) {
            console.error(`❌ Security violation: Token business_id (${businessIdFromToken}) does not match requested (${businessIdFromQuery})`);
            return createResponse(403, { 
                error: 'Forbidden',
                message: 'You do not have permission to access this business data'
            });
        }
        
        // ✅ STEP 5: Validate we have a business_id
        if (!targetBusinessId) {
            return createResponse(400, { error: 'Missing businessId parameter' });
        }

        console.log(`✅ Authenticated request for business: ${targetBusinessId}`);
        console.log(`📊 Fetching bookings with limit: ${limit}`);
        console.log(`📅 Date filters: startDate=${startDate}, endDate=${endDate}, futureOnly=${futureOnly}`);

        const supabase = getSupabase();

        // ✅ STEP 6: Build query - START WITH ALL BOOKINGS (NO DATE FILTERS)
        let query = supabase
            .from('ONLINE CHECKING J-BAY ZEBRA LODGE')  // ← FIXED: Use correct table name
            .select('*')
            .eq('business_id', targetBusinessId)
            .order('check_in_date', { ascending: false })  // ← Changed to check_in_date
            .limit(parseInt(limit));

        // ✅ STEP 7: APPLY DATE FILTERS ONLY IF EXPLICITLY REQUESTED
        
        // Option A: Custom date range (highest priority)
        if (startDate && endDate) {
            console.log(`📅 Applying custom date range: ${startDate} to ${endDate}`);
            query = query
                .gte('check_in_date', startDate)
                .lte('check_in_date', endDate);
        }
        // Option B: Future only (for dashboard default view)
        else if (futureOnly === 'true') {
            const today = new Date().toISOString().split('T')[0];
            console.log(`📅 Filtering future bookings only (>= ${today})`);
            query = query.gte('check_in_date', today);
        }
        // Option C: No date filters = ALL BOOKINGS (what "All Time" should do)
        else {
            console.log(`📅 No date filters applied - returning ALL bookings (including historical)`);
        }

        const { data: bookings, error } = await query;

        if (error) {
            console.error('❌ Supabase error:', error);
            return createResponse(500, { 
                success: false, 
                error: 'Failed to fetch bookings',
                details: error.message
            });
        }

        console.log(`✅ Success: ${bookings?.length || 0} bookings returned`);

        // ✅ STEP 8: Calculate analytics
        const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
        
        const statusBreakdown = bookings?.reduce((acc, b) => {
            const status = b.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {}) || {};
        
        const bookingsByMonth = bookings?.reduce((acc, b) => {
            if (b.check_in_date) {
                const date = new Date(b.check_in_date);
                const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                acc[monthYear] = (acc[monthYear] || 0) + 1;
            }
            return acc;
        }, {}) || {};
        
        const guestOrigins = {
            provinces: {},
            cities: {},
            countries: {}
        };
        
        bookings?.forEach(b => {
            if (b.guest_province) {
                guestOrigins.provinces[b.guest_province] = (guestOrigins.provinces[b.guest_province] || 0) + 1;
            }
            if (b.guest_city) {
                guestOrigins.cities[b.guest_city] = (guestOrigins.cities[b.guest_city] || 0) + 1;
            }
            if (b.guest_country) {
                guestOrigins.countries[b.guest_country] = (guestOrigins.countries[b.guest_country] || 0) + 1;
            }
        });

        const averageNights = bookings?.length > 0
            ? (bookings.reduce((sum, b) => sum + (b.nights || 1), 0) / bookings.length).toFixed(1)
            : 0;

        // ✅ STEP 9: Return secure response
        return createResponse(200, {
            success: true,
            bookings: bookings || [],
            summary: {
                total_bookings: bookings?.length || 0,
                total_revenue: totalRevenue,
                average_nights: parseFloat(averageNights),
                bookings_by_status: statusBreakdown,
                bookings_by_month: bookingsByMonth,
                guest_origins: guestOrigins
            },
            period: {
                start_date: startDate || (futureOnly === 'true' ? 'today' : 'all_time'),
                end_date: endDate || 'all'
            }
        });

    } catch (err) {
        console.error('❌ get-business-bookings error:', err);
        
        // Handle specific auth errors with appropriate status codes
        if (err.message.startsWith('UNAUTHORIZED:')) {
            return createResponse(401, { 
                success: false, 
                error: err.message.replace('UNAUTHORIZED: ', '')
            });
        }
        
        if (err.message.startsWith('FORBIDDEN:')) {
            return createResponse(403, { 
                success: false, 
                error: err.message.replace('FORBIDDEN: ', '')
            });
        }
        
        return createResponse(500, {
            success: false,
            error: 'Internal Server Error',
            message: err.message
        });
    }
};
