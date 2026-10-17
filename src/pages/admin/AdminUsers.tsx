import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../../types';
import { dataService } from '../../services/dataService';
import {
  Users,
  Search,
  Shield,
  Headphones,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  KeyRound,
  Gamepad2,
  Wallet,
  Clock,
  Sparkles,
  Lock,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

interface AdminUsersProps {
  currentUser: UserProfile;
  onNavigateTab: (tab: string, meta?: any) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ currentUser, onNavigateTab }) => {
  const isAdmin = currentUser.role === 'admin';
  const isAgent = currentUser.role === 'agent';

  const [users, setUsers] = useState<UserProfile[]>(dataService.getUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'agent' | 'admin'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const loadUsers = () => {
    setUsers(dataService.getUsers());
  };

  useEffect(() => {
    loadUsers();
    const handleState = () => loadUsers();
    window.addEventListener('aetherpay_state_changed', handleState);
    return () => window.removeEventListener('aetherpay_state_changed', handleState);
  }, []);

  const handleRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    if (!isAdmin) {
      setFeedback({ type: 'error', text: 'Agents have read-only view. Only administrators can alter user roles.' });
      return;
    }

    if (dataService.isProtectedParentAdmin(targetUser.email) || dataService.isProtectedParentAdmin(targetUser.id)) {
      if (newRole !== 'admin') {
        setFeedback({
          type: 'error',
          text: 'Security Guard: The primary platform creator is permanently designated as Super Admin and cannot be demoted.',
        });
        return;
      }
    }

    setIsUpdating(targetUser.id);
    setFeedback(null);

    try {
      const res = await dataService.updateUserRole(targetUser.id, newRole, currentUser);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        if (selectedUser?.id === targetUser.id && res.user) {
          setSelectedUser(res.user);
        }
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update user role.' });
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">User Directory &amp; Staff Governance</h1>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                isAdmin
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                  : 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
              }`}
            >
              {isAdmin ? <Shield className="w-3 h-3 text-amber-400" /> : <Headphones className="w-3 h-3 text-cyan-400" />}
              <span>{isAdmin ? 'Admin Authority: Full Role Management' : 'Agent Authority: Read-Only Profile View'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Promote players to agents or administrators. Primary platform creator is permanently protected as Super Admin.'
              : 'View complete player profiles, active game accounts, balances, and chat channels. Role changes are restricted to Admins.'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Total Directory</span>
              <span className="font-mono font-bold text-white text-sm">{users.length}</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Players</span>
              <span className="font-mono font-bold text-indigo-400 text-sm">
                {users.filter((u) => u.role === 'customer').length}
              </span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Staff</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {users.filter((u) => u.role !== 'customer').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 shadow-md ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-700 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or user ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
          {(['all', 'customer', 'agent', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === 'all' ? 'All Roles' : `${r}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">User / Handle</th>
                <th className="py-3.5 px-4">Role &amp; Governance</th>
                <th className="py-3.5 px-4">Wallet Balance</th>
                <th className="py-3.5 px-4">Active Games</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No users matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const wallet = dataService.getWallet(u.id);
                  const gameAccounts = dataService.getGameAccounts(u.id);
                  const isParentAdmin = dataService.isProtectedParentAdmin(u.email) || dataService.isProtectedParentAdmin(u.id);

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-inner ${
                              u.role === 'admin'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                : u.role === 'agent'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                                : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                            }`}
                          >
                            {u.displayName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5 truncate">
                              <span>{u.displayName}</span>
                              {isParentAdmin && (
                                <span title="Protected Parent Admin">
                                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Governance Selector */}
                      <td className="py-3.5 px-4">
                        {isParentAdmin ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>Parent Super Admin</span>
                          </div>
                        ) : isAdmin ? (
                          <select
                            value={u.role}
                            disabled={isUpdating === u.id}
                            onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                            className={`bg-slate-950 border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none ${
                              u.role === 'admin'
                                ? 'border-amber-700/80 text-amber-300'
                                : u.role === 'agent'
                                ? 'border-cyan-700/80 text-cyan-300'
                                : 'border-slate-700 text-slate-300'
                            }`}
                          >
                            <option value="customer">Player (Customer)</option>
                            <option value="agent">Support Agent</option>
                            <option value="admin">Administrator</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize ${
                              u.role === 'admin'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : u.role === 'agent'
                                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        )}
                      </td>

                      {/* Wallet Balance */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white">
                          ${(wallet?.availableBalance || 0).toFixed(2)}
                        </div>
                        {(wallet?.reservedBalance || 0) > 0 && (
                          <div className="text-[10px] text-amber-400 font-mono">
                            ${wallet.reservedBalance.toFixed(2)} in vault
                          </div>
                        )}
                      </td>

                      {/* Active Games */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-300">
                          {gameAccounts.filter((g) => g.status === 'active').length} active
                        </span>
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4">
                        {u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> Unverified
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-[11px] flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Profile</span>
                          </button>

                          <button
                            onClick={() => {
                              const conv = dataService.getOrCreateConversationForCustomer(u.id, u.displayName);
                              onNavigateTab('ops_chat', { highlightConvId: conv.id });
                            }}
                            className="p-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 transition-colors"
                            title="Chat with user"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Profile Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-300 flex items-center justify-center font-bold text-sm uppercase">
                  {selectedUser.displayName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>{selectedUser.displayName}</span>
                    {dataService.isProtectedParentAdmin(selectedUser.email) && (
                      <span className="text-[10px] text-amber-400 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.2 rounded font-mono">
                        Protected Super Admin
                      </span>
                    )}
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono">{selectedUser.email}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Balances & Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Available Cash Balance</span>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  ${(dataService.getWallet(selectedUser.id)?.availableBalance || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Reserved In Vault</span>
                <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                  ${(dataService.getWallet(selectedUser.id)?.reservedBalance || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">User ID:</span>
                <span className="font-mono text-white select-all">{selectedUser.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="text-white">{selectedUser.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="capitalize text-emerald-400 font-semibold">{selectedUser.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered:</span>
                <span className="font-mono">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Provisioned Game IDs */}
            <div className="space-y-2">
              <h4 className="font-bold text-white flex items-center justify-between">
                <span>Assigned Game Accounts</span>
                <span className="text-[10px] text-slate-400">
                  {dataService.getGameAccounts(selectedUser.id).length} platform(s)
                </span>
              </h4>

              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {dataService.getGameAccounts(selectedUser.id).length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-950 text-center text-slate-500 text-[11px]">
                    No game accounts provisioned yet.
                  </div>
                ) : (
                  dataService.getGameAccounts(selectedUser.id).map((ga) => (
                    <div
                      key={ga.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white">{ga.gameName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: <span className="text-amber-300">{ga.username}</span> | Pass: {ga.password || '•••••'}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                        {ga.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Chat Link */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const conv = dataService.getOrCreateConversationForCustomer(selectedUser.id, selectedUser.displayName);
                  setSelectedUser(null);
                  onNavigateTab('ops_chat', { highlightConvId: conv.id });
                }}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Support Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
