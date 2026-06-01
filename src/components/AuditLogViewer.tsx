/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ShieldCheck, 
  UserSquare, 
  Activity, 
  Clock,
  ArrowRight,
  UserX,
  FileText
} from 'lucide-react';
import { AuditLog, UserProfile, UserRole } from '../types';

interface AuditLogViewerProps {
  logs: AuditLog[];
  currentUser: UserProfile | null;
}

export default function AuditLogViewer({ logs, currentUser }: AuditLogViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');

  // Access check: only Admin and Auditor can inspect system logs
  const hasAccess = useMemo(() => {
    if (!currentUser) return false;
    return [UserRole.ADMIN, UserRole.AUDITOR].includes(currentUser.role);
  }, [currentUser]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        log.details.toLowerCase().includes(q) ||
        log.performedByName.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q);
      const matchesAction = filterAction === '' || log.action.includes(filterAction);

      return matchesSearch && matchesAction;
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [logs, searchQuery, filterAction]);

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-2xl border border-rose-100 p-8 text-center max-w-lg mx-auto my-12" id="audit-access-denied">
        <div className="p-4 bg-rose-50 text-rose-700 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
          <UserX size={45} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Confidentiality Gate Active</h3>
        <p className="text-xs text-slate-500 mt-2">
          Your current profile role (<span className="font-extrabold text-rose-600">{currentUser?.role || 'Guest'}</span>) does not possess key authorization folders. Please switch to <span className="font-bold">Administrator</span> or <span className="font-bold">Auditor</span> in the simulation switch to inspect.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="audit-logs-root">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-1.5"><ShieldCheck className="text-indigo-600" size={20} /> Integrity Audit Trail Logs</h2>
          <p className="text-xs text-slate-500">Un-alterable tracking log recording creations, voided vouchers, and status shifts across church accounts</p>
        </div>
        <span className="text-xs font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 py-1 px-3 rounded-full flex items-center gap-1.5">
          ● AUDITOR PORTAL LIVE
        </span>
      </div>

      {/* Advanced controller Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              id="inp-search-audit"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search signatures, detailed text explanations, transaction IDs, or modified paths..."
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 px-9 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1 self-start select-action-holder">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="text-xs bg-transparent text-slate-700 focus:outline-none font-bold px-2 py-1"
            >
              <option value="">All Action Domains</option>
              <option value="CREATE_INCOME">Create Income</option>
              <option value="DELETE_INCOME">Deleted Income</option>
              <option value="CREATE_EXPENSE">Created Expense</option>
              <option value="DELETE_EXPENSE">Deleted Expense</option>
              <option value="CREATE_MEMBER">Register Member</option>
              <option value="CREATE_PROJECT">Launch Project</option>
              <option value="CREATE_PLEDGE">Created Pledge</option>
            </select>
          </div>
        </div>

        {/* Logs Listing timeline */}
        <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1" id="audit-feed-list">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl">
              No matching audit trail logs captured.
            </div>
          ) : (
            filteredLogs.map(log => {
              const isVoid = log.action.includes("DELETE");
              return (
                <div key={log.id} className="p-4 bg-slate-50/60 border border-slate-150 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden transition hover:bg-slate-50">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isVoid ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}`}>
                      <Activity size={18} />
                    </div>
                    <div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full mr-2 font-mono ${
                        isVoid ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"
                      }`}>
                        {log.action}
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                        {log.details}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-450 font-semibold font-mono">
                        <span className="flex items-center gap-1"><UserSquare size={12} className="text-slate-400" /> Done By: {log.performedByName} ({log.performedByRole})</span>
                        <span className="flex items-center gap-1"><Clock size={12} className="text-slate-400" /> {log.timestamp.replace('T', ' ').substring(0, 19)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Object Hash</span>
                    <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{log.entityId.substring(0, 12)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
