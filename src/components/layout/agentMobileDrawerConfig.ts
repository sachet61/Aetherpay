import type { UserRole } from '../../types';

export interface AgentDrawerNavItem {
  id: string;
  label: string;
  kind: 'partners' | 'rules';
}

export const AGENT_DRAWER_REMOVED_TABS = [
  'ops_chat',
  'ops_game_credentials',
  'ops_requests',
  'ops_users',
  'ops_dashboard',
] as const;

export const AGENT_ADMIN_ONLY_TABS = [
  'ops_config',
  'ops_game_catalog',
  'ops_audit',
] as const;

export const AGENT_OFFICIAL_PARTNERS_ROUTE: string | null = 'official_partners';
export const AGENT_RULES_ROUTE = 'rules';

export function canRenderAgentDrawer(role?: UserRole | string | null): boolean {
  return role === 'agent';
}

export function getAgentFirstName(displayName?: string | null): string {
  const first = (displayName || '').trim().split(/\s+/).filter(Boolean)[0];
  return first || 'Support';
}

export function getAgentDrawerListItems(options?: {
  officialPartnersRoute?: string | null;
}): AgentDrawerNavItem[] {
  const officialPartnersRoute =
    options?.officialPartnersRoute === undefined
      ? AGENT_OFFICIAL_PARTNERS_ROUTE
      : options.officialPartnersRoute;

  const items: AgentDrawerNavItem[] = [];

  if (officialPartnersRoute && officialPartnersRoute.trim().length > 0) {
    items.push({
      id: officialPartnersRoute,
      label: 'Official partners',
      kind: 'partners',
    });
  }

  items.push({
    id: AGENT_RULES_ROUTE,
    label: 'Rules and policies',
    kind: 'rules',
  });

  return items;
}

export function isAgentAllowedReadOnlyTab(
  role?: UserRole | string | null,
  tab?: string | null
): boolean {
  if (role !== 'agent' || !tab) return false;
  return (
    tab === AGENT_OFFICIAL_PARTNERS_ROUTE ||
    tab === AGENT_RULES_ROUTE ||
    tab === 'privacy' ||
    tab === 'data_deletion'
  );
}
