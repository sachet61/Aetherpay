import React, { useEffect, useRef, useState } from 'react';
import { UserProfile, UserWallet, PaymentMethodType } from '../../types';
import { dataService } from '../../services/dataService';
import { telegramService } from '../../services/telegramService';
import { storageService } from '../../services/storageService';
import {
  clearTopUpDraft,
  loadTopUpDraft,
  saveTopUpDraft,
  validateImageFile,
} from '../../utils/uploadUtils';
import { formatTopUpSubmittedChatMessage } from '../../utils/uiCopyUtils';
import {
  ArrowDownToLine,
  CreditCard,
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Upload,
  Sparkles,
  Info,
  Gamepad2,
  ExternalLink,
  QrCode,
  DollarSign,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  X,
  Download,
  Loader2,
  ZoomIn,
} from 'lucide-react';

interface CustomerTopUpProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string, meta?: any) => void;
  prefilledAmount?: number;
  preselectedGameCatalogId?: string;
}

export const CustomerTopUp: React.FC<CustomerTopUpProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
  prefilledAmount,
  preselectedGameCatalogId,
}) => {
  const config = dataService.getAppConfig();
  const gameCatalog = dataService.getGameCatalog();
  const gameAccounts = dataService.getGameAccounts(currentUser.id);
  const activeGameAccounts = gameAccounts.filter((g) => g.status === 'active');

  const initialDraft = React.useMemo(
    () =>
      typeof window !== 'undefined'
        ? loadTopUpDraft(window.sessionStorage, currentUser.id)
        : null,
    [currentUser.id]
  );

  const [fundingMode, setFundingMode] = useState<'gateway_payment' | 'free_play' | 'referral_rewards'>(
    () => initialDraft?.fundingMode || 'gateway_payment'
  );

  // Game Choose: User selects game. Can select from registered game accounts or catalog
  const [selectedGameCatalogId, setSelectedGameCatalogId] = useState<string>(
    () =>
      preselectedGameCatalogId ||
      initialDraft?.selectedGameCatalogId ||
      activeGameAccounts[0]?.gameCatalogId ||
      gameCatalog[0]?.id ||
      ''
  );

  // Exactly 4 supported methods
  const [selectedMethodType, setSelectedMethodType] = useState<PaymentMethodType>(
    () => initialDraft?.selectedMethodType || 'cashapp'
  );
  const [selectedCryptoCoin, setSelectedCryptoCoin] = useState<'BTC' | 'ETH' | 'USDT'>(
    () => initialDraft?.selectedCryptoCoin || 'USDT'
  );
  const [amount, setAmount] = useState<string>(prefilledAmount ? String(prefilledAmount) : '100');
  const [freePlayAmount, setFreePlayAmount] = useState<string>(() =>
    (wallet.freePlayBalance || 0) > 0 ? String(Number((wallet.freePlayBalance || 0).toFixed(2))) : '5'
  );
  const [referralAmount, setReferralAmount] = useState<string>(
    () =>
      initialDraft?.referralAmount ||
      String(Math.min(wallet.referralBonusBalance || 0, 50) || 25)
  );

  // Form input states
  const [customerCashtag, setCustomerCashtag] = useState(currentUser.registeredPaymentDetails || '');
  const [chimeHandleOrProof, setChimeHandleOrProof] = useState('');
  const [linkPaymentRef, setLinkPaymentRef] = useState('');
  const [cryptoTxHash, setCryptoTxHash] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Screenshot upload state for Admin verification
  const [screenshotFile, setScreenshotFile] = useState<string | null>(
    () => initialDraft?.screenshotUrl || null
  );
  const [screenshotName, setScreenshotName] = useState<string>(
    () => initialDraft?.screenshotName || ''
  );
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingScreenshot, setIsDraggingScreenshot] = useState(false);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Persist Top-Up draft in sessionStorage so OS-level mobile tab discards/restores keep user inputs & proof URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    saveTopUpDraft(window.sessionStorage, currentUser.id, {
      fundingMode: fundingMode === 'free_play' ? 'gateway_payment' : fundingMode,
      selectedGameCatalogId,
      selectedMethodType,
      selectedCryptoCoin,
      referralAmount,
      screenshotUrl: screenshotFile,
      screenshotName,
    });
  }, [
    currentUser.id,
    fundingMode,
    selectedGameCatalogId,
    selectedMethodType,
    selectedCryptoCoin,
    referralAmount,
    screenshotFile,
    screenshotName,
  ]);

  // Find target game item - either active game account or catalog game
  const targetAccount = gameAccounts.find((g) => g.gameCatalogId === selectedGameCatalogId);
  const targetCatalogGame = gameCatalog.find((g) => g.id === selectedGameCatalogId);
  const targetGameName = targetAccount?.gameName || targetCatalogGame?.title || 'Selected Game';

  const currentMethod =
    config.paymentMethods.find((m) => m.type === selectedMethodType) ||
    config.paymentMethods[0];

  const parsedFreePlayAmount = Number((parseFloat(freePlayAmount) || 0).toFixed(2));
  const parsedRefAmount = Number((parseFloat(referralAmount) || 0).toFixed(2));

  // Dynamic Bonus Calculation:
  // Via Link: 20%
  // Verified CashApp: 30%
  // Chime Direct: 15%
  // Crypto Payment: 30%
  const dynamicBonusPercent = currentMethod?.bonusPercentage || (
    selectedMethodType === 'cashapp' ? 30 :
    selectedMethodType === 'crypto' ? 30 :
    selectedMethodType === 'payment_link' ? 20 :
    selectedMethodType === 'chime' ? 15 : 0
  );

  const topUpHistory = dataService.getTopUpRequests(currentUser.id);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const processScreenshotFile = async (file: File) => {
    setUploadError(null);
    setErrorMessage(null);
    setPreviewLoadFailed(false);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Please select a valid image file (PNG, JPG, or WebP).');
      return;
    }

    setScreenshotName(file.name);
    setIsUploadingScreenshot(true);
    try {
      const res = await storageService.uploadPaymentProof(file, currentUser.id);
      if (res.success && res.url) {
        setScreenshotFile(res.url);
        setScreenshotName(res.name || file.name);
      } else {
        setUploadError(
          res.error || 'Screenshot upload failed. Your form selections are preserved — please retry.'
        );
      }
    } catch (err: any) {
      setUploadError(
        err?.message || 'Unable to upload payment screenshot. Please check your connection and try again.'
      );
    } finally {
      setIsUploadingScreenshot(false);
      if (screenshotInputRef.current) {
        screenshotInputRef.current.value = '';
      }
    }
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processScreenshotFile(file);
  };

  const handleScreenshotDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDraggingScreenshot(true);
    } else if (e.type === 'dragleave') {
      setIsDraggingScreenshot(false);
    }
  };

  const handleScreenshotDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingScreenshot(false);
    if (isUploadingScreenshot) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processScreenshotFile(file);
    }
  };

  // Pre-configured manual crypto addresses
  const cryptoAddresses = {
    BTC: currentMethod?.btcAddress || 'bc1q9v04x73y2fepz5r64h42qj0z8n0n9s3t0vx6m9',
    ETH: currentMethod?.ethAddress || '0x71C8705a2B8841738734007b8b200b39645F33C4',
    USDT: currentMethod?.usdtAddress || 'TX7nLw6U8R91kpm2XkHqa98yY117SwiftSweeps',
  };

  const paymentViaLinkUrl = currentMethod?.type === 'payment_link' && currentMethod.forwardUrl
    ? currentMethod.forwardUrl
    : 'http://www.keyhubsolutions.com/c/Jhaukhel';

  const cashAppForwardUrl = currentMethod?.type === 'cashapp' && currentMethod.forwardUrl
    ? currentMethod.forwardUrl
    : 'http://www.keyhubsolutions.com/l/Jhaukhel';

  const chimeHandle = currentMethod?.chimeHandle || '$SwiftSweepsVault';
  const chimeQrUrl =
    currentMethod?.chimeQrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=chime://send/${encodeURIComponent(chimeHandle)}`;

  const [showChimeQrModal, setShowChimeQrModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [downloadingChimeQr, setDownloadingChimeQr] = useState(false);

  const handleDownloadChimeQr = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setDownloadingChimeQr(true);
      const res = await fetch(chimeQrUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Chime_QR_${chimeHandle.replace(/[^a-zA-Z0-9]/g, '') || 'SwiftSweeps'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      const link = document.createElement('a');
      link.href = chimeQrUrl;
      link.target = '_blank';
      link.download = 'Chime_QR_SwiftSweeps.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingChimeQr(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Branch A1: Wheel of Luck Free-Play Load
    if (fundingMode === 'free_play') {
      if (parsedFreePlayAmount <= 0) {
        setErrorMessage('Please enter a Free-Play credit amount greater than $0.00.');
        return;
      }
      if (parsedFreePlayAmount > (wallet.freePlayBalance || 0)) {
        setErrorMessage(
          `Insufficient Free-Play balance ($${(wallet.freePlayBalance || 0).toFixed(2)}).`
        );
        return;
      }
      if (!targetAccount || targetAccount.status !== 'active') {
        setErrorMessage(
          `An active Gaming ID for "${targetGameName}" is required before loading Free-Play credits. Request or activate it in Gaming IDs first.`
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await dataService.transferGameCreditsAsync({
          gameAccountId: targetAccount.id,
          gameCatalogId: selectedGameCatalogId,
          direction: 'load',
          source: 'free_play',
          amount: parsedFreePlayAmount,
        });
        if (res.success) {
          setSuccessMessage(
            `Free-Play Loaded! $${parsedFreePlayAmount.toFixed(2)} loaded to ${targetGameName} (${targetAccount.username}). Support has been notified for manual game confirmation.`
          );
          const remainingFp = Number(res.wallet?.freePlayBalance ?? Math.max(0, (wallet.freePlayBalance || 0) - parsedFreePlayAmount));
          setFreePlayAmount(remainingFp > 0 ? String(Number(remainingFp.toFixed(2))) : '0');
        } else {
          setErrorMessage(res.message);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Error processing Free-Play load.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Branch A2: Referral Rewards Load
    if (fundingMode === 'referral_rewards') {
      if (parsedRefAmount <= 0) {
        setErrorMessage('Please enter an amount of referral bonus credits to load to the game.');
        return;
      }
      if (parsedRefAmount > (wallet.referralBonusBalance || 0)) {
        setErrorMessage(
          `Insufficient referral bonus balance ($${(wallet.referralBonusBalance || 0).toFixed(2)}).`
        );
        return;
      }
      if (!targetAccount || targetAccount.status !== 'active') {
        setErrorMessage(
          `An active Gaming ID for "${targetGameName}" is required before loading referral bonus credits.`
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await dataService.transferGameCreditsAsync({
          gameAccountId: targetAccount.id,
          gameCatalogId: selectedGameCatalogId,
          direction: 'load',
          source: 'referral_bonus',
          amount: parsedRefAmount,
        });
        if (res.success) {
          setSuccessMessage(
            `Referral Bonus Loaded! $${parsedRefAmount.toFixed(2)} loaded to ${targetGameName} (${targetAccount.username}). Support has been notified for manual game confirmation.`
          );
        } else {
          setErrorMessage(res.message);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Error processing referral top-up.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Branch B: Supported 4 Payment Methods (Proof-First Workflow)
    if (!screenshotFile) {
      setErrorMessage('Please upload a screenshot of your payment receipt before submitting.');
      return;
    }

    const providerRef = 'Payment Screenshot Proof Attached';

    setIsSubmitting(true);
    setTimeout(() => {
      try {
        const newReq = dataService.submitTopUp({
          customerId: currentUser.id,
          customerName: currentUser.displayName,
          amount: 0, // Admin / Agent verifies exact amount directly from screenshot proof
          method: selectedMethodType,
          methodName: currentMethod.name,
          targetGameCatalogId: selectedGameCatalogId,
          targetGameName: targetGameName,
          targetGameUsername: targetAccount?.username || currentUser.displayName,
          providerRef: providerRef,
          receiptUrl: screenshotFile || undefined,
          receiptName: screenshotName || 'payment_receipt.png',
        });

        // Register payment method on the customer
        dataService.setUserRegisteredMethod(currentUser.id, selectedMethodType, providerRef);

        // Forward notice to Support Chat so staff sees the proof immediately
        try {
          const conv = dataService.getOrCreateConversationForCustomer(currentUser.id, currentUser.displayName);
          dataService.sendChatMessage({
            conversationId: conv.id,
            senderId: currentUser.id,
            senderName: currentUser.displayName,
            senderRole: 'customer',
            text: formatTopUpSubmittedChatMessage({
              amount: 0,
              methodName: currentMethod.name,
              gameName: targetGameName,
            }),
            isInternalNote: false,
          });
        } catch (chatErr) {
          console.warn('Customer topup chat notice:', chatErr);
        }

        // Forward alert to 24/7 Telegram Bot if active
        telegramService.notify({
          title: 'New Payment Proof Forwarded',
          text: `Player ${currentUser.displayName} submitted payment proof for ${currentMethod.name} (Game: ${targetGameName}).`,
          customerName: currentUser.displayName,
          customerEmail: currentUser.email,
          actionType: 'topup',
          gameName: targetGameName,
          proofUrl: screenshotFile,
        }).catch(() => {});

        setIsSubmitting(false);
        setSuccessMessage(
          `Payment proof submitted! Your deposit (+${dynamicBonusPercent}% bonus) will be credited to ${targetGameName} shortly.`
        );
        setScreenshotFile(null);
        setScreenshotName('');
        setUploadError(null);
        if (typeof window !== 'undefined') {
          clearTopUpDraft(window.sessionStorage, currentUser.id);
        }
      } catch (err: any) {
        setIsSubmitting(false);
        setErrorMessage(err.message || 'Error processing top-up proof.');
      }
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-8">
      {/* Header with Gaming Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-amber-400" />
            <span>Top-Up</span>
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            UP TO 30% BONUS
          </span>
        </div>

        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit max-w-full">
          <button
            type="button"
            onClick={() => {
              setFundingMode('gateway_payment');
              setErrorMessage(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              fundingMode === 'gateway_payment'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deposit Methods
          </button>

          <button
            type="button"
            onClick={() => {
              setFundingMode('free_play');
              setErrorMessage(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              fundingMode === 'free_play'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${fundingMode === 'free_play' ? 'text-slate-950' : 'text-amber-300'}`} />
            <span>Free-Play (${(wallet.freePlayBalance || 0).toFixed(2)})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFundingMode('referral_rewards');
              setErrorMessage(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              fundingMode === 'referral_rewards'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Referral Bonus (${(wallet.referralBonusBalance || 0).toFixed(2)})</span>
          </button>
        </div>
      </div>

      {/* Single-Column Top-Up Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-5 shadow-xl">
            {/* Step 1: Select Game */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                  <span>1. Select Game</span>
                </span>
                <span className="text-[10px] text-amber-400 font-normal">Target account</span>
              </label>

              {/* Clean select box with only game titles */}
              <div className="space-y-1.5">
                <select
                  value={selectedGameCatalogId}
                  onChange={(e) => setSelectedGameCatalogId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
                >
                  {gameCatalog.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Game selected: <strong className="text-amber-300">{targetGameName}</strong>
                </p>
              </div>
            </div>

            {/* Step 2: Select Payment Method */}
            {fundingMode === 'gateway_payment' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300">
                  2. Select Method (Choose Bonus Tier)
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* 1. Payment via Link (20% bonus) */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethodType('payment_link')}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selectedMethodType === 'payment_link'
                        ? 'bg-[#131C2E] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-[#0A0F1D] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold mb-2">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        +20% BONUS
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">Via Link</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Automated secure checkout</div>
                  </button>

                  {/* 2. Verified CashApp (30% bonus) */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethodType('cashapp')}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selectedMethodType === 'cashapp'
                        ? 'bg-[#131C2E] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-[#0A0F1D] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold mb-2">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        +30% BONUS
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">Verified CashApp</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Direct CashApp forward link</div>
                  </button>

                  {/* 3. Chime Direct (15% bonus, Min $20) */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethodType('chime')}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selectedMethodType === 'chime'
                        ? 'bg-[#131C2E] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-[#0A0F1D] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold mb-2">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          +15% BONUS
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-white">Chime Direct</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Chime QR code scan & transfer</div>
                  </button>

                  {/* 4. Crypto Payment (30% bonus) */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethodType('crypto')}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selectedMethodType === 'crypto'
                        ? 'bg-[#131C2E] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-[#0A0F1D] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold mb-2">
                        <Coins className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        +30% BONUS
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">Crypto Payment</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">BTC, ETH, USDT manual vault</div>
                  </button>
                </div>
              </div>
            )}

            {/* Direct Free-Play Top-Up Workflow */}
            {fundingMode === 'free_play' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">
                    Wheel Free-Play Credits to Load to Game
                  </label>
                  <button
                    type="button"
                    onClick={() => setFreePlayAmount(String(Number((wallet.freePlayBalance || 0).toFixed(2))))}
                    className="text-[11px] font-mono font-semibold text-amber-300 hover:text-amber-200"
                  >
                    Max Available (${(wallet.freePlayBalance || 0).toFixed(2)})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="1"
                    max={wallet.freePlayBalance || 0}
                    step="any"
                    value={freePlayAmount}
                    onChange={(e) => setFreePlayAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                {(!targetAccount || targetAccount.status !== 'active') && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-200 flex items-center justify-between gap-2">
                    <span>Active Gaming ID required for {targetGameName} before loading Free-Play.</span>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('game_accounts')}
                      className="text-amber-300 font-semibold underline shrink-0"
                    >
                      Open Gaming IDs
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Direct Referral Bonus Top-Up Workflow */}
            {fundingMode === 'referral_rewards' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">
                    Referral Credits to Load to Game
                  </label>
                  <button
                    type="button"
                    onClick={() => setReferralAmount(String(Number((wallet.referralBonusBalance || 0).toFixed(2))))}
                    className="text-[11px] font-mono font-semibold text-indigo-300 hover:text-indigo-200"
                  >
                    Max Available (${(wallet.referralBonusBalance || 0).toFixed(2)})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="1"
                    max={wallet.referralBonusBalance || 0}
                    step="any"
                    value={referralAmount}
                    onChange={(e) => setReferralAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                {(!targetAccount || targetAccount.status !== 'active') && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-200 flex items-center justify-between gap-2">
                    <span>Active Gaming ID required for {targetGameName} before loading referral bonus.</span>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('game_accounts')}
                      className="text-amber-300 font-semibold underline shrink-0"
                    >
                      Open Gaming IDs
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Method Details Panels */}
            {fundingMode === 'gateway_payment' && (
              <>
                {/* 1. Via Link */}
                {selectedMethodType === 'payment_link' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-blue-900/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-blue-400" />
                        <span>Payment via Link (+20% Bonus)</span>
                      </div>
                      <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                        +20% Extra Credits
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="font-mono text-[11px] text-blue-400 truncate">
                        {paymentViaLinkUrl}
                      </div>
                      <a
                        href={paymentViaLinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <span>Open Link to Pay</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/30 text-[11px] text-blue-200/80 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Click the link to complete payment, then upload your receipt screenshot below.</span>
                    </div>
                  </div>
                )}

                {/* 2. Verified CashApp */}
                {selectedMethodType === 'cashapp' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>Verified CashApp (+30% Bonus)</span>
                      </div>
                      <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                        +30% Extra Credits
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="font-mono text-[11px] text-emerald-400 truncate">
                        {cashAppForwardUrl}
                      </div>
                      <a
                        href={cashAppForwardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <span>Open CashApp Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {currentMethod?.qrCodeUrl && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                        <img
                          src={currentMethod.qrCodeUrl}
                          alt="CashApp QR Code"
                          className="w-24 h-24 rounded-lg bg-white p-1 border border-slate-700 shrink-0 object-contain"
                        />
                        <div className="space-y-0.5 text-center sm:text-left">
                          <div className="text-xs font-bold text-white">CashApp Payment QR Code</div>
                          <p className="text-[11px] text-slate-400">
                            Scan with Cash App or tap the link above to pay directly.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/30 text-[11px] text-emerald-200/80 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>No cashtag required. Pay via CashApp and upload your payment confirmation screenshot below.</span>
                    </div>
                  </div>
                )}

                {/* 3. Chime Direct */}
                {selectedMethodType === 'chime' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-teal-900/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-teal-400" />
                        <span>Chime Direct (+15% Bonus)</span>
                      </div>
                      <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50 font-bold">
                        Min $20.00
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-3.5">
                      {/* Clickable QR Code with Zoom Affordance */}
                      <div
                        onClick={() => setShowChimeQrModal(true)}
                        className="relative group cursor-pointer shrink-0"
                        title="Click to enlarge QR code"
                      >
                        <img
                          src={chimeQrUrl}
                          alt="Chime QR Code"
                          className="w-24 h-24 rounded-lg bg-white p-1 border border-slate-700 shadow-sm transition-transform duration-150 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-teal-300">
                          <ZoomIn className="w-5 h-5 drop-shadow-md" />
                        </div>
                      </div>

                      <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                            <span>Chime Payment QR Code</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Tap image to enlarge or download to scan in your mobile Chime app:
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-mono font-bold text-teal-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                              {chimeHandle}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopy(chimeHandle, 'chime')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="Copy Chime Sign"
                            >
                              {copiedKey === 'chime' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Direct Download Button */}
                          <button
                            type="button"
                            onClick={handleDownloadChimeQr}
                            disabled={downloadingChimeQr}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 active:scale-95 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition-all shadow-xs"
                          >
                            {downloadingChimeQr ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>{downloadingChimeQr ? 'Saving...' : 'Download QR'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-teal-950/30 border border-teal-900/30 text-[11px] text-teal-200/80 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Send to Chime sign above, then upload your transaction screenshot below.</span>
                    </div>
                  </div>
                )}

                {/* 4. Crypto Payment */}
                {selectedMethodType === 'crypto' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-amber-900/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span>Manual Crypto Vault (+30% Bonus)</span>
                      </div>
                      <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                        +30% Extra Credits
                      </span>
                    </div>

                    {/* Coin Selector */}
                    <div className="flex items-center gap-2">
                      {(['USDT', 'BTC', 'ETH'] as const).map((coin) => (
                        <button
                          key={coin}
                          type="button"
                          onClick={() => setSelectedCryptoCoin(coin)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                            selectedCryptoCoin === coin
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {coin} {coin === 'USDT' && '(TRC20)'}
                        </button>
                      ))}
                    </div>

                    {/* Address Box */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{selectedCryptoCoin} Deposit Address:</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {selectedCryptoCoin === 'USDT' ? 'TRON TRC20' : selectedCryptoCoin === 'BTC' ? 'Bitcoin' : 'Ethereum ERC20'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="font-mono text-xs text-amber-300 break-all select-all">
                          {cryptoAddresses[selectedCryptoCoin]}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(cryptoAddresses[selectedCryptoCoin], selectedCryptoCoin)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 shrink-0"
                        >
                          {copiedKey === selectedCryptoCoin ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/30 text-[11px] text-amber-200/80 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>No TXID input needed. Transfer to the address above and upload your wallet confirmation screenshot below.</span>
                    </div>
                  </div>
                )}

                {/* Step 3: Pay & Upload Screenshot */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="topup-proof-input" className="font-semibold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-indigo-400" />
                      <span>3. Pay &amp; Upload Screenshot</span>
                    </label>
                    <span className="text-[10px] text-slate-400 shrink-0">Required</span>
                  </div>

                  <input
                    id="topup-proof-input"
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    disabled={isUploadingScreenshot}
                    className="hidden"
                  />

                  {uploadError && (
                    <div
                      role="alert"
                      className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        className="text-rose-200 hover:text-white font-medium shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {screenshotFile ? (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-3 min-w-0">
                        {!previewLoadFailed ? (
                          <img
                            src={screenshotFile}
                            alt="Uploaded payment screenshot preview"
                            referrerPolicy="no-referrer"
                            onError={() => setPreviewLoadFailed(true)}
                            className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg border border-slate-700 bg-slate-950 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 text-indigo-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate max-w-[200px]">
                            {screenshotName || 'payment_receipt.webp'}
                          </div>
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3 shrink-0" />
                            <span>Screenshot attached</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => screenshotInputRef.current?.click()}
                          disabled={isUploadingScreenshot}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium whitespace-nowrap"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          aria-label="Remove uploaded screenshot"
                          onClick={() => {
                            setScreenshotFile(null);
                            setScreenshotName('');
                            setUploadError(null);
                            setPreviewLoadFailed(false);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleScreenshotDrag}
                      onDragOver={handleScreenshotDrag}
                      onDragLeave={handleScreenshotDrag}
                      onDrop={handleScreenshotDrop}
                      className={`border border-dashed rounded-xl transition-colors ${
                        isDraggingScreenshot
                          ? 'border-amber-400 bg-slate-900'
                          : 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => screenshotInputRef.current?.click()}
                        disabled={isUploadingScreenshot}
                        className="w-full min-h-[112px] p-4 text-center flex flex-col items-center justify-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isUploadingScreenshot ? (
                          <>
                            <Loader2 className="w-6 h-6 text-amber-400 mb-1.5 animate-spin" />
                            <div className="text-xs font-semibold text-amber-300">
                              Optimizing &amp; Uploading Screenshot...
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Optimizing &amp; saving image
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-indigo-400 mb-1.5" />
                            <div className="text-xs font-semibold text-slate-200">
                              Tap to Upload or Drag Payment Screenshot
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              PNG, JPG, or WebP screenshot from Cash App, Chime, Bank, or Crypto wallet
                            </p>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || (fundingMode === 'gateway_payment' && !screenshotFile)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? fundingMode === 'gateway_payment'
                    ? 'Submitting Proof...'
                    : 'Transferring Credits to Game...'
                  : fundingMode === 'free_play'
                  ? `Load $${parsedFreePlayAmount.toFixed(2)} Free-Play to Game`
                  : fundingMode === 'referral_rewards'
                  ? `Load $${parsedRefAmount.toFixed(2)} Referral Bonus`
                  : 'Submit'}
              </span>
            </button>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Bonus &amp; Payout Rules</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('chat')}
                className="text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Open Live Chat &rarr;
              </button>
            </div>
          </form>

      {/* Top-up History */}
      {topUpHistory.length > 0 && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Recent Top-Up History</span>
          </h2>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-2.5">
            {topUpHistory.slice(0, 5).map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {req.targetGameName || 'Game'}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{req.methodName}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold text-white bg-slate-800/90 border border-slate-700 shrink-0 tabular-nums">
                    ${req.finalWalletCredit.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="font-mono">
                    {new Date(req.createdAt).toLocaleDateString()}
                    {req.bonusAmount > 0 ? ` · +$${req.bonusAmount.toFixed(2)} bonus` : ''}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${
                      req.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : req.status === 'rejected'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Game</th>
                  <th className="pb-2">Deposit</th>
                  <th className="pb-2">Bonus</th>
                  <th className="pb-2">Total Credit</th>
                  <th className="pb-2">Proof</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {topUpHistory.slice(0, 5).map((req) => (
                  <tr key={req.id} className="text-slate-300">
                    <td className="py-2.5 text-[11px] text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 font-sans font-medium text-white">{req.methodName}</td>
                    <td className="py-2.5 font-sans text-slate-300">{req.targetGameName || 'Game'}</td>
                    <td className="py-2.5">${req.amount.toFixed(2)}</td>
                    <td className="py-2.5 text-emerald-400">
                      {req.bonusAmount > 0 ? `+$${req.bonusAmount.toFixed(2)} (${req.bonusPercentage}%)` : '$0.00'}
                    </td>
                    <td className="py-2.5 text-white font-bold">${req.finalWalletCredit.toFixed(2)}</td>
                    <td className="py-2.5 font-sans">
                      {req.receiptUrl ? (
                        <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40">
                          Screenshot
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">None</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${
                          req.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : req.status === 'rejected'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full-Screen Chime QR Enlarge & Download Modal */}
      {showChimeQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#0E1628] border border-teal-500/30 p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            <button
              type="button"
              onClick={() => setShowChimeQrModal(false)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
              <QrCode className="w-5 h-5" />
              <span>Chime Payment QR Code</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white shadow-md border border-slate-700">
              <img
                src={chimeQrUrl}
                alt="Chime QR Code Large"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Handle:</span>
              <code className="text-xs font-mono font-bold text-teal-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {chimeHandle}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(chimeHandle, 'chime_modal')}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy Chime Sign"
              >
                {copiedKey === 'chime_modal' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadChimeQr}
              disabled={downloadingChimeQr}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-600/30"
            >
              {downloadingChimeQr ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadingChimeQr ? 'Saving QR Image...' : 'Download QR Code (Save to Photos)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bonus & Payout Rules Modal */}
      {showRulesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowRulesModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bonus-payout-rules-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 text-xs text-slate-300"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h3 id="bonus-payout-rules-title">Bonus &amp; Payout Rules</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close bonus and payout rules"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-semibold text-white">How Top-Ups Work</div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                  <li>Select your target game and preferred payment method</li>
                  <li>Send payment using the link, QR code, or wallet address</li>
                  <li>Upload your receipt screenshot for review and crediting</li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1">
                <div className="font-semibold text-white">Same-Channel Payout Rule</div>
                <p className="text-slate-400">
                  Depositing via <strong className="text-amber-300">{currentMethod?.name}</strong> sets your verified payout channel. Cashouts are returned through your last deposit method.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-semibold text-white">Free-Play &amp; Bonus Credits</div>
                <p className="text-slate-400">
                  Promotional credits load at a 1:1 rate into active Gaming IDs. Unloading returns Free-Play credits to your Free-Play balance before cashable funds.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowRulesModal(false);
                  onNavigateTab('chat');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold transition-colors"
              >
                Need help? Open Live Chat
              </button>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
