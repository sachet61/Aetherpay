export type UserRole = 'admin' | 'agent' | 'customer';
export type GameAccountStatus = 'active' | 'pending_assignment' | 'pending_reset' | 'suspended' | string;

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending' | string;
  emailVerified?: boolean;
  referralCode?: string;
  referredBy?: string;
  registeredPaymentMethod?: string;
  registeredPaymentDetails?: string;
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
  isParentAdmin?: boolean; // Protected Super / Parent Admin
  promotedBy?: string;     // ID of the admin who promoted this user
  promotedByName?: string; // Name of the admin who promoted this user
  promotedAt?: string;     // ISO timestamp when role was updated
  [key: string]: any;
}

export interface UserWallet {
  customerId: string;
  currency: string;
  availableBalance: number;
  referralBonusBalance?: number;
  reservedBalance?: number;
  pendingDepositBalance?: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
  registeredPaymentMethod?: string;
  registeredPaymentDetails?: string;
  lastTopUpAmount?: number;
  lastTopUpGame?: string;
  lastTopUpAt?: string;
  lastUpdatedAt?: string;
  [key: string]: any;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'bonus'
  | 'game_load'
  | 'game_redeem'
  | 'referral'
  | 'adjustment'
  | string;

export interface WalletTransaction {
  id: string;
  customerId?: string;
  amount?: number;
  fee?: number;
  netAmount?: number;
  currency?: string;
  balanceAfter?: number;
  type?: TransactionType;
  status?: 'completed' | 'pending' | 'failed' | 'cancelled' | 'reversed' | string;
  description?: string;
  relatedRequestId?: string;
  referenceId?: string;
  gameName?: string;
  targetGameName?: string;
  targetGameUsername?: string;
  idempotencyKey?: string;
  createdAt?: string;
  [key: string]: any;
}

export type PaymentMethodType =
  | 'payment_link'
  | 'cashapp'
  | 'chime'
  | 'crypto'
  | 'zelle'
  | 'applepay'
  | 'venmo'
  | string;

export type PayoutMethodType =
  | 'cashapp'
  | 'crypto'
  | 'chime'
  | 'paypal'
  | 'bank'
  | 'venmo'
  | string;

export type WithdrawalStatus =
  | 'pending'
  | 'pending_verification'
  | 'submitted'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | string;

export interface TopUpRequest {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency?: string;
  bonusAmount?: number;
  bonusPercentage?: number;
  feeAmount?: number;
  finalWalletCredit?: number;
  paymentMethodId?: string;
  paymentMethodName?: string;
  method?: string;
  methodName?: string;
  status?: 'pending' | 'submitted' | 'verifying' | 'approved' | 'rejected' | 'completed' | 'cancelled' | string;
  proofUrl?: string;
  receiptUrl?: string;
  receiptName?: string;
  providerRef?: string;
  cryptoTxHash?: string;
  targetGameName?: string;
  targetGameCatalogId?: string;
  targetGameAccountId?: string;
  targetGameUsername?: string;
  customerNotes?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface WithdrawalRequest {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency?: string;
  fee?: number;
  feeAmount?: number;
  netAmount?: number;
  netPayout?: number;
  reservedAmount?: number;
  payoutMethodId?: string;
  payoutMethodName?: string;
  method?: string;
  methodName?: string;
  sourceGameCatalogId?: string;
  sourceGameName?: string;
  sourceGameUsername?: string;
  playerNotes?: string;
  payoutDetails?: any;
  status?: WithdrawalStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  payoutReference?: string;
  transactionHash?: string;
  timeline?: Array<{
    status: string;
    note: string;
    timestamp: string;
    actorName: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface GameLink {
  label: string;
  url: string;
  type?: string;
}

export interface GameCatalogItem {
  id: string;
  title?: string;
  category?: string;
  description?: string;
  minLoad?: number;
  bonusPct?: number;
  isActive?: boolean;
  enabled?: boolean;
  platform?: string;
  iconUrl?: string;
  imageUrl?: string;
  gameUrl?: string;
  platformUrl?: string;
  downloadUrl?: string;
  directLinks?: GameLink[];
  links?: GameLink[];
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface GameAccount {
  id: string;
  customerId?: string;
  gameId?: string;
  gameName?: string;
  gameCatalogId?: string;
  platformName?: string;
  username?: string;
  password?: string;
  pin?: string;
  balance?: number;
  status?: 'active' | 'pending' | 'suspended' | 'pending_assignment' | string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface SupportConversation {
  id: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  agentId?: string;
  agentName?: string;
  assignedAgentId?: string;
  status?: 'open' | 'closed' | 'pending' | 'resolved' | string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCountCustomer?: number;
  unreadCountStaff?: number;
  createdAt?: string;
  [key: string]: any;
}

export interface ChatTransactionData {
  type?: 'topup' | 'withdrawal' | 'account_creation' | string;
  transactionType?: string;
  requestId?: string;
  amount?: number;
  status?: string;
  referenceId?: string;
  gameName?: string;
  details?: any;
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  senderRole?: UserRole | 'system' | string;
  content?: string;
  text?: string;
  isInternalNote?: boolean;
  transactionData?: ChatTransactionData;
  createdAt?: string;
  read?: boolean;
  deliveryStatus?: 'sending' | 'sent' | 'failed';
  deliveryError?: string;
  [key: string]: any;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'alert' | string;
  isRead?: boolean;
  createdAt?: string;
  linkTab?: string;
  linkRequestId?: string;
  [key: string]: any;
}

export type ReferralRewardMode = 'flat' | 'percent';
export type ReferralPayoutTarget = 'referral_bonus' | 'available_balance';
export type ReferralAwardStatus =
  | 'registered'
  | 'pending_deposit'
  | 'held_for_review'
  | 'rewarded'
  | 'rejected'
  | 'capped';

export interface ReferralProgramConfig {
  enabled: boolean;
  rewardMode: ReferralRewardMode;
  referrerRewardValue: number;
  refereeRewardValue: number;
  rewardPerReferral: number;
  qualificationDepositMin: number;
  requireEmailVerified: boolean;
  payoutTarget: ReferralPayoutTarget;
  maxReferralsPerUser: number;
  dailyPayoutCap: number;
  blockSelfReferral: boolean;
  blockDuplicateContact: boolean;
  flagSharedNetworkOrDevice: boolean;
  holdFlaggedForReview: boolean;
}

export interface ReferralLedgerEntry {
  id: string;
  referrerId: string;
  referrerName?: string;
  referrerEmail?: string;
  referrerCode?: string;
  refereeId: string;
  refereeName?: string;
  refereeEmail?: string;
  referralCodeUsed: string;
  source: 'signup_link' | 'manual_link' | 'manual_link_and_reward' | 'admin_reassign' | string;
  rewardMode: ReferralRewardMode;
  payoutTarget: ReferralPayoutTarget;
  referrerRewardAmount: number;
  refereeRewardAmount: number;
  qualifyingDepositId?: string;
  qualifyingDepositAmount: number;
  status: ReferralAwardStatus;
  fraudFlags: string[];
  staffReason?: string;
  assignedBy?: string;
  assignedByName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  rewardedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopReferrerEntry {
  referrerId: string;
  displayName: string;
  email?: string;
  referralCode: string;
  totalReferred: number;
  qualifiedCount: number;
  heldCount: number;
  totalReferrerPaid: number;
  totalFriendPaid: number;
}

export interface ReferredUser {
  id: string;
  displayName: string;
  joinedAt: string;
  status: ReferralAwardStatus | 'qualified' | string;
  depositTotal: number;
  rewardEarned: number;
  refereeRewardEarned?: number;
  emailVerified?: boolean;
  hasRealDepositMet?: boolean;
  fraudFlags?: string[];
  reviewNotes?: string;
  source?: string;
}

export interface AppConfig {
  currency: string;
  paymentMethods: any[];
  cashoutFeed?: {
    enabled?: boolean;
    displayCount?: number;
    minAmount?: number;
    maxAmount?: number;
    probableAmounts?: number[];
    [key: string]: any;
  };
  referralProgram?: ReferralProgramConfig;
  telegram?: any;
  rules?: any;
  [key: string]: any;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface ReferralSummary {
  totalReferred: number;
  activeReferred: number;
  totalRewardsEarned: number;
  totalBonusEarned?: number;
  pendingRewards?: number;
  heldRewardsCount?: number;
  rewardMode?: ReferralRewardMode;
  referrerRewardValue?: number;
  refereeRewardValue?: number;
  rewardPerReferral?: number;
  qualifyingDepositMin?: number;
  payoutTarget?: ReferralPayoutTarget;
  maxReferralsPerUser?: number;
  programEnabled?: boolean;
  referralCode?: string;
  referralLink?: string;
  referredUsers?: ReferredUser[];
  [key: string]: any;
}

export interface CashoutFeedItem {
  id: string;
  playerHandle?: string;
  customerName?: string;
  amount: number;
  currency?: string;
  gameName: string;
  payoutMethod?: string;
  methodName?: string;
  timestamp: string;
  verified?: boolean;
  isFake?: boolean;
  [key: string]: any;
}

export interface WebhookLog {
  id: string;
  service?: string;
  payload?: any;
  status?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: number;
  used: boolean;
  [key: string]: any;
}
