import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_DRAWER_FEATURED_ITEM,
  ADMIN_DRAWER_REMOVED_TABS,
  ADMIN_OFFICIAL_PARTNERS_ROUTE,
  canRenderAdminDrawer,
  getAdminDrawerListItems,
  getAdminFirstName,
} from './adminMobileDrawerConfig.ts';

test('canRenderAdminDrawer allows admin only and blocks agents and customers', () => {
  assert.equal(canRenderAdminDrawer('admin'), true);
  assert.equal(canRenderAdminDrawer('agent'), false);
  assert.equal(canRenderAdminDrawer('customer'), false);
  assert.equal(canRenderAdminDrawer(undefined), false);
  assert.equal(canRenderAdminDrawer(null), false);
});

test('featured Config card targets ops_config with exact copy', () => {
  assert.deepEqual(ADMIN_DRAWER_FEATURED_ITEM, {
    id: 'ops_config',
    label: 'Fees and bonuses',
    tag: 'Config',
  });
});

test('admin drawer list excludes all bottom-bar items and hides Official partners when no route exists', () => {
  assert.equal(ADMIN_OFFICIAL_PARTNERS_ROUTE, null);

  const items = getAdminDrawerListItems();
  assert.deepEqual(
    items.map((item) => ({ id: item.id, label: item.label })),
    [
      { id: 'ops_game_catalog', label: 'Game catalog' },
      { id: 'ops_audit', label: 'Audit logs' },
    ]
  );

  const renderedIds = new Set([ADMIN_DRAWER_FEATURED_ITEM.id, ...items.map((item) => item.id)]);
  for (const removedId of ADMIN_DRAWER_REMOVED_TABS) {
    assert.equal(renderedIds.has(removedId), false);
  }
});

test('admin drawer list places Official partners between Game catalog and Audit logs when a route is provided', () => {
  const items = getAdminDrawerListItems({ officialPartnersRoute: 'ops_official_partners' });
  assert.deepEqual(
    items.map((item) => ({ id: item.id, label: item.label })),
    [
      { id: 'ops_game_catalog', label: 'Game catalog' },
      { id: 'ops_official_partners', label: 'Official partners' },
      { id: 'ops_audit', label: 'Audit logs' },
    ]
  );
});

test('getAdminFirstName returns first word or safe fallback', () => {
  assert.equal(getAdminFirstName('Alex Morgan'), 'Alex');
  assert.equal(getAdminFirstName('  Rashil  '), 'Rashil');
  assert.equal(getAdminFirstName(''), 'Admin');
  assert.equal(getAdminFirstName(null), 'Admin');
});
