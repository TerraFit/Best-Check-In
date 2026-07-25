import { supabase } from '@/lib/supabase';

interface AuditLogData {
  action: string;
  guest_id?: string;
  employee_id?: string;
  changes: Record<string, any>;
  ip_address?: string;
}

export const createAuditLog = async (data: AuditLogData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user for audit log');
      return;
    }

    const logEntry = {
      user_id: user.id,
      user_email: user.email,
      action: data.action,
      guest_id: data.guest_id || null,
      employee_id: data.employee_id || null,
      changes: data.changes,
      ip_address: data.ip_address || '0.0.0.0',
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('food_restriction_audit')
      .insert([logEntry]);

    if (error) {
      console.error('Error creating audit log:', error);
    } else {
      console.log('Audit log created:', logEntry);
    }
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
