import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// ============================================================
// TYPES
// ============================================================

export interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
    message?: string;
}

export interface AuthUser {
    id: string;
    business_id: string;
    email: string;
    name: string;
    role: 'business' | 'super_admin';
}

// ============================================================
// CONSTANTS
// ============================================================

export const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// ============================================================
// SUPABASE CLIENT (Service Role - Bypasses RLS)
// ============================================================

export const getSupabase = (): SupabaseClient => {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );
};

// ============================================================
// JWT VERIFICATION (COMPLETE - Not a placeholder)
// ============================================================

export const verifyAuth = (authHeader: string | undefined): AuthUser => {
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

    // Verify JWT_SECRET exists
    if (!process.env.SUPABASE_JWT_SECRET) {
        console.error('❌ SUPABASE_JWT_SECRET not configured');
        throw new Error('SERVER_ERROR: Authentication not configured');
    }

    try {
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET) as any;
        
        // Validate token has required fields
        if (!decoded.user_metadata?.business_id) {
            throw new Error('FORBIDDEN: Token missing business ID');
        }
        
        if (!decoded.sub) {
            throw new Error('FORBIDDEN: Token missing user ID');
        }
        
        return {
            id: decoded.sub,
            business_id: decoded.user_metadata.business_id,
            email: decoded.user_metadata.email || '',
            name: decoded.user_metadata.business_name || '',
            role: decoded.user_metadata.role || 'business'
        };
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('UNAUTHORIZED: Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('UNAUTHORIZED: Invalid token signature');
        }
        throw new Error(`UNAUTHORIZED: ${error.message}`);
    }
};

// ============================================================
// STANDARDIZED API RESPONSES
// ============================================================

export const createResponse = (statusCode: number, body: any, customHeaders: any = {}): any => {
    return {
        statusCode,
        headers: { ...headers, ...customHeaders },
        body: JSON.stringify(body)
    };
};

export const successResponse = (data: any, message?: string): ApiResponse => ({
    success: true,
    data,
    message
});

export const errorResponse = (error: string, message?: string): ApiResponse => ({
    success: false,
    error,
    message
});

// ============================================================
// BUSINESS OWNERSHIP VALIDATION
// ============================================================

export const validateBusinessOwnership = async (
    supabase: SupabaseClient,
    businessId: string,
    authUser: AuthUser
): Promise<boolean> => {
    // Super admins can access any business
    if (authUser.role === 'super_admin') {
        return true;
    }
    
    // Business users can only access their own business
    return authUser.business_id === businessId;
};
