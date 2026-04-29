import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
    message?: string;
}

export const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Service role client - used by all functions (bypasses RLS intentionally)
export const getSupabase = (): SupabaseClient => {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );
};

// JWT Verification (to be implemented in Phase 2.2)
export const verifyAuth = (authHeader: string | undefined): any => {
    if (!authHeader) {
        throw new Error('Unauthorized: No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new Error('Unauthorized: Invalid token format');
    }

    // TODO: Add JWT verification in Phase 2.2
    // For now, return a placeholder
    return { sub: 'temp', user_metadata: { business_id: null } };
};

// Helper for consistent API responses
export const successResponse = (data: any): ApiResponse => ({
    success: true,
    data
});

export const errorResponse = (error: string): ApiResponse => ({
    success: false,
    error
});
