import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AGENT_ADMIN_ONLY_TABS,
  AGENT_DRAWER_REMOVED_TABS,
  AGENT_OFFICIAL_PARTNERS_ROUTE,
  AGENT_RULES_ROUTE,
  canRenderAgentDrawer,
  getAgentDrawerListItems,
  getAgentFirstName,
  isAgentAllowedReadOnlyTab,
} from './agentMobileDrawerConfig.ts';

test('canRenderAgentDrawer allows agent only and blocks customers and admins', () => {
  assert.equal(canRenderAgentDrawer('agent'), true);
  assert.equal(canRenderAgentDrawer('customer'), false);
  assert.equal(canRenderAgentDrawer('admin'), false);
  assert.equal(canRenderAgentDrawer(undefined), false);
  assert.equal(canRenderAgentDrawer(null), false);
});

test('agent drawer list excludes bottom-bar and admin-only items and includes Official partners + Rules and policies', () => {
  assert.equal(AGENT_OFFICIAL_PARTNERS_ROUTE, 'official_partners');
  assert.equal(AGENT_RULES_ROUTE, 'rules');

  const items = getAgentDrawerListItems();
  assert.deepEqual(
    items.map((item) => ({ id: item.id, label: item.label })),
    [
      { id: 'official_partners', label: 'Official partners' },
      { id: 'rules', label: 'Rules and policies' },
    ]
  );

  const renderedIds = new Set(items.map((item) => item.id));
  for (const removedId of AGENT_DRAWER_REMOVED_TABS) {
    assert.equal(renderedIds.has(removedId), false);
  }
  for (const adminId of AGENT_ADMIN_ONLY_TABS) {
    assert.equal(renderedIds.has(adminId), false);
  }
});

test('agent drawer list hides Official partners when no route exists', () => {
  const items = getAgentDrawerListItems({ officialPartnersRoute: null });
  assert.deepEqual(
    items.map((item) => ({ id: item.id, label: item.label })),
    [{ id: 'rules', label: 'Rules and policies' }]
  );
});

test('getAgentFirstName returns first word or safe Support fallback', () => {
  assert.equal(getAgentFirstName('Jordan Taylor'), 'Jordan');
  assert.equal(getAgentFirstName('  Maya  '), 'Maya');
  assert.equal(getAgentFirstName(''), 'Support');
  assert.equal(getAgentFirstName(null), 'Support');
});

test('isAgentAllowedReadOnlyTab allows partners and rules for agents only and blocks admin-only tabs', () => {
  assert.equal(isAgentAllowedReadOnlyTab('agent', 'official_partners'), true);
  assert.equal(isAgentAllowedReadOnlyTab('agent', 'rules'), true);
  assert.equal(isAgentAllowedReadOnlyTab('agent', 'ops_config'), false);
  assert.equal(isAgentAllowedReadOnlyTab('agent', 'ops_game_catalog'), false);
  assert.equal(isAgentAllowedReadOnlyTab('agent', 'ops_audit'), false);
  assert.equal(isAgentAllowedReadOnlyTab('admin', 'official_partners'), false);
  assert.equal(isAgentAllowedReadOnlyTab('customer', 'rules'), false);
});
