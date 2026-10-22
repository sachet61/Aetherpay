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
  type?: TransactionType;
  status?: 'completed' | 'pending' | 'failed' | 'cancelled' | string;
  description?: string;
  referenceId?: string;
  gameName?: string;
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
  paymentMethodId?: string;
  paymentMethodName?: string;
  method?: string;
  status?: 'pending' | 'submitted' | 'verifying' | 'approved' | 'rejected' | 'completed' | string;
  proofUrl?: string;
  targetGameName?: string;
  targetGameAccountId?: string;
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
  payoutMethodId?: string;
  payoutMethodName?: string;
  method?: string;
  methodName?: string;
  payoutDetails?: any;
  status?: WithdrawalStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  transactionHash?: string;
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
  totalBonusEarned?: number;
  referralCode?: string;
  referredUsers?: any[];
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
