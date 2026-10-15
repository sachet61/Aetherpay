import React, { useState } from 'react';
import { UserProfile, AuditLog } from '../../types';
import { dataService } from '../../services/dataService';
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  Clock,
  User,
  Shield,
} from 'lucide-react';

interface AdminAuditProps {
  currentUser: UserProfile;
}

export const AdminAudit: React.FC<AdminAuditProps> = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const allLogs = dataService.getAuditLogs();

  const filteredLogs = allLogs.filter((log) => {
    if (entityFilter !== 'all' && log.entityType !== entityFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.timestamp).toISOString(),
      `"${l.actorName.replace(/"/g, '""')}"`,
      l.actorRole,
      l.action,
      l.entityType,
      l.entityId,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SwiftSweeps_Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs &amp; Operational Reports</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable regulatory audit trail recording all staff overrides, treasury approvals, and financial movements.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Entity Types</option>
            <option value="topup">Top-Ups</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="wallet">Wallet Balances</option>
            <option value="settings">Settings &amp; Rules</option>
            <option value="game_account">Gaming IDs</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, actor, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No audit records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Timestamp &amp; ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-slate-300">
                        {new Date(log.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{log.actorName}</div>
                      <div className="text-[10px] font-mono text-indigo-400 capitalize">{log.actorRole}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200 text-[11px]">
                      {log.action}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      <span className="capitalize text-slate-300 font-medium">{log.entityType}</span>: {log.entityId}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 leading-relaxed max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
