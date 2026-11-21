import type { UserRole } from '../../types';

export interface AdminDrawerNavItem {
  id: string;
  label: string;
  kind: 'catalog' | 'partners' | 'audit';
}

export const ADMIN_DRAWER_FEATURED_ITEM = {
  id: 'ops_config',
  label: 'Fees and bonuses',
  tag: 'Config',
} as const;

export const ADMIN_DRAWER_REMOVED_TABS = [
  'ops_dashboard',
  'ops_users',
  'ops_game_credentials',
  'ops_requests',
  'ops_chat',
] as const;

/**
 * Dedicated route for Admin Official Partners management.
 * Currently null because Official Partners lives inside AdminConfig's local tab state
 * and no dedicated route exists without modifying App routes.
 */
export const ADMIN_OFFICIAL_PARTNERS_ROUTE: string | null = null;

export function canRenderAdminDrawer(role?: UserRole | string | null): boolean {
  return role === 'admin';
}

export function getAdminFirstName(displayName?: string | null): string {
  const first = (displayName || '').trim().split(/\s+/).filter(Boolean)[0];
  return first || 'Admin';
}

export function getAdminDrawerListItems(options?: {
  officialPartnersRoute?: string | null;
}): AdminDrawerNavItem[] {
  const officialPartnersRoute =
    options?.officialPartnersRoute === undefined
      ? ADMIN_OFFICIAL_PARTNERS_ROUTE
      : options.officialPartnersRoute;

  const items: AdminDrawerNavItem[] = [
    {
      id: 'ops_game_catalog',
      label: 'Game catalog',
      kind: 'catalog',
    },
  ];

  if (officialPartnersRoute && officialPartnersRoute.trim().length > 0) {
    items.push({
      id: officialPartnersRoute,
      label: 'Official partners',
      kind: 'partners',
    });
  }

  items.push({
    id: 'ops_audit',
    label: 'Audit logs',
    kind: 'audit',
  });

  return items;
}
