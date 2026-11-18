import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAuditLogRow,
  mergeAuditLogs,
  filterAuditLogs,
  buildAuditCsv,
} from './auditLogUtils';

test('normalizeAuditLogRow maps canonical Supabase columns and legacy columns cleanly', () => {
  const canonical = normalizeAuditLogRow({
    id: 'aud_1',
    actor_id: 'usr_admin_1',
    actor_name: 'Master Admin',
    actor_role: 'admin',
    action: 'TOPUP_APPROVED',
    entity_type: 'topup',
    entity_id: 'top_99',
    details: 'Approved $100 deposit',
    timestamp: '2026-11-18T01:00:00.000Z',
  });
  assert.deepEqual(canonical, {
    id: 'aud_1',
    actorId: 'usr_admin_1',
    actorName: 'Master Admin',
    actorRole: 'admin',
    action: 'TOPUP_APPROVED',
    entityType: 'topup',
    entityId: 'top_99',
    details: 'Approved $100 deposit',
    timestamp: '2026-11-18T01:00:00.000Z',
  });

  const legacy = normalizeAuditLogRow({
    id: 'aud_2',
    user_id: 'usr_staff_1',
    user_email: 'agent@swiftsweeps.com',
    action: 'GAME_CREDENTIALS_DIRECT_PROVISION',
    entity_type: 'game_account',
    entity_id: 'ga_1',
    details: 'Provisioned credentials',
    created_at: '2026-11-18T02:00:00.000Z',
  });
  assert.equal(legacy?.actorId, 'usr_staff_1');
  assert.equal(legacy?.actorName, 'agent@swiftsweeps.com');
  assert.equal(legacy?.actorRole, 'customer');
  assert.equal(legacy?.timestamp, '2026-11-18T02:00:00.000Z');
});

test('mergeAuditLogs deduplicates by id, sorts descending by timestamp, and honors maxItems', () => {
  const existing = [
    normalizeAuditLogRow({
      id: 'aud_1',
      actor_id: 'a1',
      actor_name: 'Admin',
      actor_role: 'admin',
      action: 'A1',
      entity_type: 'user',
      entity_id: 'u1',
      details: 'old',
      timestamp: '2026-11-18T01:00:00.000Z',
    })!,
  ];
  const incoming = [
    normalizeAuditLogRow({
      id: 'aud_1',
      actor_id: 'a1',
      actor_name: 'Admin',
      actor_role: 'admin',
      action: 'A1',
      entity_type: 'user',
      entity_id: 'u1',
      details: 'updated',
      timestamp: '2026-11-18T01:00:00.000Z',
    })!,
    normalizeAuditLogRow({
      id: 'aud_2',
      actor_id: 'a2',
      actor_name: 'Player',
      actor_role: 'customer',
      action: 'USER_LOGGED_OUT',
      entity_type: 'user',
      entity_id: 'u2',
      details: 'Logged out',
      timestamp: '2026-11-18T03:00:00.000Z',
    })!,
  ];

  const merged = mergeAuditLogs(existing, incoming, { maxItems: 100 });
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'aud_2');
  assert.equal(merged[1].details, 'updated');

  const capped = mergeAuditLogs(existing, incoming, { maxItems: 1 });
  assert.equal(capped.length, 1);
  assert.equal(capped[0].id, 'aud_2');
});

test('filterAuditLogs filters by entityType, date range, and searchTerm', () => {
  const logs = [
    normalizeAuditLogRow({
      id: 'aud_1',
      actor_id: 'u1',
      actor_name: 'Alice',
      actor_role: 'customer',
      action: 'USER_LOGGED_IN',
      entity_type: 'user',
      entity_id: 'u1',
      details: 'Signed in from Chrome',
      timestamp: '2026-11-17T12:00:00.000Z',
    })!,
    normalizeAuditLogRow({
      id: 'aud_2',
      actor_id: 'adm1',
      actor_name: 'Root Admin',
      actor_role: 'admin',
      action: 'TOPUP_APPROVED',
      entity_type: 'topup',
      entity_id: 'top_55',
      details: 'Approved deposit $50',
      timestamp: '2026-11-18T12:00:00.000Z',
    })!,
  ];

  assert.equal(filterAuditLogs(logs, { entityType: 'topup' }).length, 1);
  assert.equal(filterAuditLogs(logs, { searchTerm: 'chrome' }).length, 1);
  assert.equal(filterAuditLogs(logs, { fromDate: '2026-11-18' }).length, 1);
  assert.equal(filterAuditLogs(logs, { toDate: '2026-11-17' }).length, 1);
});

test('buildAuditCsv quotes values and neutralizes CSV formula prefixes', () => {
  const csv = buildAuditCsv([
    {
      id: 'aud_1',
      actorId: 'usr_1',
      actorName: '=cmd|calc',
      actorRole: 'admin',
      action: 'SETTINGS_UPDATED',
      entityType: 'settings',
      entityId: 'main',
      details: 'Changed "bonus" rate',
      timestamp: '2026-11-18T00:00:00.000Z',
    },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].includes(`"'=cmd|calc"`));
  assert.ok(lines[1].includes(`"Changed ""bonus"" rate"`));
});
