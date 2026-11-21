import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpFromLine,
  Loader2,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import type {
  GameAccount,
  GameCatalogItem,
  PayoutMethodType,
  UserProfile,
  UserWallet,
  WithdrawalRequest,
} from '../../types';
import { dataService } from '../../services/dataService';
import { formatCashoutChatMessage } from '../../utils/uiCopyUtils';

interface AdminChatCashoutModalProps {
  customerId: string;
  customerName: string;
  customerProfile?: UserProfile;
  conversationId: string;
  currentUser: UserProfile;
  customerWallet?: UserWallet;
  customerGameAccounts: GameAccount[];
  gameCatalog: GameCatalogItem[];
  customerWithdrawals: WithdrawalRequest[];
  onClose: () => void;
  onSuccess: (toastText: string) => void;
}

type CashoutModalTab = 'create' | 'pending' | 'link';

const PAYOUT_CHANNEL_OPTIONS: Array<{ value: PayoutMethodType | 'manual_support'; label: string }> = [
  { value: 'cashapp', label: 'CashApp' },
  { value: 'chime', label: 'Chime Direct' },
  { value: 'crypto', label: 'Crypto (BTC / ETH / USDT)' },
  { value: 'payment_link', label: 'Payment via Link' },
  { value: 'manual_support', label: 'Manual Support Desk' },
];

export const AdminChatCashoutModal: React.FC<AdminChatCashoutModalProps> = ({
  customerId,
  customerName,
  customerProfile,
  conversationId,
  currentUser,
  customerWallet,
  customerGameAccounts,
  gameCatalog,
  customerWithdrawals,
  onClose,
  onSuccess,
}) => {
  const pendingWithdrawals = useMemo(
    () =>
      customerWithdrawals.filter(
        (w) => w.status === 'submitted' || w.status === 'processing' || w.status === 'pending'
      ),
    [customerWithdrawals]
  );

  const [activeTab, setActiveTab] = useState<CashoutModalTab>(() =>
    pendingWithdrawals.length > 0 ? 'pending' : 'create'
  );

  // Pending Queue approval states
  const [cashoutActionNote, setCashoutActionNote] = useState('');
  const [pendingPayoutRef, setPendingPayoutRef] = useState('');

  // Create Emergency Cashout form states
  const registeredMethodInfo = useMemo(
    () => dataService.getUserRegisteredMethod(customerId),
    [customerId]
  );

  const gameOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{
      catalogId: string;
      gameName: string;
      username?: string;
    }> = [];

    for (const acc of customerGameAccounts.filter((g) => g.status === 'active')) {
      const id = acc.gameCatalogId || acc.gameId || acc.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      options.push({
        catalogId: id,
        gameName: acc.gameName || 'Game',
        username: acc.username,
      });
    }

    for (const g of gameCatalog) {
      if (!g.id || seen.has(g.id)) continue;
      seen.add(g.id);
      const matching = customerGameAccounts.find((a) => a.gameCatalogId === g.id);
      options.push({
        catalogId: g.id,
        gameName: g.title || 'Game',
        username: matching?.username,
      });
    }

    return options;
  }, [customerGameAccounts, gameCatalog]);

  const [recordStatus, setRecordStatus] = useState<'completed' | 'submitted'>('completed');
  const [selectedGameId, setSelectedGameId] = useState<string>(
    () => gameOptions[0]?.catalogId || ''
  );
  const [payoutMethod, setPayoutMethod] = useState<string>(() => {
    const detected = registeredMethodInfo.method || customerProfile?.registeredPaymentMethod;
    if (
      detected &&
      PAYOUT_CHANNEL_OPTIONS.some((o) => o.value === detected)
    ) {
      return detected;
    }
    return 'cashapp';
  });
  const [payoutHandle, setPayoutHandle] = useState<string>(
    () => registeredMethodInfo.details || customerProfile?.registeredPaymentDetails || ''
  );
  const [amount, setAmount] = useState<string>('100');
  const [feeAmount, setFeeAmount] = useState<string>('0');
  const [payoutReference, setPayoutReference] = useState<string>('');
  const [staffNotes, setStaffNotes] = useState<string>('');
  const [postToChat, setPostToChat] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSubmitting, onClose]);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedFee = Math.max(0, parseFloat(feeAmount) || 0);
  const computedNetPayout = Math.max(0, Number((parsedAmount - parsedFee).toFixed(2)));
  const selectedGame = gameOptions.find((g) => g.catalogId === selectedGameId);
  const selectedChannelOption =
    PAYOUT_CHANNEL_OPTIONS.find((o) => o.value === payoutMethod) || PAYOUT_CHANNEL_OPTIONS[0];

  const handleApprovePendingCashout = async (req: WithdrawalRequest) => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const refCode =
        pendingPayoutRef.trim() || `WIRE_${Date.now().toString().slice(-6)}`;
      const res = await dataService.updateWithdrawalStatusAsync({
        requestId: req.id,
        newStatus: 'completed',
        reviewerId: currentUser.id,
        reviewerName: currentUser.displayName,
        note: cashoutActionNote.trim() || 'Approved directly via Customer Care live chat',
        payoutReference: refCode,
      });

      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      dataService.sendChatMessage({
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderRole: 'agent',
        text: formatCashoutChatMessage({
          amount: req.amount,
          netPayout: req.netPayout,
          methodName: req.methodName,
          gameName: req.sourceGameName,
          status: 'completed',
          payoutReference: refCode,
        }),
        isInternalNote: false,
      });

      onSuccess(`Withdrawal #${req.id.slice(-6)} for $${req.amount.toFixed(2)} approved & completed!`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to approve withdrawal request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEmergencyCashout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (parsedAmount <= 0) {
      setErrorMessage('Please enter a valid cashout amount greater than $0.00.');
      return;
    }

    if (parsedFee >= parsedAmount) {
      setErrorMessage('Fee cannot equal or exceed the gross cashout amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await dataService.createStaffWithdrawalAsync({
        customerId,
        customerName,
        reviewerId: currentUser.id,
        reviewerName: currentUser.displayName,
        amount: parsedAmount,
        feeAmount: parsedFee,
        method: payoutMethod,
        methodName: selectedChannelOption.label,
        payoutHandle: payoutHandle.trim() || undefined,
        payoutReference: payoutReference.trim() || undefined,
        sourceGameCatalogId: selectedGame?.catalogId,
        sourceGameName: selectedGame?.gameName,
        sourceGameUsername: selectedGame?.username || customerName,
        notes: staffNotes.trim() || undefined,
        status: recordStatus,
        postToChat,
      });

      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      onSuccess(
        postToChat
          ? res.message
          : `${res.message} (Saved silently without posting to chat)`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error while saving emergency cashout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCashoutLink = () => {
    dataService.sendChatMessage({
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderRole: 'agent',
      text: `💸 Ready to Cash Out? Available: $${(customerWallet?.availableBalance || 0).toFixed(2)}\nOpen Request Cashout to submit.`,
      isInternalNote: false,
    });
    onSuccess('Cashout inquiry sent to player.');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto overscroll-contain space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <ArrowUpFromLine className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">
                Cashout Desk &amp; Emergency Record
              </h3>
              <div className="text-[11px] text-slate-400 truncate">
                Player: {customerName}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balances Summary */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">
              Available Balance
            </span>
            <div className="text-base font-bold text-white font-mono tabular-nums">
              ${(customerWallet?.availableBalance || 0).toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">
              Reserved In Vault
            </span>
            <div className="text-base font-bold text-amber-400 font-mono tabular-nums">
              ${(customerWallet?.reservedBalance || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setActiveTab('create');
            }}
            className={`py-2 px-2.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Record
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setActiveTab('pending');
            }}
            className={`py-2 px-2.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({pendingWithdrawals.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setActiveTab('link');
            }}
            className={`py-2 px-2.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'link'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Send Link
          </button>
        </div>

        {activeTab === 'pending' && (
          <div className="space-y-3 text-xs">
            {pendingWithdrawals.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-2">
                <div className="font-semibold text-white">No pending cashout requests</div>
                <p className="text-[11px] text-slate-400">
                  Use <strong className="text-amber-300">Create Record</strong> to log an emergency or chat-settled cashout directly for this player.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Create Emergency Cashout
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="pending-wdr-note" className="text-slate-300 font-semibold block">
                      Approval Wire Note
                    </label>
                    <input
                      id="pending-wdr-note"
                      type="text"
                      value={cashoutActionNote}
                      onChange={(e) => setCashoutActionNote(e.target.value)}
                      placeholder="e.g. Paid via CashApp"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="pending-wdr-ref" className="text-slate-300 font-semibold block">
                      Payout Ref / Hash (Optional)
                    </label>
                    <input
                      id="pending-wdr-ref"
                      type="text"
                      value={pendingPayoutRef}
                      onChange={(e) => setPendingPayoutRef(e.target.value)}
                      placeholder="Auto-generated if blank"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {pendingWithdrawals.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-300 font-mono">
                          Pending #{req.id.slice(-6)}
                        </span>
                        <span className="font-mono tabular-nums text-emerald-400 font-bold">
                          ${req.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Channel: {req.methodName}</span>
                        {req.sourceGameName && <span>Game: {req.sourceGameName}</span>}
                        {req.payoutDetails?.payoutHandle && (
                          <span className="font-mono text-amber-200">
                            Dest: {req.payoutDetails.payoutHandle}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleApprovePendingCashout(req)}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Completing Payout...' : 'Authorize & Complete Payout'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <form onSubmit={handleCreateEmergencyCashout} className="space-y-3 text-xs">
            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Emergency Staff Entry bypasses email verification and prior-deposit channel locks so chat-settled cashouts can always be recorded.
              </span>
            </div>

            {/* Record Status Mode */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecordStatus('completed')}
                className={`p-2.5 rounded-xl border text-left transition-colors ${
                  recordStatus === 'completed'
                    ? 'bg-emerald-950/50 border-emerald-600 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs text-white">Already Completed</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Log paid-out cashout &amp; finalize ledger
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRecordStatus('submitted')}
                className={`p-2.5 rounded-xl border text-left transition-colors ${
                  recordStatus === 'submitted'
                    ? 'bg-amber-950/50 border-amber-500 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs text-white">Pending Request</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Queue cashout request for later payout
                </div>
              </button>
            </div>

            {/* Source Game & Payout Channel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="staff-wdr-game" className="text-slate-300 font-semibold block">
                  Source Game Platform
                </label>
                <select
                  id="staff-wdr-game"
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">General / Unspecified Game</option>
                  {gameOptions.map((g) => (
                    <option key={g.catalogId} value={g.catalogId}>
                      {g.gameName}
                      {g.username ? ` · ID: ${g.username}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="staff-wdr-method" className="text-slate-300 font-semibold block">
                  Payout Channel
                </label>
                <select
                  id="staff-wdr-method"
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  {PAYOUT_CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount & Fee */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="staff-wdr-amount" className="text-slate-300 font-semibold block">
                  Gross Cashout ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono">$</span>
                  <input
                    id="staff-wdr-amount"
                    type="number"
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-white font-mono tabular-nums font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="staff-wdr-fee" className="text-slate-300 font-semibold block">
                  Fee Deduction ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono">$</span>
                  <input
                    id="staff-wdr-fee"
                    type="number"
                    min="0"
                    step="any"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-white font-mono tabular-nums font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Net Payout Strip */}
            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                Gross <span className="font-mono tabular-nums text-white">${parsedAmount.toFixed(2)}</span>
                {parsedFee > 0 && (
                  <>
                    {' '}
                    − Fee <span className="font-mono tabular-nums text-rose-400">${parsedFee.toFixed(2)}</span>
                  </>
                )}
              </span>
              <span className="font-mono tabular-nums font-bold text-amber-400">
                Net Payout: ${computedNetPayout.toFixed(2)}
              </span>
            </div>

            {/* Payout Destination & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="staff-wdr-handle" className="text-slate-300 font-semibold block">
                  Recipient Handle / Address
                </label>
                <input
                  id="staff-wdr-handle"
                  type="text"
                  value={payoutHandle}
                  onChange={(e) => setPayoutHandle(e.target.value)}
                  placeholder="e.g. $cashtag or wallet"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="staff-wdr-ref" className="text-slate-300 font-semibold block">
                  Payout Ref / Hash (Optional)
                </label>
                <input
                  id="staff-wdr-ref"
                  type="text"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder="Auto-generated if completed"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Staff Audit Note */}
            <div className="space-y-1">
              <label htmlFor="staff-wdr-note" className="text-slate-300 font-semibold block">
                Staff Audit Note (Optional)
              </label>
              <input
                id="staff-wdr-note"
                type="text"
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="e.g. Player cashed out directly via live chat"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Chat Visibility Toggle */}
            <label
              htmlFor="staff-wdr-post-chat"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors"
            >
              <input
                id="staff-wdr-post-chat"
                type="checkbox"
                checked={postToChat}
                onChange={(e) => setPostToChat(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <div className="font-semibold text-white text-xs">
                  Post transaction summary card in chat
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Uncheck to save silently to database and customer wallet history without posting in this chat.
                </div>
              </div>
            </label>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-colors shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  recordStatus === 'completed'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Cashout...</span>
                  </>
                ) : recordStatus === 'completed' ? (
                  <span>Log Completed Cashout (${computedNetPayout.toFixed(2)})</span>
                ) : (
                  <span>Create Pending Cashout</span>
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'link' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-1">
              <div className="font-medium text-white">Send Cashout Invitation to {customerName}</div>
              <p className="text-[11px] text-slate-400">
                Posts a helpful message in chat letting the player know they can submit a CashApp, Chime, or Crypto cashout request.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendCashoutLink}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Cashout Link to Player</span>
              </button>
            </div>
          </div>
        )}

        {activeTab !== 'create' && errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
