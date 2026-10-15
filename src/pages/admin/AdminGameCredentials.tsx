import React, { useState } from 'react';
import { UserProfile, GameAccount, GameCatalogItem } from '../../types';
import { dataService } from '../../services/dataService';
import {
  Gamepad2,
  KeyRound,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  Filter,
  Send,
  Lock,
} from 'lucide-react';

interface AdminGameCredentialsProps {
  currentUser: UserProfile;
}

export const AdminGameCredentials: React.FC<AdminGameCredentialsProps> = ({ currentUser }) => {
  const isAgent = currentUser.role === 'agent';
  const isAdmin = currentUser.role === 'admin';

  const [filterType, setFilterType] = useState<'pending' | 'all' | 'active'>('pending');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal state for assigning/updating credentials
  const [editingAccount, setEditingAccount] = useState<GameAccount | null>(null);
  const [assignedUsername, setAssignedUsername] = useState('');
  const [assignedPassword, setAssignedPassword] = useState('');
  const [supportNote, setSupportNote] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const gameCatalog = dataService.getGameCatalog();
  const allAccounts = dataService.getGameAccounts();
  const users = dataService.getUsers();

  const pendingRequests = allAccounts.filter(
    (a) => a.status === 'pending_assignment' || a.status === 'pending_reset'
  );

  const togglePasswordVisibility = (accountId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenEditModal = (account: GameAccount) => {
    setEditingAccount(account);
    const player = users.find((u) => u.id === account.customerId);
    
    // If username is "Pending Assignment", suggest player display name or clean handle
    if (account.username === 'Pending Assignment' && player) {
      const cleanHandle = player.displayName.replace(/\s+/g, '').toLowerCase();
      setAssignedUsername(`${cleanHandle}_${Math.floor(100 + Math.random() * 900)}`);
    } else {
      setAssignedUsername(account.username || '');
    }

    // Pre-fill or generate initial password if none
    if (account.password) {
      setAssignedPassword(account.password);
    } else {
      handleGeneratePassword();
    }

    setSupportNote(account.notes || '');
  };

  const handleGeneratePassword = () => {
    const prefixes = ['Vault', 'Apex', 'Cyber', 'Shadow', 'Strike', 'Nova', 'Titan'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const symbols = ['#', '!', '$', '&'];
    const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
    setAssignedPassword(`${randomPrefix}${randomSym}${randomNum}`);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    if (!assignedUsername.trim() || !assignedPassword.trim()) {
      alert('Please provide both a username and password for the player.');
      return;
    }

    const res = dataService.assignOrUpdateGameCredentials({
      accountId: editingAccount.id,
      username: assignedUsername.trim(),
      password: assignedPassword.trim(),
      notes: supportNote.trim() || undefined,
      reviewerId: currentUser.id,
      reviewerName: currentUser.displayName,
    });

    if (res.success) {
      setFeedbackMsg({
        text: `Successfully provisioned credentials for ${editingAccount.gameName}! Customer notified immediately.`,
        type: 'success',
      });
      setEditingAccount(null);
      setAssignedUsername('');
      setAssignedPassword('');
      setSupportNote('');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setFeedbackMsg({ text: res.message, type: 'error' });
    }
  };

  // Filter accounts
  const filteredAccounts = allAccounts
    .filter((acc) => {
      // Status filter
      if (filterType === 'pending') {
        if (acc.status !== 'pending_assignment' && acc.status !== 'pending_reset') return false;
      } else if (filterType === 'active') {
        if (acc.status !== 'active') return false;
      }

      // Game filter
      if (selectedGameFilter !== 'all') {
        if (acc.gameCatalogId !== selectedGameFilter) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const player = users.find((u) => u.id === acc.customerId);
        const matchesPlayer = player?.displayName.toLowerCase().includes(q) || player?.email.toLowerCase().includes(q);
        const matchesGame = acc.gameName.toLowerCase().includes(q) || acc.platformName.toLowerCase().includes(q);
        const matchesUser = acc.username.toLowerCase().includes(q);
        return matchesPlayer || matchesGame || matchesUser;
      }

      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Player Game IDs &amp; Credentials Desk
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 font-semibold">
              Customer Support Operation
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customer Support specialists assign usernames &amp; passwords for games requested by players.
          </p>
        </div>

        {pendingRequests.length > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-semibold animate-pulse">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{pendingRequests.length} Pending Player Request{pendingRequests.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-[11px] underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Action Controls & Filters */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg">
            <button
              onClick={() => setFilterType('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                filterType === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pending Requests</span>
              {pendingRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-950 text-[10px] font-bold text-amber-300 flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Player Accounts ({allAccounts.length})
            </button>

            <button
              onClick={() => setFilterType('active')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active IDs
            </button>
          </div>

          {/* Game dropdown filter */}
          <select
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Catalog Games ({gameCatalog.length})</option>
            {gameCatalog.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} ({g.platform})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search player, game, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3 px-4">Player Customer</th>
                <th className="py-3 px-4">Game Title &amp; Platform</th>
                <th className="py-3 px-4">Username &amp; Credentials</th>
                <th className="py-3 px-4 text-center">Support Status</th>
                <th className="py-3 px-4 text-right">Support Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    {filterType === 'pending'
                      ? 'No pending game ID requests from players right now. All caught up!'
                      : 'No accounts match the current filters.'}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const player = users.find((u) => u.id === acc.customerId);
                  const isRevealed = !!revealedPasswords[acc.id];
                  const isPending =
                    acc.status === 'pending_assignment' || acc.status === 'pending_reset';

                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isPending ? 'bg-amber-950/15' : ''
                      }`}
                    >
                      {/* Player column */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{player?.displayName || 'Player'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {player?.email || acc.customerId}
                        </div>
                      </td>

                      {/* Game column */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-200">{acc.gameName}</div>
                        <div className="text-[10px] text-indigo-400 font-medium">
                          {acc.platformName}
                        </div>
                      </td>

                      {/* Credentials column */}
                      <td className="py-3.5 px-4 font-mono">
                        {acc.status === 'active' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-white">
                              <span className="text-[11px] text-slate-400">User:</span>
                              <span className="font-bold">{acc.username}</span>
                              <button
                                onClick={() => handleCopy(acc.username, `user_${acc.id}`)}
                                className="p-0.5 text-slate-400 hover:text-white"
                                title="Copy Username"
                              >
                                {copiedField === `user_${acc.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              <span className="text-[11px] text-slate-400">Pass:</span>
                              {isRevealed ? (
                                <span className="font-bold text-emerald-400">{acc.password || 'N/A'}</span>
                              ) : (
                                <span className="text-slate-500 font-mono">••••••••</span>
                              )}
                              <button
                                onClick={() => togglePasswordVisibility(acc.id)}
                                className="p-0.5 text-slate-400 hover:text-white"
                                title={isRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => handleCopy(acc.password || '', `pass_${acc.id}`)}
                                className="p-0.5 text-slate-400 hover:text-white"
                                title="Copy Password"
                              >
                                {copiedField === `pass_${acc.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-amber-400 font-sans text-xs italic flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {acc.status === 'pending_assignment'
                                ? 'Requested New Game ID & Password'
                                : 'Requested Password Reset'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status column */}
                      <td className="py-3.5 px-4 text-center">
                        {acc.status === 'active' ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            Active
                          </span>
                        ) : acc.status === 'pending_assignment' ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-800/50">
                            Awaiting ID
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-800/50">
                            Awaiting Reset
                          </span>
                        )}
                      </td>

                      {/* Action column */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditModal(acc)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto ${
                            isPending
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700'
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>{isPending ? 'Assign & Notify Player' : 'Update Credentials'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Assigning / Updating Credentials */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingAccount(null)}
          />
          <form
            onSubmit={handleSaveCredentials}
            className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingAccount.status === 'pending_assignment'
                      ? 'Assign New Game ID & Password'
                      : 'Update Player Credentials'}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    {editingAccount.gameName} ({editingAccount.platformName})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* Target Player Card */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Player</div>
                <div className="font-semibold text-white">
                  {users.find((u) => u.id === editingAccount.customerId)?.displayName || 'Player'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Requested At</div>
                <div className="text-slate-400 font-mono text-[11px]">
                  {new Date(editingAccount.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Assigned Game Username</label>
                <input
                  type="text"
                  value={assignedUsername}
                  onChange={(e) => setAssignedUsername(e.target.value)}
                  placeholder="e.g. apex_player_01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Assigned Game Password</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={assignedPassword}
                    onChange={(e) => setAssignedPassword(e.target.value)}
                    placeholder="e.g. ApexPass#2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Staff Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={supportNote}
                  onChange={(e) => setSupportNote(e.target.value)}
                  placeholder="Add internal note or special instructions for the customer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-[11px] text-indigo-300 leading-relaxed">
              <strong>Instant Player Synchronization:</strong> Saving immediately activates these credentials on the player's Gaming IDs page, sends an in-app alert, and sends an automated message to their support chat.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/20"
              >
                Save &amp; Notify Player
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
