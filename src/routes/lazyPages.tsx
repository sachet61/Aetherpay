import React from 'react';
import { UserRole } from '../types';
import { getPrefetchRouteKeysForRole } from '../services/sessionHydrationUtils';

const loadCustomerHome = () =>
  import('../pages/customer/CustomerHome').then((mod) => ({ default: mod.CustomerHome }));
const loadCustomerWallet = () =>
  import('../pages/customer/CustomerWallet').then((mod) => ({ default: mod.CustomerWallet }));
const loadCustomerTopUp = () =>
  import('../pages/customer/CustomerTopUp').then((mod) => ({ default: mod.CustomerTopUp }));
const loadCustomerWithdrawal = () =>
  import('../pages/customer/CustomerWithdrawal').then((mod) => ({ default: mod.CustomerWithdrawal }));
const loadCustomerGameAccounts = () =>
  import('../pages/customer/CustomerGameAccounts').then((mod) => ({ default: mod.CustomerGameAccounts }));
const loadCustomerChat = () =>
  import('../pages/customer/CustomerChat').then((mod) => ({ default: mod.CustomerChat }));
const loadCustomerReferrals = () =>
  import('../pages/customer/CustomerReferrals').then((mod) => ({ default: mod.CustomerReferrals }));
const loadCustomerRules = () =>
  import('../pages/customer/CustomerRules').then((mod) => ({ default: mod.CustomerRules }));
const loadCustomerProfile = () =>
  import('../pages/customer/CustomerProfile').then((mod) => ({ default: mod.CustomerProfile }));

const loadAdminDashboard = () =>
  import('../pages/admin/AdminDashboard').then((mod) => ({ default: mod.AdminDashboard }));
const loadAdminRequests = () =>
  import('../pages/admin/AdminRequests').then((mod) => ({ default: mod.AdminRequests }));
const loadAdminChat = () =>
  import('../pages/admin/AdminChat').then((mod) => ({ default: mod.AdminChat }));
const loadAdminGameCatalog = () =>
  import('../pages/admin/AdminGameCatalog').then((mod) => ({ default: mod.AdminGameCatalog }));
const loadAdminGameCredentials = () =>
  import('../pages/admin/AdminGameCredentials').then((mod) => ({ default: mod.AdminGameCredentials }));
const loadAdminConfig = () =>
  import('../pages/admin/AdminConfig').then((mod) => ({ default: mod.AdminConfig }));
const loadAdminAudit = () =>
  import('../pages/admin/AdminAudit').then((mod) => ({ default: mod.AdminAudit }));
const loadAdminUsers = () =>
  import('../pages/admin/AdminUsers').then((mod) => ({ default: mod.AdminUsers }));

export const LazyCustomerHome = React.lazy(loadCustomerHome);
export const LazyCustomerWallet = React.lazy(loadCustomerWallet);
export const LazyCustomerTopUp = React.lazy(loadCustomerTopUp);
export const LazyCustomerWithdrawal = React.lazy(loadCustomerWithdrawal);
export const LazyCustomerGameAccounts = React.lazy(loadCustomerGameAccounts);
export const LazyCustomerChat = React.lazy(loadCustomerChat);
export const LazyCustomerReferrals = React.lazy(loadCustomerReferrals);
export const LazyCustomerRules = React.lazy(loadCustomerRules);
export const LazyCustomerProfile = React.lazy(loadCustomerProfile);

export const LazyAdminDashboard = React.lazy(loadAdminDashboard);
export const LazyAdminRequests = React.lazy(loadAdminRequests);
export const LazyAdminChat = React.lazy(loadAdminChat);
export const LazyAdminGameCatalog = React.lazy(loadAdminGameCatalog);
export const LazyAdminGameCredentials = React.lazy(loadAdminGameCredentials);
export const LazyAdminConfig = React.lazy(loadAdminConfig);
export const LazyAdminAudit = React.lazy(loadAdminAudit);
export const LazyAdminUsers = React.lazy(loadAdminUsers);

const routeLoaderMap: Record<string, () => Promise<unknown>> = {
  dashboard: loadCustomerHome,
  wallet: loadCustomerWallet,
  topup: loadCustomerTopUp,
  withdrawal: loadCustomerWithdrawal,
  game_accounts: loadCustomerGameAccounts,
  chat: loadCustomerChat,
  referrals: loadCustomerReferrals,
  rules: loadCustomerRules,
  profile: loadCustomerProfile,
  ops_dashboard: loadAdminDashboard,
  ops_requests: loadAdminRequests,
  ops_chat: loadAdminChat,
  ops_game_catalog: loadAdminGameCatalog,
  ops_game_credentials: loadAdminGameCredentials,
  ops_config: loadAdminConfig,
  ops_audit: loadAdminAudit,
  ops_users: loadAdminUsers,
};

export function prefetchPagesForSession(role?: UserRole, activeTab?: string): void {
  const keys = getPrefetchRouteKeysForRole(role, activeTab);
  for (const key of keys) {
    const loader = routeLoaderMap[key];
    if (loader) {
      void loader().catch(() => {});
    }
  }
}
