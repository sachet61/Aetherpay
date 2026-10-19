export type UserRole = 'customer' | 'agent' | 'admin';

export type UserStatus = 'active' | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  referralCode: string;
  referredBy?: string;
  status: UserStatus;
  emailVerified?: boolean;
  registeredPaymentMethod?: PaymentMethodType;
  registeredPaymentDetails?: string;
  createdAt: string;
  lastLoginAt: string;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'withdrawal_hold'
  | 'withdrawal_release'
  | 'bonus'
  | 'referral_reward'
  | 'adjustment';

export type TransactionStatus = 'completed' | 'pending' | 'reversed';

export interface WalletTransaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  balanceAfter: number;
  relatedRequestId?: string;
  targetGameName?: string;
  targetGameUsername?: string;
  description: string;
  idempotencyKey: string;
  createdAt: string;
  status: TransactionStatus;
}

export interface UserWallet {
  customerId: string;
  currency: string;
  availableBalance: number; // Withdrawable cash balance (winnings)
  referralBonusBalance: number; // Promotional referral funds (non-cashable, game load only)
  reservedBalance: number;
  pendingDepositBalance: number;
  registeredPaymentMethod?: PaymentMethodType;
  registeredPaymentDetails?: string;
  lastTopUpAmount?: number; // Latest amount loaded into a game
  lastTopUpGame?: string; // Latest game loaded
  lastTopUpAt?: string;
  lastUpdatedAt: string;
}

export type PaymentMethodType =
  | 'payment_link'
  | 'cashapp'
  | 'chime'
  | 'crypto'
  | 'automated_gateway'
  | 'manual_receipt';
export type TopUpStatus = 'submitted' | 'verifying' | 'completed' | 'rejected';

export interface TopUpRequest {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  method: PaymentMethodType;
  methodName: string;
  targetGameCatalogId?: string;
  targetGameName?: string;
  targetGameUsername?: string;
  fundingSource?: 'payment_method' | 'referral_bonus' | 'wallet_balance';
  providerRef?: string;
  receiptUrl?: string;
  receiptName?: string;
  cryptoNetwork?: string;
  cryptoTxHash?: string;
  depositAddress?: string;
  bonusAmount: number;
  bonusPercentage: number;
  feeAmount: number;
  finalWalletCredit: number;
  status: TopUpStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PayoutMethodType = 'bank_transfer' | 'crypto' | 'e_wallet' | 'manual_support';
export type WithdrawalStatus =
  | 'submitted'
  | 'pending_verification'
  | 'processing'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface WithdrawalTimelineEntry {
  status: WithdrawalStatus;
  note: string;
  timestamp: string;
  actorName: string;
}

export interface PayoutDetails {
  methodType?: string;
  cashtag?: string;
  chimeHandle?: string;
  chimePhoneOrEmail?: string;
  cryptoCurrency?: 'BTC' | 'ETH' | 'USDT' | string;
  cryptoNetwork?: string;
  cryptoAddress?: string;
  linkAccountRef?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  routingOrSwift?: string;
  eWalletProvider?: string;
  eWalletAccount?: string;
  collectedBySupport?: boolean;
}

export interface WithdrawalRequest {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  feeAmount: number;
  netPayout: number;
  method?: string;
  methodName?: string;
  sourceGameCatalogId?: string;
  sourceGameName?: string;
  sourceGameUsername?: string;
  playerNotes?: string;
  payoutDetails?: PayoutDetails;
  reservedAmount: number;
  status: WithdrawalStatus;
  reviewerId?: string;
  reviewerName?: string;
  payoutReference?: string;
  reviewNotes?: string;
  timeline: WithdrawalTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface GameLink {
  id?: string;
  label: string;
  url: string;
}

export interface GameCatalogItem {
  id: string;
  title: string;
  platform: string;
  gameUrl: string;
  downloadUrl?: string;
  links?: GameLink[];
  description: string;
  imageUrl?: string;
  iconUrl?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GameAccountStatus = 'active' | 'pending_assignment' | 'pending_reset' | 'suspended';

export interface GameAccount {
  id: string;
  gameCatalogId: string;
  customerId: string;
  gameName: string;
  platformName: string;
  username: string;
  password?: string;
  gameUrl: string;
  status: GameAccountStatus;
  balance: number; // Game credits loaded on this specific game
  requestType?: 'new_id_request' | 'password_reset_request';
  notes?: string;
  assignedByAgentId?: string;
  assignedByAgentName?: string;
  createdAt: string;
  updatedAt: string;
}


export type ConversationStatus = 'open' | 'pending' | 'resolved';

export interface SupportConversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  status: ConversationStatus;
  lastMessageText: string;
  lastMessageTimestamp: string;
  unreadCountCustomer: number;
  unreadCountStaff: number;
  relatedRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatTransactionData {
  transactionType: 'topup' | 'withdrawal';
  requestId: string;
  gameName?: string;
  gameUsername?: string;
  amount: number;
  bonusAmount?: number;
  bonusPercentage?: number;
  finalCredit?: number;
  methodName?: string;
  status: 'pending' | 'completed' | 'rejected' | 'cancelled';
  proofUrl?: string;
  proofName?: string;
  details?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'agent' | 'admin' | 'system';
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  isInternalNote: boolean;
  intentAction?: {
    type: 'open_topup' | 'open_withdrawal' | 'open_game_account' | 'view_rules';
    prefilledAmount?: number;
    title?: string;
  };
  transactionData?: ChatTransactionData;
  createdAt: string;
  isRead: boolean;
}

export type NotificationType =
  | 'topup'
  | 'withdrawal'
  | 'bonus'
  | 'chat'
  | 'game_account'
  | 'referral'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  linkTab?: string;
  linkRequestId?: string;
  createdAt: string;
}

export interface ReferredUser {
  id: string;
  displayName: string;
  joinedAt: string;
  status: 'registered' | 'qualified' | 'rewarded';
  depositTotal: number;
  rewardEarned: number;
  emailVerified?: boolean;
  hasLoadedGame?: boolean;
}

export interface ReferralSummary {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  activeReferred: number;
  totalRewardsEarned: number;
  pendingRewards: number;
  rewardPerReferral: number;
  qualifyingDepositMin: number;
  referredUsers: ReferredUser[];
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: PaymentMethodType;
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  feePercentage: number;
  instructions: string;
  bonusPercentage: number;
  bonusMinDeposit?: number;
  bonusMaxCap?: number;
  forwardUrl?: string; // For payment_link and cashapp
  chimeHandle?: string; // For chime
  chimeQrCodeUrl?: string; // For chime
  qrCodeUrl?: string; // General payment QR code URL (stored in database or server/repo storage)
  btcAddress?: string; // For crypto
  ethAddress?: string; // For crypto
  usdtAddress?: string; // For crypto
  cryptoNetwork?: string;
  depositAddress?: string;
}

export interface WithdrawalMethodConfig {
  id: string;
  name: string;
  type: PayoutMethodType;
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  feeFlat: number;
  feePercentage: number;
  processingTimeHours: number;
}

export interface GatewaySimulatorConfig {
  autoWebhookEnabled: boolean;
  webhookEndpointUrl: string;
  autoApproveInstantGateway: boolean;
  simulateWebhookLatencyMs: number;
  failureRatePercentage: number;
  activeProviders: {
    zelleFedNow: boolean;
    cryptoTrc20: boolean;
  };
}

export interface CashoutFeedItem {
  id: string;
  customerName: string;
  amount: number;
  currency: string;
  methodName: string;
  gameName?: string;
  isFake: boolean;
  timestamp: string;
}

export interface CashoutFeedConfig {
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  intervalSeconds: number;
  namesPool: string[]; // customizable list of names or usernames
  probableAmounts?: number[]; // custom most probable cashout amounts (e.g. 50, 75, 100, 120, 150, 200, 250)
  timeWindowHours?: number; // default 2 hours ago
  displayLocations: {
    customerHome: boolean;
    withdrawalPage: boolean;
    walletPage: boolean;
  };
}

export interface WebhookLog {
  id: string;
  gateway: string;
  eventType: string;
  payload: Record<string, any>;
  status: 'delivered' | 'failed' | 'simulated';
  timestamp: string;
  responseStatus: number;
}

export interface AppConfig {
  currency: string;
  paymentMethods: PaymentMethodConfig[];
  withdrawalMethods: WithdrawalMethodConfig[];
  gatewaySimulator: GatewaySimulatorConfig;
  cashoutFeed: CashoutFeedConfig;
  referralProgram: {
    enabled: boolean;
    rewardPerReferral: number;
    qualificationDepositMin: number;
  };
  platformRules: {
    depositTerms: string;
    bonusWageringTerms: string;
    withdrawalPolicy: string;
    refundPolicy: string;
    cryptoRiskWarning: string;
  };
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'topup' | 'withdrawal' | 'wallet' | 'game_account' | 'settings' | 'user' | 'chat';
  entityId: string;
  details: string;
  timestamp: string;
}

export interface PasswordResetToken {
  id: string;
  token: string;
  email: string;
  userId?: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number | null;
}
