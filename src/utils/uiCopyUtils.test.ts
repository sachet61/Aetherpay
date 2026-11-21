import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatShortUuid,
  htmlToPlainEditorText,
  plainEditorTextToHtml,
  formatTopUpApprovedChatMessage,
  formatTopUpSubmittedChatMessage,
  formatCashoutChatMessage,
  formatCredentialsReadyChatMessage,
  formatTransactionStatusChatMessage,
} from './uiCopyUtils.ts';

describe('formatShortUuid', () => {
  it('truncates 36-character UUIDs to xxxx...xxxx', () => {
    assert.equal(
      formatShortUuid('2417f8fc-1234-4abc-9def-012345672a01'),
      '2417...2a01'
    );
  });

  it('preserves short readable identifiers', () => {
    assert.equal(formatShortUuid('usr_cust_1'), 'usr_cust_1');
    assert.equal(formatShortUuid(''), '');
  });
});

describe('Policy plain-text <-> HTML editor conversion', () => {
  it('strips raw HTML tags for the admin editor and converts back cleanly', () => {
    const rawHtml =
      '<h3>Cashout Rules</h3><p>Minimum withdrawal is <strong>$30</strong> via your last method.</p><ul><li>Same channel only</li><li>24/7 support review</li></ul>';
    const plain = htmlToPlainEditorText(rawHtml);

    assert.equal(/<[^>]+>/.test(plain), false);
    assert.match(plain, /### Cashout Rules/);
    assert.match(plain, /\*\*\$30\*\*/);
    assert.match(plain, /- Same channel only/);

    const roundTrip = plainEditorTextToHtml(plain);
    assert.match(roundTrip, /<h3>Cashout Rules<\/h3>/);
    assert.match(roundTrip, /<strong>\$30<\/strong>/);
    assert.match(roundTrip, /<ul>/);
    assert.match(roundTrip, /<li>Same channel only<\/li>/);
  });

  it('escapes accidental angle brackets in plain editor text', () => {
    const html = plainEditorTextToHtml('Limits: $20 < amount < $500');
    assert.equal(html, '<p>Limits: $20 &lt; amount &lt; $500</p>');
  });
});

describe('Compact automated chat receipt formatters', () => {
  it('formats Top-Up approval without active Game ID as a 3-line receipt with CTA', () => {
    const msg = formatTopUpApprovedChatMessage({
      totalCredit: 24,
      baseAmount: 20,
      bonusAmount: 4,
      gameName: 'Fire Kirin',
      hasActiveCredentials: false,
    });
    assert.equal(
      msg,
      '✅ Top-Up Approved: $24.00\nFire Kirin • $20 + $4 bonus\nRequest Game ID ->'
    );
  });

  it('formats Top-Up approval with active Game ID cleanly in 2 lines', () => {
    const msg = formatTopUpApprovedChatMessage({
      totalCredit: 130,
      baseAmount: 100,
      bonusAmount: 30,
      gameName: 'Orion Stars',
      gameUsername: 'player_99',
      hasActiveCredentials: true,
    });
    assert.equal(
      msg,
      '✅ Top-Up Approved: $130.00\nOrion Stars • $100 + $30 bonus (player_99)'
    );
  });

  it('formats Top-Up submitted, Cashout, Credentials, and Transaction Status concisely', () => {
    assert.equal(
      formatTopUpSubmittedChatMessage({
        amount: 50,
        bonusAmount: 10,
        methodName: 'CashApp',
        gameName: 'Juwa',
      }),
      '⏳ Top-Up Submitted: $60.00\nJuwa • CashApp ($50 + $10 bonus)'
    );

    assert.equal(
      formatCashoutChatMessage({
        amount: 120,
        methodName: 'Chime Direct',
        gameName: 'Fire Kirin',
        status: 'submitted',
      }),
      '⏳ Cashout Requested: $120.00\nFire Kirin • Chime Direct'
    );

    assert.equal(
      formatCredentialsReadyChatMessage({
        gameTitle: 'Orion Stars',
        username: 'nova_77',
        password: 'Pass#1234',
      }),
      '🔑 Orion Stars Credentials Ready\nUser: nova_77 • Pass: Pass#1234\nView in Gaming IDs ->'
    );

    assert.equal(
      formatTransactionStatusChatMessage({
        transactionType: 'topup',
        status: 'completed',
        amount: 20,
        bonusAmount: 4,
        finalCredit: 24,
        gameName: 'Fire Kirin',
      }),
      '✅ Top-Up Approved: $24.00\nFire Kirin • $20 + $4 bonus'
    );
  });
});
