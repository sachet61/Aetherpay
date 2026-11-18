import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AuditLog } from '../../types';
import { dataService } from '../../services/dataService';
import { requestReauthSignIn } from '../../services/supabaseTokenManager';
import {
  buildAuditCsv,
  filterAuditLogs,
  mergeAuditLogs,
} from '../../utils/auditLogUtils';
import {
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';

interface AdminAuditProps {
  currentUser: UserProfile;
}

export const AdminAudit: React.FC<AdminAuditProps> = ({ currentUser }) => {
  const isAdmin = currentUser.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [logs, setLogs] = useState<AuditLog[]>(() => (isAdmin ? dataService.getAuditLogs() : []));
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorRequiresReauth, setErrorRequiresReauth] = useState(false);

  const activeFiltersRef = useRef({
    entityFilter,
    debouncedSearch,
    fromDate,
    toDate,
  });
  activeFiltersRef.current = { entityFilter, debouncedSearch, fromDate, toDate };

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  const loadLogs = useCallback(
    async (opts?: { beforeTimestamp?: string; append?: boolean }) => {
      if (!isAdmin) return;
      const append = Boolean(opts?.append);
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setErrorMsg(null);
      setErrorRequiresReauth(false);

      const res = await dataService.fetchAuditLogsFromServer({
        limit: 100,
        entityType: entityFilter,
        search: debouncedSearch,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        beforeTimestamp: opts?.beforeTimestamp,
        append,
        skipCacheUpdate:
          entityFilter !== 'all' || Boolean(debouncedSearch) || Boolean(fromDate) || Boolean(toDate),
      });

      if (res.error) {
        setErrorMsg(res.error);
        setErrorRequiresReauth(Boolean(res.requiresReauth || res.code === 'TOKEN_EXPIRED'));
      } else {
        setLogs((prev) => (append ? mergeAuditLogs(prev, res.logs, { maxItems: 500 }) : res.logs));
        setHasMore(res.hasMore);
        setNextCursor(res.nextCursor);
      }

      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    },
    [isAdmin, entityFilter, debouncedSearch, fromDate, toDate]
  );

  useEffect(() => {
    if (!isAdmin) return;
    void loadLogs();
  }, [isAdmin, loadLogs]);

  // Listen for live Supabase Realtime audit_logs INSERT updates & session hydration
  useEffect(() => {
    if (!isAdmin) return;

    const handleStateChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const isAuditBatch =
        detail?.key === 'aetherpay_audit_logs' ||
        detail?.key === 'hydration_finished' ||
        (detail?.key === 'realtime_batch' &&
          Array.isArray(detail?.tables) &&
          detail.tables.includes('audit_logs'));

      if (!isAuditBatch) return;

      const latestCached = dataService.getAuditLogs();
      const filters = activeFiltersRef.current;
      const matching = filterAuditLogs(latestCached, {
        entityType: filters.entityFilter,
        searchTerm: filters.debouncedSearch,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      });

      setLogs((prev) => mergeAuditLogs(prev, matching, { maxItems: 500 }));
    };

    window.addEventListener('aetherpay_state_changed', handleStateChanged);
    return () => window.removeEventListener('aetherpay_state_changed', handleStateChanged);
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-10 text-center rounded-2xl border border-amber-500/30 bg-amber-950/20 max-w-xl mx-auto mt-12">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Administrator Access Required</h2>
        <p className="text-xs text-amber-300/80">
          Only Platform Administrators are authorized to inspect system security audit logs.
        </p>
      </div>
    );
  }

  const handleExportCSV = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    try {
      const res = await dataService.fetchAuditLogsFromServer({
        limit: 500,
        entityType: entityFilter,
        search: debouncedSearch,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        format: 'csv',
        skipCacheUpdate: true,
      });

      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      const csvBody = buildAuditCsv(res.logs.length > 0 ? res.logs : logs);
      const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SwiftSweeps_Audit_Trail_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs &amp; Operational Reports</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable server-recorded audit trail for authentication events, staff overrides, treasury approvals, and system mutations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadLogs()}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportCSV()}
            disabled={isExporting || isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export Audit CSV'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter audit logs by entity type"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Entity Types</option>
            <option value="auth">Authentication (Login / Logout / Reset)</option>
            <option value="user">Users &amp; Roles</option>
            <option value="topup">Top-Ups</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="wallet">Wallet Balances</option>
            <option value="game_account">Gaming IDs</option>
            <option value="settings">Settings &amp; Rules</option>
            <option value="chat">Support Chat</option>
          </select>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              aria-label="From date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            />
            <span>to</span>
            <input
              type="date"
              aria-label="To date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search audit logs"
            placeholder="Search action, actor, ID, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {errorRequiresReauth && (
            <button
              type="button"
              onClick={() => requestReauthSignIn(errorMsg || undefined)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] whitespace-nowrap shrink-0"
            >
              Sign In Again
            </button>
          )}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
        {isLoading && logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading audit records from server...</span>
          </div>
        ) : logs.length === 0 ? (
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
                {logs.map((log) => (
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
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
                      <span className="capitalize text-slate-300 font-medium">{log.entityType}</span>
                      {log.entityId ? `: ${log.entityId}` : ''}
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

        {hasMore && nextCursor && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex justify-center">
            <button
              type="button"
              disabled={isLoadingMore}
              onClick={() => void loadLogs({ beforeTimestamp: nextCursor, append: true })}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-60"
            >
              {isLoadingMore ? 'Loading older logs...' : 'Load Older Logs'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
