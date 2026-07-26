// src/components/staff/HousekeepingTab.tsx
// ✅ Complete Housekeeping Task List for Staff

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Check, X, Clock, User, DoorOpen, 
  Calendar, AlertCircle, Filter, Search,
  ChevronDown
} from 'lucide-react';
import { getTaskIcon, getTaskColor, getStatusDisplayText } from '../../services/housekeepingService';

interface HousekeepingTask {
  id: string;
  business_id: string;
  booking_id: string;
  room_number: string;
  guest_name: string;
  task_type: 'refresh' | 'full_service';
  scheduled_date: string;
  stay_night: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  assigned_staff_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_staff_name?: string;
}

interface HousekeepingTabProps {
  businessId: string;
  session: {
    user: {
      id: string;
      full_name: string;
      role: 'owner' | 'EmployeeOverview';
      business_id: string;
    };
  };
}

export function HousekeepingTab({ businessId, session }: HousekeepingTabProps) {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'pending'>('today');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const isEmployee = session.user.role === 'EmployeeOverview';
  const canComplete = isEmployee || session.user.role === 'owner';

  const fetchTasks = useCallback(async () => {
    if (!businessId) return;

    setLoading(true);
    setError(null);

    try {
      let token = null;
      try {
        const authStr = localStorage.getItem('fastcheckin_auth');
        if (authStr) {
          const auth = JSON.parse(authStr);
          token = auth.token;
        }
      } catch (e) {
        console.warn('Could not get auth token:', e);
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const today = new Date().toISOString().split('T')[0];
      let url = `/.netlify/functions/get-housekeeping-tasks?businessId=${businessId}`;

      if (filter === 'today') {
        url += `&scheduledDate=${today}`;
      } else if (filter === 'pending') {
        url += `&status=pending`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch tasks:', errorText);
        setError(`Failed to fetch tasks: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log('✅ Housekeeping tasks:', data);

      if (data.success && data.data) {
        setTasks(data.data);
      } else if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('❌ Error fetching tasks
