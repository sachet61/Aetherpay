import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, GameAccount } from '../../types';
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
  Trash2,
  Check,
  Loader2,
  Copy,
  EyeOff,
  Plus,
  X,
  Edit3,
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
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Game account assignment & editing state (strictly 1 ID per game)
  const [editingGameAcc, setEditingGameAcc] = useState<GameAccount | null>(null);
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [selectedGameCatalogId, setSelectedGameCatalogId] = useState('');
  const [assignedUsername, setAssignedUsername] = useState('');
  const [assignedPassword, setAssignedPassword] = useState('');
  const [assignedNotes, setAssignedNotes] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadUsers = () => {
    setUsers(dataService.getUsers());
  };

  useEffect(() => {
    loadUsers();
    const handleState = () => {
      loadUsers();
      if (selectedUser) {
        const refreshed = dataService.getUserById(selectedUser.id);
        if (refreshed) setSelectedUser(refreshed);
      }
    };
    window.addEventListener('aetherpay_state_changed', handleState);
    return () => window.removeEventListener('aetherpay_state_changed', handleState);
  }, [selectedUser?.id]);

  const handleRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    if (!isAdmin) {
      const err = { type: 'error' as const, text: 'Access Denied: Support Agents have read-only view. Only administrators can alter user roles.' };
      setFeedback(err);
      setModalFeedback(err);
      return;
    }

    const isParent =
      targetUser.role === 'admin' &&
      (dataService.isProtectedParentAdmin(targetUser.email, targetUser) ||
        dataService.isProtectedParentAdmin(targetUser.id, targetUser) ||
        Boolean(targetUser.isParentAdmin));

    if (isParent && newRole !== 'admin') {
      const err = {
        type: 'error' as const,
        text: 'Security Guard: Newly appointed administrators cannot demote the Parent Admin. The primary platform administrator role is permanently protected.',
      };
      setFeedback(err);
      setModalFeedback(err);
      return;
    }

    if (currentUser.id === targetUser.id && newRole !== 'admin') {
      const err = {
        type: 'error' as const,
        text: 'Self-Demotion Guard: You cannot demote your own active administrator account. Another admin must perform this action.',
      };
      setFeedback(err);
      setModalFeedback(err);
      return;
    }

    setIsUpdating(targetUser.id);
    setFeedback(null);
    setModalFeedback(null);

    try {
      const res = await dataService.updateUserRole(targetUser.id, newRole, currentUser);
      if (res.success) {
        const succ = { type: 'success' as const, text: res.message };
        setFeedback(succ);
        setModalFeedback(succ);
        loadUsers();
        if (res.user) {
          setSelectedUser(res.user);
        }
      } else {
        const err = { type: 'error' as const, text: res.message };
        setFeedback(err);
        setModalFeedback(err);
      }
    } catch (err: any) {
      const e = { type: 'error' as const, text: err.message || 'Failed to update user role.' };
      setFeedback(e);
      setModalFeedback(e);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await dataService.deleteUserCompletely(userToDelete.id, currentUser);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setUsers(dataService.getUsers());
        setUserToDelete(null);
        setSelectedUser(null);
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete user.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePasswordVisibility = (accountId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const handleOpenEditGameModal = (acc: GameAccount) => {
    setEditingGameAcc(acc);
    setAssignedUsername(acc.username || '');
    setAssignedPassword(acc.password || '');
    setAssignedNotes(acc.notes || '');
  };

  const handleOpenAddGameModal = (user: UserProfile) => {
    const catalog = dataService.getGameCatalog();
    if (catalog.length > 0) {
      setSelectedGameCatalogId(catalog[0].id);
    }
    const cleanHandle = user.displayName.replace(/\s+/g, '').toLowerCase();
    setAssignedUsername(`${cleanHandle}_${Math.floor(100 + Math.random() * 900)}`);
    setAssignedPassword(`Pass#${Math.floor(1000 + Math.random() * 9000)}!`);
    setAssignedNotes('');
    setShowAddGameModal(true);
  };

  const handleSaveGameAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!assignedUsername.trim()) {
      alert('Username cannot be empty.');
      return;
    }

    if (editingGameAcc) {
      // Update existing single account
      const res = dataService.assignOrUpdateGameCredentials({
        accountId: editingGameAcc.id,
        username: assignedUsername.trim(),
        password: assignedPassword.trim(),
        notes: assignedNotes.trim() || undefined,
        reviewerId: currentUser.id,
        reviewerName: currentUser.displayName,
      });
      if (res.success) {
        setModalFeedback({ type: 'success', text: `Credentials updated for ${editingGameAcc.gameName}. Single ID enforced.` });
        setEditingGameAcc(null);
      } else {
        setModalFeedback({ type: 'error', text: res.message });
      }
    } else {
      // Provision or update account
      const res = dataService.provisionGameAccount({
        customerId: selectedUser.id,
        customerName: selectedUser.displayName,
        gameCatalogId: selectedGameCatalogId,
        username: assignedUsername.trim(),
        password: assignedPassword.trim(),
        notes: assignedNotes.trim() || undefined,
        reviewerId: currentUser.id,
        reviewerName: currentUser.displayName,
      });
      if (res.success) {
        setModalFeedback({ type: 'success', text: res.message });
        setShowAddGameModal(false);
      } else {
        setModalFeedback({ type: 'error', text: res.message });
      }
    }
  };

  const handleDeleteGameAccount = (acc: GameAccount) => {
    if (!confirm(`Are you sure you want to remove the game account ID "${acc.username}" for "${acc.gameName}"?`)) {
      return;
    }
    const res = dataService.deleteGameAccount(acc.id, currentUser.id, currentUser.displayName);
    if (res.success) {
      setModalFeedback({ type: 'success', text: `Deleted game ID for ${acc.gameName}.` });
    } else {
      setModalFeedback({ type: 'error', text: res.message });
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
                  const isParentAdmin =
                    u.role === 'admin' &&
                    (dataService.isProtectedParentAdmin(u.email, u) ||
                      dataService.isProtectedParentAdmin(u.id, u) ||
                      Boolean(u.isParentAdmin));

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={(e) => {
                        // Prevent triggering row click when interacting with select or action buttons
                        const target = e.target as HTMLElement;
                        if (target.closest('select') || target.closest('button')) return;
                        setSelectedUser(u);
                        setModalFeedback(null);
                      }}
                    >
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
                                <span title="Protected Parent Super Admin (Cannot be demoted)">
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
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-bold"
                            title="Protected Parent Super Admin: Cannot be altered or demoted by other administrators"
                          >
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Parent Super Admin</span>
                          </div>
                        ) : isAdmin ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              disabled={isUpdating === u.id}
                              onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                              className={`bg-slate-950 border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none transition-colors cursor-pointer ${
                                u.role === 'admin'
                                  ? 'border-amber-700/80 text-amber-300'
                                  : u.role === 'agent'
                                  ? 'border-cyan-700/80 text-cyan-300'
                                  : 'border-slate-700 text-slate-300'
                              } ${isUpdating === u.id ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              <option value="customer">Player (Customer)</option>
                              <option value="agent">Support Agent</option>
                              <option value="admin">Administrator</option>
                            </select>
                            {isUpdating === u.id && (
                              <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            )}
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize ${
                              u.role === 'admin'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : u.role === 'agent'
                                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                            title="Agent View: Read-only access"
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

                      {/* Active Games / Platforms */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-300">
                          {(() => {
                            const activePlatforms = new Set(
                              gameAccounts
                                .filter((g) => g.status === 'active')
                                .map((g) => (g.platformName || g.gameName || '').trim().toLowerCase())
                            ).size;
                            return `${activePlatforms} active platform${activePlatforms === 1 ? '' : 's'}`;
                          })()}
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
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="View individual profile"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Profile</span>
                          </button>

                          <button
                            onClick={() => {
                              const conv = dataService.getOrCreateConversationForCustomer(u.id, u.displayName);
                              onNavigateTab('ops_chat', { highlightConvId: conv.id });
                            }}
                            className="p-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 transition-colors cursor-pointer"
                            title="Chat with user"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            isParentAdmin ? (
                              <span
                                className="px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400/70 text-[10px] font-mono flex items-center gap-1 cursor-not-allowed"
                                title="Parent Administrator account is permanently protected from deletion"
                              >
                                <Lock className="w-2.5 h-2.5" />
                                <span>Protected</span>
                              </span>
                            ) : currentUser.id === u.id ? (
                              <span
                                className="px-2 py-1 rounded-lg bg-slate-800/50 text-slate-500 text-[10px] font-mono italic"
                                title="Active session"
                              >
                                (You)
                              </span>
                            ) : (
                              <button
                                onClick={() => setUserToDelete(u)}
                                className="px-2 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                title={`Permanently delete ${u.displayName} account`}
                              >
                                <Trash2 className="w-3 h-3 text-rose-400" />
                                <span>Delete</span>
                              </button>
                            )
                          )}
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
      {selectedUser && (() => {
        const isTargetParentAdmin =
          selectedUser.role === 'admin' &&
          (dataService.isProtectedParentAdmin(selectedUser.email, selectedUser) ||
            dataService.isProtectedParentAdmin(selectedUser.id, selectedUser) ||
            Boolean(selectedUser.isParentAdmin));
        const isSelf = currentUser.id === selectedUser.id;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => {
                setSelectedUser(null);
                setModalFeedback(null);
              }}
            />
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150 text-xs max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-inner ${
                      selectedUser.role === 'admin'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                        : selectedUser.role === 'agent'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800/80'
                    }`}
                  >
                    {selectedUser.displayName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{selectedUser.displayName}</span>
                      {isTargetParentAdmin && (
                        <span className="text-[10px] text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                          <Shield className="w-3 h-3 text-amber-400" />
                          <Lock className="w-2.5 h-2.5 text-amber-400" />
                          <span>Parent Super Admin</span>
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono truncate">{selectedUser.email}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setModalFeedback(null);
                  }}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                  aria-label="Close profile modal"
                >
                  ✕
                </button>
              </div>

              {/* Modal-specific Feedback Notice */}
              {modalFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2.5 shadow-md ${
                    modalFeedback.type === 'success'
                      ? 'bg-emerald-950/90 border border-emerald-600 text-emerald-200'
                      : 'bg-rose-950/90 border border-rose-600 text-rose-200'
                  }`}
                >
                  {modalFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{modalFeedback.text}</span>
                </div>
              )}

              {/* Balances & Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
                    <span>Available Balance</span>
                    <Wallet className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    ${(dataService.getWallet(selectedUser.id)?.availableBalance || 0).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold">
                    <span>Reserved In Vault</span>
                    <Clock className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                    ${(dataService.getWallet(selectedUser.id)?.reservedBalance || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* ROLE & OPERATIONAL ACCESS GOVERNANCE SECTION */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Role &amp; Staff Access Governance</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      selectedUser.role === 'admin'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                        : selectedUser.role === 'agent'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800/80'
                    }`}
                  >
                    {isTargetParentAdmin
                      ? 'Parent Super Admin'
                      : selectedUser.role === 'admin'
                      ? 'Administrator'
                      : selectedUser.role === 'agent'
                      ? 'Support Agent'
                      : 'Player (Customer)'}
                  </span>
                </div>

                {/* Parent Admin Security Lock Callout */}
                {isTargetParentAdmin && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded bg-amber-900/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-bold text-amber-300 flex items-center gap-1">
                        <span>Protected Parent Super Admin</span>
                      </div>
                      <div className="text-amber-200/85 text-[11px] mt-0.5 leading-relaxed">
                        Security Rule: Newly appointed administrators and staff cannot demote or alter the primary Parent Admin. This platform creator role is permanently protected against role degradation.
                      </div>
                    </div>
                  </div>
                )}

                {/* Support Agent Read-Only Callout */}
                {isAgent && (
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-200 text-xs flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded bg-cyan-900/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-bold text-cyan-300">Support Agent Authority: Read-Only</div>
                      <div className="text-cyan-200/85 text-[11px] mt-0.5 leading-relaxed">
                        Agents have full clearance to review customer profiles, balances, and game platform logins. Role modifications and promotions require Platform Administrator authority.
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Role Switcher for Administrators */}
                {isAdmin && !isTargetParentAdmin && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Change role &amp; permissions:</span>
                      {isSelf && (
                        <span className="text-[10px] text-amber-400/90 font-mono italic">
                          (Your active admin session)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Option 1: Player (Customer) */}
                      <button
                        type="button"
                        disabled={isUpdating === selectedUser.id || selectedUser.role === 'customer' || isSelf}
                        onClick={() => handleRoleChange(selectedUser, 'customer')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedUser.role === 'customer'
                            ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                        } ${
                          isUpdating === selectedUser.id || selectedUser.role === 'customer' || isSelf
                            ? 'opacity-80 cursor-default'
                            : 'cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <User className="w-4 h-4 text-indigo-400" />
                          {selectedUser.role === 'customer' ? (
                            <span className="text-[9px] font-bold text-indigo-300 bg-indigo-950 px-1.5 py-0.2 rounded border border-indigo-800">
                              Active
                            </span>
                          ) : isUpdating === selectedUser.id ? (
                            <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                          ) : null}
                        </div>
                        <div className="font-bold text-xs text-white">Player</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          Customer wallet &amp; games only
                        </div>
                      </button>

                      {/* Option 2: Support Agent */}
                      <button
                        type="button"
                        disabled={isUpdating === selectedUser.id || selectedUser.role === 'agent' || isSelf}
                        onClick={() => handleRoleChange(selectedUser, 'agent')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedUser.role === 'agent'
                            ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/50'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                        } ${
                          isUpdating === selectedUser.id || selectedUser.role === 'agent' || isSelf
                            ? 'opacity-80 cursor-default'
                            : 'cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Headphones className="w-4 h-4 text-cyan-400" />
                          {selectedUser.role === 'agent' ? (
                            <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                              Active
                            </span>
                          ) : isUpdating === selectedUser.id ? (
                            <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                          ) : null}
                        </div>
                        <div className="font-bold text-xs text-white">Support Agent</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          Chat, game IDs &amp; view profiles
                        </div>
                      </button>

                      {/* Option 3: Administrator */}
                      <button
                        type="button"
                        disabled={isUpdating === selectedUser.id || selectedUser.role === 'admin'}
                        onClick={() => handleRoleChange(selectedUser, 'admin')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedUser.role === 'admin'
                            ? 'bg-amber-950/70 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                        } ${
                          isUpdating === selectedUser.id || selectedUser.role === 'admin'
                            ? 'opacity-80 cursor-default'
                            : 'cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Shield className="w-4 h-4 text-amber-400" />
                          {selectedUser.role === 'admin' ? (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">
                              Active
                            </span>
                          ) : isUpdating === selectedUser.id ? (
                            <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                          ) : null}
                        </div>
                        <div className="font-bold text-xs text-white">Administrator</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          Full admin ops (cannot demote parent)
                        </div>
                      </button>
                    </div>

                    {isSelf && (
                      <div className="text-[11px] text-amber-300/80 bg-amber-950/30 border border-amber-800/40 p-2 rounded-lg">
                        🛡️ Self-Demotion Guard: To ensure account continuity, you cannot demote your own active administrator account.
                      </div>
                    )}

                    {selectedUser.promotedByName && (
                      <div className="text-[10px] text-slate-400 font-mono pt-1">
                        Promoted by <span className="text-white">{selectedUser.promotedByName}</span>
                        {selectedUser.promotedAt ? ` • ${new Date(selectedUser.promotedAt).toLocaleDateString()}` : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Details Grid */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">User ID:</span>
                  <span className="font-mono text-white select-all text-[11px]">{selectedUser.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-white">{selectedUser.phone || 'Not provided'}</span>
                </div>
                {selectedUser.registeredPaymentMethod && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Payment Handle:</span>
                    <span className="text-amber-300 font-mono">
                      {selectedUser.registeredPaymentDetails || selectedUser.registeredPaymentMethod}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status:</span>
                  <span className="capitalize text-emerald-400 font-semibold">{selectedUser.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Registered:</span>
                  <span className="font-mono">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Provisioned Game IDs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Gamepad2 className="w-4 h-4 text-indigo-400" />
                    <span>Assigned Game Accounts</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-300 font-mono bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full font-bold">
                      {(() => {
                        const accs = dataService.getGameAccounts(selectedUser.id);
                        const count = new Set(accs.map((ga) => (ga.platformName || ga.gameName || '').trim().toLowerCase())).size;
                        return `${count} platform${count === 1 ? '' : 's'} (1 ID per game)`;
                      })()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddGameModal(selectedUser)}
                      className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Assign ID</span>
                    </button>
                  </div>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
                  {(() => {
                    const accs = dataService.getGameAccounts(selectedUser.id);
                    if (accs.length === 0) {
                      return (
                        <div className="p-3 rounded-lg bg-slate-950 text-center text-slate-500 text-[11px] border border-slate-800/60">
                          No game accounts provisioned yet. Click "Assign ID" to configure credentials.
                        </div>
                      );
                    }
                    return accs.map((ga) => {
                      const isRevealed = Boolean(revealedPasswords[ga.id]);
                      return (
                        <div
                          key={ga.id}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-xs truncate">{ga.gameName}</span>
                              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                                {ga.platformName || 'Platform'}
                              </span>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                                  ga.status === 'active'
                                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                                    : 'text-amber-300 bg-amber-950/60 border-amber-800/40'
                                }`}
                              >
                                {ga.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 font-mono mt-1 flex flex-wrap items-center gap-2">
                              <span>
                                ID: <span className="text-amber-300 font-semibold">{ga.username}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(ga.username, `modal_u_${ga.id}`)}
                                className="text-slate-500 hover:text-white"
                                title="Copy username"
                              >
                                {copiedField === `modal_u_${ga.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <span className="text-slate-600">|</span>
                              <span>
                                Pass:{' '}
                                <span className="text-emerald-400 font-semibold">
                                  {isRevealed ? (ga.password || '•••••') : '••••••••'}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(ga.id)}
                                className="text-slate-500 hover:text-white"
                                title={isRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                              {ga.password && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(ga.password || '', `modal_p_${ga.id}`)}
                                  className="text-slate-500 hover:text-white"
                                  title="Copy password"
                                >
                                  {copiedField === `modal_p_${ga.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                              {(ga.balance || 0) > 0 && (
                                <>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-amber-400 font-semibold">${ga.balance.toFixed(2)}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditGameModal(ga)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 transition cursor-pointer"
                              title="Edit Game ID (1 ID per game)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGameAccount(ga)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                              title="Delete Game Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setModalFeedback(null);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const conv = dataService.getOrCreateConversationForCustomer(selectedUser.id, selectedUser.displayName);
                      setSelectedUser(null);
                      setModalFeedback(null);
                      onNavigateTab('ops_chat', { highlightConvId: conv.id });
                    }}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Support Chat</span>
                  </button>
                </div>

                {isAdmin && !isTargetParentAdmin && (
                  <button
                    type="button"
                    onClick={() => setUserToDelete(selectedUser)}
                    className="w-full py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/80 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete User &amp; Purge All Records</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal for Editing Single Game Account Credentials */}
      {editingGameAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setEditingGameAcc(null)} />
          <form
            onSubmit={handleSaveGameAccount}
            className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Update Game Credentials</h3>
                  <div className="text-[11px] text-slate-400">
                    {editingGameAcc.gameName} ({editingGameAcc.platformName})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingGameAcc(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300">
              ⚡ <strong>1 ID Per Game Rule:</strong> Each customer is limited to exactly one active ID per game platform.
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Game Username / ID</label>
                <input
                  type="text"
                  value={assignedUsername}
                  onChange={(e) => setAssignedUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Game Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.floor(1000 + Math.random() * 9000);
                      setAssignedPassword(`Pass#${rand}!`);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={assignedPassword}
                  onChange={(e) => setAssignedPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Staff Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={assignedNotes}
                  onChange={(e) => setAssignedNotes(e.target.value)}
                  placeholder="Internal notes or special player tags..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingGameAcc(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Credentials</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal for Provisioning / Assigning Game ID (Enforcing 1 ID per Game) */}
      {showAddGameModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowAddGameModal(false)} />
          <form
            onSubmit={handleSaveGameAccount}
            className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Assign Game Account ID</h3>
                  <div className="text-[11px] text-slate-400">Player: {selectedUser.displayName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGameModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Check if user already has an account for the selected game */}
            {(() => {
              const catalog = dataService.getGameCatalog();
              const selGame = catalog.find((g) => g.id === selectedGameCatalogId);
              const userAccounts = dataService.getGameAccounts(selectedUser.id);
              const existingForGame = userAccounts.find(
                (a) =>
                  a.gameCatalogId === selectedGameCatalogId ||
                  (selGame && a.gameName.toLowerCase().trim() === selGame.title.toLowerCase().trim())
              );

              if (existingForGame) {
                return (
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Existing Account Found ({existingForGame.gameName})</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Current ID: <strong className="text-amber-300 font-mono">{existingForGame.username}</strong>.
                      Saving will update these credentials. In compliance with platform policy, multiple IDs for the same game are prohibited.
                    </p>
                  </div>
                );
              }
              return (
                <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300">
                  Assigning credentials establishes the user's authoritative single login for this game platform.
                </div>
              );
            })()}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Select Game Title</label>
                <select
                  value={selectedGameCatalogId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedGameCatalogId(newId);
                    const sel = dataService.getGameCatalog().find((g) => g.id === newId);
                    const userAccounts = dataService.getGameAccounts(selectedUser.id);
                    const existingForGame = userAccounts.find(
                      (a) => a.gameCatalogId === newId || (sel && a.gameName.toLowerCase().trim() === sel.title.toLowerCase().trim())
                    );
                    if (existingForGame) {
                      setAssignedUsername(existingForGame.username);
                      setAssignedPassword(existingForGame.password || '');
                      setAssignedNotes(existingForGame.notes || '');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {dataService.getGameCatalog().map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.platform})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Game Username / ID</label>
                <input
                  type="text"
                  value={assignedUsername}
                  onChange={(e) => setAssignedUsername(e.target.value)}
                  placeholder="e.g. viper_07"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Game Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.floor(1000 + Math.random() * 9000);
                      setAssignedPassword(`Pass#${rand}!`);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={assignedPassword}
                  onChange={(e) => setAssignedPassword(e.target.value)}
                  placeholder="e.g. GamePass#2026!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Staff Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={assignedNotes}
                  onChange={(e) => setAssignedNotes(e.target.value)}
                  placeholder="Internal notes or notes for support chat..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddGameModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save ID</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isDeleting && setUserToDelete(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-700/80 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Delete User?</h3>
                <div className="text-xs text-rose-300/80">Irreversible Database Purge</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60 text-xs text-rose-200 leading-relaxed space-y-2">
              <p>
                You are about to completely delete <strong className="text-white">{userToDelete.displayName}</strong> (<span className="font-mono text-rose-300">{userToDelete.email}</span>).
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                <li>Purges user from Supabase Auth &amp; database</li>
                <li>Deletes wallet balance, transactions &amp; cashouts</li>
                <li>Cleans provisioned game IDs and chat records</li>
              </ul>
              <p className="font-semibold text-amber-300 text-[11px] pt-1">
                ⚠️ This action cannot be reversed.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Purging Records...' : 'Yes, Delete Completely'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
