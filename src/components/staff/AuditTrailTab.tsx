// src/components/staff/AuditTrailTab.tsx
// Full implementation extracted from AI Studio prototype

import React, { useState, useMemo } from 'react';

interface AuditLog {
  id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  guest_id: string;
  guest_name: string;
  previous_value: string;
  new_value: string;
  timestamp: string;
}

interface AuditTrailTabProps {
  auditLogs: AuditLog[];
}

export function AuditTrailTab({ auditLogs }: AuditTrailTabProps) {
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const staffMatch = log.employee_name.toLowerCase().includes(search.toLowerCase());
      const guestMatch = log.guest_name.toLowerCase().includes(search.toLowerCase());
      return staffMatch || guestMatch;
    });
  }, [auditLogs, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 leading-none">
            Dietary Modification Audit Trail
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Permanently logs all employee updates on guest food restrictions for operations compliance
          </p>
        </div>

        <input
          type="text"
          placeholder="Filter logs by staff or guest name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-72 bg-white border border-stone-200 rounded-xl py-2 px-4 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 border-b border-stone-100 text-stone-400 font-bold uppercase tracking-widest text-[9px]">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Employee Name</th>
                <th className="px-6 py-4">Guest Reference</th>
                <th className="px-6 py-4">Previous Alert Flags</th>
                <th className="px-6 py-4">Committed Restrictions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                    No modifications logged in database.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 text-stone-500 font-mono">
                      {new Date(log.timestamp).toLocaleString('en-ZA')}
                    </td>
                    <td className="px-6 py-4 font-bold text-stone-900">
                      {log.employee_name}{' '}
                      <span className="text-[10px] text-stone-400 font-mono">({log.employee_id})</span>
                    </td>
                    <td className="px-6 py-4 text-stone-800">
                      <strong>{log.guest_name}</strong>{' '}
                      <span className="text-[10px] text-stone-400 font-mono">({log.guest_id})</span>
                    </td>
                    <td className="px-6 py-4 text-red-600 font-mono text-[11px] truncate max-w-[200px]" title={log.previous_value}>
                      {log.previous_value}
                    </td>
                    <td className="px-6 py-4 text-green-600 font-mono font-bold text-[11px] truncate max-w-[200px]" title={log.new_value}>
                      {log.new_value}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditTrailTab;
