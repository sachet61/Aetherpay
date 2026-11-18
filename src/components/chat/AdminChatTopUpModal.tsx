import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  Loader2,
  Send,
  Upload,
  X,
} from 'lucide-react';
import type {
  GameAccount,
  GameCatalogItem,
  PaymentMethodType,
  UserProfile,
  UserWallet,
} from '../../types';
import { dataService } from '../../services/dataService';
import { storageService } from '../../services/storageService';
import { validateImageFile } from '../../utils/uploadUtils';
import { getDefaultBonusPercentageForMethod } from '../../services/walletActivityUtils';

interface AdminChatTopUpModalProps {
  customerId: string;
  customerName: string;
  conversationId: string;
  currentUser: UserProfile;
  customerWallet?: UserWallet;
  customerGameAccounts: GameAccount[];
  gameCatalog: GameCatalogItem[];
  onClose: () => void;
  onSuccess: (toastText: string) => void;
}

type TopUpModalMode = 'completed' | 'submitted' | 'prompt';

export const AdminChatTopUpModal: React.FC<AdminChatTopUpModalProps> = ({
  customerId,
  customerName,
  conversationId,
  currentUser,
  customerWallet,
  customerGameAccounts,
  gameCatalog,
  onClose,
  onSuccess,
}) => {
  const config = useMemo(() => dataService.getAppConfig(), []);
  const configuredMethods = config.paymentMethods || [];

  const activeGameAccounts = useMemo(
    () => customerGameAccounts.filter((g) => g.status === 'active'),
    [customerGameAccounts]
  );

  // Ordered game choices: player's active game IDs first, then remaining catalog games
  const gameOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{
      catalogId: string;
      gameName: string;
      username?: string;
      hasActiveId: boolean;
    }> = [];

    for (const acc of activeGameAccounts) {
      const id = acc.gameCatalogId || acc.gameId || acc.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      options.push({
        catalogId: id,
        gameName: acc.gameName || 'Game',
        username: acc.username,
        hasActiveId: true,
      });
    }

    for (const g of gameCatalog) {
      if (!g.id || seen.has(g.id)) continue;
      seen.add(g.id);
      const matchingAcc = customerGameAccounts.find((a) => a.gameCatalogId === g.id);
      options.push({
        catalogId: g.id,
        gameName: g.title || 'Game',
        username: matchingAcc?.username,
        hasActiveId: Boolean(matchingAcc && matchingAcc.status === 'active'),
      });
    }

    return options;
  }, [activeGameAccounts, customerGameAccounts, gameCatalog]);

  const paymentChannelOptions = useMemo(() => {
    const base = configuredMethods.map((m) => ({
      type: m.type as PaymentMethodType,
      name: m.name,
      bonusPercentage: getDefaultBonusPercentageForMethod(m.type, configuredMethods),
    }));
    if (!base.some((m) => m.type === 'manual_receipt')) {
      base.push({
        type: 'manual_receipt',
        name: 'Direct Support Desk',
        bonusPercentage: 0,
      });
    }
    return base;
  }, [configuredMethods]);

  const [mode, setMode] = useState<TopUpModalMode>('completed');
  const [selectedGameId, setSelectedGameId] = useState<string>(
    () => gameOptions[0]?.catalogId || ''
  );
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>(
    () => (paymentChannelOptions[0]?.type as PaymentMethodType) || 'cashapp'
  );
  const [amount, setAmount] = useState<string>('100');
  const [bonusPercent, setBonusPercent] = useState<string>(() =>
    String(
      getDefaultBonusPercentageForMethod(
        (paymentChannelOptions[0]?.type as PaymentMethodType) || 'cashapp',
        configuredMethods
      )
    )
  );
  const [bonusTouched, setBonusTouched] = useState(false);
  const [providerRef, setProviderRef] = useState<string>('');
  const [staffNotes, setStaffNotes] = useState<string>('');
  const [postToChat, setPostToChat] = useState<boolean>(true);

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSubmitting, onClose]);

  const handleMethodChange = (nextMethod: PaymentMethodType) => {
    setSelectedMethod(nextMethod);
    if (!bonusTouched) {
      const nextDefault = getDefaultBonusPercentageForMethod(nextMethod, configuredMethods);
      setBonusPercent(String(nextDefault));
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Unsupported screenshot file.');
      if (proofInputRef.current) proofInputRef.current.value = '';
      return;
    }

    setReceiptName(file.name);
    setIsUploadingProof(true);

    try {
      const res = await storageService.uploadPaymentProof(file, customerId);
      if (res.success && res.url) {
        setReceiptUrl(res.url);
        setReceiptName(res.name || file.name);
      } else {
        setErrorMessage(res.error || 'Failed to upload payment proof screenshot.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to upload payment proof image.');
    } finally {
      setIsUploadingProof(false);
      if (proofInputRef.current) proofInputRef.current.value = '';
    }
  };

  const selectedGame = gameOptions.find((g) => g.catalogId === selectedGameId);
  const selectedChannel =
    paymentChannelOptions.find((m) => m.type === selectedMethod) || paymentChannelOptions[0];

  const parsedAmount = parseFloat(amount) || 0;
  const parsedBonusPct = Math.max(0, parseFloat(bonusPercent) || 0);
  const computedBonusAmount =
    parsedAmount > 0 ? Number(((parsedAmount * parsedBonusPct) / 100).toFixed(2)) : 0;
  const computedTotalCredit = Number((parsedAmount + computedBonusAmount).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isUploadingProof) return;
    setErrorMessage(null);

    if (parsedAmount <= 0) {
      setErrorMessage('Please enter a valid deposit amount greater than $0.00.');
      return;
    }

    if (mode === 'prompt') {
      dataService.sendChatMessage({
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderRole: 'agent',
        text: `Here is the expedited Top-Up link for $${parsedAmount.toFixed(2)}${selectedGame ? ` on ${selectedGame.gameName}` : ''}. Please click below to complete your deposit.`,
        isInternalNote: false,
      });
      onSuccess(`Deposit link prompt for $${parsedAmount.toFixed(2)} sent to chat.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await dataService.createStaffTopUpAsync({
        customerId,
        customerName,
        reviewerId: currentUser.id,
        reviewerName: currentUser.displayName,
        amount: parsedAmount,
        bonusPercentage: parsedBonusPct,
        method: selectedMethod,
        methodName: selectedChannel?.name || 'Direct Support Desk',
        targetGameCatalogId: selectedGame?.catalogId,
        targetGameName: selectedGame?.gameName,
        targetGameUsername: selectedGame?.username || customerName,
        providerRef: providerRef.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
        receiptName: receiptName || undefined,
        notes: staffNotes.trim() || undefined,
        status: mode === 'completed' ? 'completed' : 'submitted',
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
      setErrorMessage(err?.message || 'Unexpected error while saving deposit record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto overscroll-contain space-y-4 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <ArrowDownToLine className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">Top-Up Record &amp; Assistance</h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="truncate">{customerName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {activeGameAccounts.length} Active Game {activeGameAccounts.length === 1 ? 'ID' : 'IDs'}
                </span>
                {customerWallet && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-emerald-400">
                      Last: ${(customerWallet.lastTopUpAmount || 0).toFixed(2)}
                    </span>
                  </>
                )}
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

        {/* Action Mode Segmented Control */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setMode('completed')}
            className={`py-2 px-2.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              mode === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Log Completed
          </button>
          <button
            type="button"
            onClick={() => setMode('submitted')}
            className={`py-2 px-2.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              mode === 'submitted'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Pending
          </button>
          <button
            type="button"
            onClick={() => setMode('prompt')}
            className={`py-2 px-2.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              mode === 'prompt'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Send Link
          </button>
        </div>

        {mode === 'prompt' ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="topup-prompt-amount" className="text-slate-300 font-semibold block">
                  Suggested Deposit ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono">$</span>
                  <input
                    id="topup-prompt-amount"
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-white font-mono tabular-nums font-bold focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="topup-prompt-game" className="text-slate-300 font-semibold block">
                  Target Game (Optional)
                </label>
                <select
                  id="topup-prompt-game"
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Any / General Top-Up</option>
                  {gameOptions.map((g) => (
                    <option key={g.catalogId} value={g.catalogId}>
                      {g.gameName}
                      {g.username ? ` (${g.username})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              Sends a quick deposit invitation message directly to {customerName} in chat. No request or ledger entry is created until the customer submits payment.
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            {/* Game & Channel Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="staff-topup-game" className="text-slate-300 font-semibold block">
                  Target Game Platform
                </label>
                <select
                  id="staff-topup-game"
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">General / Unspecified Game</option>
                  {gameOptions.map((g) => (
                    <option key={g.catalogId} value={g.catalogId}>
                      {g.gameName}
                      {g.username ? ` · ID: ${g.username}` : ' · No ID yet'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="staff-topup-method" className="text-slate-300 font-semibold block">
                  Payment Channel
                </label>
                <select
                  id="staff-topup-method"
                  value={selectedMethod}
                  onChange={(e) => handleMethodChange(e.target.value as PaymentMethodType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  {paymentChannelOptions.map((ch) => (
                    <option key={ch.type} value={ch.type}>
                      {ch.name} ({ch.bonusPercentage}% promo)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount & Bonus Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="staff-topup-amount" className="text-slate-300 font-semibold block">
                  Base Deposit ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono">$</span>
                  <input
                    id="staff-topup-amount"
                    type="number"
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-white font-mono tabular-nums font-bold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="staff-topup-bonus" className="text-slate-300 font-semibold">
                    Bonus (%)
                  </label>
                  {bonusTouched && (
                    <button
                      type="button"
                      onClick={() => {
                        setBonusTouched(false);
                        setBonusPercent(
                          String(
                            getDefaultBonusPercentageForMethod(selectedMethod, configuredMethods)
                          )
                        );
                      }}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Reset default
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="staff-topup-bonus"
                    type="number"
                    min="0"
                    max="500"
                    step="any"
                    value={bonusPercent}
                    onChange={(e) => {
                      setBonusTouched(true);
                      setBonusPercent(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-7 py-2 text-white font-mono tabular-nums font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-mono">%</span>
                </div>
              </div>
            </div>

            {/* Live Calculation Summary */}
            <div className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="text-slate-400">
                Base{' '}
                <span className="font-mono tabular-nums text-white font-semibold">
                  ${parsedAmount.toFixed(2)}
                </span>{' '}
                + Bonus{' '}
                <span className="font-mono tabular-nums text-amber-400 font-semibold">
                  ${computedBonusAmount.toFixed(2)} ({parsedBonusPct}%)
                </span>
              </div>
              <div className="text-emerald-400 font-bold font-mono tabular-nums">
                Total Credit: ${computedTotalCredit.toFixed(2)}
              </div>
            </div>

            {/* Payment Reference & Staff Audit Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="staff-topup-ref" className="text-slate-300 font-semibold block">
                  Sender Tag / Tx Ref (Optional)
                </label>
                <input
                  id="staff-topup-ref"
                  type="text"
                  value={providerRef}
                  onChange={(e) => setProviderRef(e.target.value)}
                  placeholder="e.g. $playerTag or TxHash"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="staff-topup-note" className="text-slate-300 font-semibold block">
                  Staff Audit Note (Optional)
                </label>
                <input
                  id="staff-topup-note"
                  type="text"
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="e.g. Settled earlier in chat"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Optional Payment Receipt Screenshot */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">
                  Payment Receipt Screenshot{' '}
                  <span className="text-slate-500 font-normal">(Optional for Staff)</span>
                </span>
                {receiptUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptUrl(null);
                      setReceiptName('');
                    }}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Remove attachment
                  </button>
                )}
              </div>

              <input
                ref={proofInputRef}
                type="file"
                accept="image/*"
                onChange={handleProofUpload}
                className="hidden"
              />

              {receiptUrl ? (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <img
                    src={receiptUrl}
                    alt={receiptName || 'Uploaded receipt'}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-white truncate">
                      {receiptName || 'payment_proof.png'}
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      Screenshot attached to record
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUploadingProof}
                  onClick={() => proofInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 bg-slate-950/60 text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isUploadingProof ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Uploading screenshot...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span>Attach Optional Proof Screenshot</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Chat Visibility Toggle */}
            <label
              htmlFor="staff-topup-post-chat"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors"
            >
              <input
                id="staff-topup-post-chat"
                type="checkbox"
                checked={postToChat}
                onChange={(e) => setPostToChat(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <div className="font-semibold text-white text-xs">
                  Post transaction summary card in chat
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Uncheck to save silently to database, wallet, and customer ledger without posting a message in this chat.
                </div>
              </div>
            </label>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer Buttons */}
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
            disabled={isSubmitting || isUploadingProof}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-colors shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 ${
              mode === 'prompt'
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                : mode === 'submitted'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Record...</span>
              </>
            ) : mode === 'prompt' ? (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Link to Chat</span>
              </>
            ) : mode === 'submitted' ? (
              <span>Create Pending Request</span>
            ) : (
              <span>Log &amp; Credit ${computedTotalCredit.toFixed(2)}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
