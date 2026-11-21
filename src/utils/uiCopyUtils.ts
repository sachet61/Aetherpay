export function formatShortUuid(id: string | null | undefined): string {
  const trimmed = (id || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function decodeBasicHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function escapeHtmlText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInlineMarkdownToHtml(line: string): string {
  const escaped = escapeHtmlText(line);
  return escaped
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
}

export function htmlToPlainEditorText(html: string | null | undefined): string {
  if (!html) return '';
  let text = html.replace(/\r\n/g, '\n');

  text = text.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim();
    return clean ? `### ${clean}\n\n` : '';
  });

  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim();
    return clean ? `**${clean}**` : '';
  });

  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim();
    return clean ? `*${clean}*` : '';
  });

  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => {
    const clean = inner.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
    return clean ? `- ${clean}\n` : '';
  });

  text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim();
    return clean ? `${clean}\n\n` : '';
  });

  text = text.replace(/<[^>]+>/g, '');
  text = decodeBasicHtmlEntities(text);

  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function plainEditorTextToHtml(plainText: string | null | undefined): string {
  const normalized = (plainText || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  const blocks = normalized.split(/\n\s*\n/);
  const htmlBlocks: string[] = [];

  for (const rawBlock of blocks) {
    const lines = rawBlock
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (/^#{1,6}\s+/.test(line)) {
        const headingText = line.replace(/^#{1,6}\s+/, '').trim();
        htmlBlocks.push(`<h3>${formatInlineMarkdownToHtml(headingText)}</h3>`);
        i += 1;
        continue;
      }

      if (/^[-*•]\s+/.test(line)) {
        const listItems: string[] = [];
        while (i < lines.length && /^[-*•]\s+/.test(lines[i])) {
          const itemText = lines[i].replace(/^[-*•]\s+/, '').trim();
          listItems.push(`<li>${formatInlineMarkdownToHtml(itemText)}</li>`);
          i += 1;
        }
        htmlBlocks.push(`<ul>\n  ${listItems.join('\n  ')}\n</ul>`);
        continue;
      }

      const paraLines: string[] = [];
      while (
        i < lines.length &&
        !/^#{1,6}\s+/.test(lines[i]) &&
        !/^[-*•]\s+/.test(lines[i])
      ) {
        paraLines.push(formatInlineMarkdownToHtml(lines[i]));
        i += 1;
      }
      if (paraLines.length > 0) {
        htmlBlocks.push(`<p>${paraLines.join('<br />')}</p>`);
      }
    }
  }

  return htmlBlocks.join('\n');
}

export function formatCompactDollar(value: number): string {
  const num = Number(value || 0);
  if (Math.abs(num - Math.round(num)) < 0.005) {
    return `$${Math.round(num)}`;
  }
  return `$${num.toFixed(2)}`;
}

export function formatTopUpApprovedChatMessage(params: {
  totalCredit: number;
  baseAmount: number;
  bonusAmount?: number;
  gameName?: string;
  gameUsername?: string;
  hasActiveCredentials: boolean;
}): string {
  const bonus = Number(params.bonusAmount || 0);
  const gameLabel = params.gameName || 'Game';
  const baseLine = `${gameLabel} • ${formatCompactDollar(params.baseAmount)}${
    bonus > 0 ? ` + ${formatCompactDollar(bonus)} bonus` : ''
  }`;

  if (params.hasActiveCredentials && params.gameUsername) {
    return `✅ Top-Up Approved: $${params.totalCredit.toFixed(2)}\n${baseLine} (${params.gameUsername})`;
  }

  if (params.hasActiveCredentials) {
    return `✅ Top-Up Approved: $${params.totalCredit.toFixed(2)}\n${baseLine}`;
  }

  return `✅ Top-Up Approved: $${params.totalCredit.toFixed(2)}\n${baseLine}\nRequest Game ID ->`;
}

export function formatTopUpSubmittedChatMessage(params: {
  amount: number;
  bonusAmount?: number;
  methodName: string;
  gameName?: string;
  isCompleted?: boolean;
}): string {
  const bonus = Number(params.bonusAmount || 0);
  const total = params.amount + bonus;
  const gameLabel = params.gameName || 'Game';
  const statusLine = params.isCompleted
    ? `✅ Top-Up Approved: $${total.toFixed(2)}`
    : total > 0
    ? `⏳ Top-Up Submitted: $${total.toFixed(2)}`
    : '📷 Payment Proof Submitted';
  const amountBreakdown =
    params.amount > 0 && bonus > 0
      ? ` (${formatCompactDollar(params.amount)} + ${formatCompactDollar(bonus)} bonus)`
      : '';
  return `${statusLine}\n${gameLabel} • ${params.methodName}${amountBreakdown}`;
}

export function formatCashoutChatMessage(params: {
  amount: number;
  netPayout?: number;
  methodName: string;
  methodDetail?: string;
  gameName?: string;
  status: 'pending' | 'submitted' | 'completed' | 'rejected';
  payoutReference?: string;
}): string {
  const methodLabel = params.methodName || 'Payout';
  const gameLabel = params.gameName || 'Game';

  if (params.status === 'completed') {
    const payout = Number(params.netPayout ?? params.amount);
    return `✅ Cashout Completed: $${payout.toFixed(2)}\n${gameLabel} • ${methodLabel}${
      params.payoutReference ? ` (${params.payoutReference})` : ''
    }`;
  }

  if (params.status === 'rejected') {
    return `❌ Cashout Declined: $${params.amount.toFixed(2)}\n${gameLabel} • ${methodLabel}`;
  }

  const cleanDetail = (params.methodDetail || '').trim().replace(/^\(|\)$/g, '');
  return `⏳ Cashout Requested: $${params.amount.toFixed(2)}\n${gameLabel} • ${methodLabel}${
    cleanDetail ? ` (${cleanDetail})` : ''
  }`;
}

export function formatCredentialsReadyChatMessage(params: {
  gameTitle: string;
  username: string;
  password?: string;
}): string {
  const passPart = params.password ? ` • Pass: ${params.password}` : '';
  return `🔑 ${params.gameTitle} Credentials Ready\nUser: ${params.username}${passPart}\nView in Gaming IDs ->`;
}

export function formatGameIdRequestChatMessage(params: {
  gameTitle: string;
  platform?: string;
}): string {
  return `🎮 Game ID Requested\n${params.gameTitle}${params.platform ? ` (${params.platform})` : ''}`;
}

export function formatGamePasswordResetChatMessage(params: {
  gameTitle: string;
  username: string;
}): string {
  return `🔑 Password Reset Requested\n${params.gameTitle} • ${params.username}`;
}

export function formatTransactionStatusChatMessage(params: {
  transactionType: 'topup' | 'withdrawal';
  status: 'completed' | 'rejected';
  amount: number;
  bonusAmount?: number;
  finalCredit?: number;
  gameName?: string;
  notes?: string;
}): string {
  const label = params.transactionType === 'topup' ? 'Top-Up' : 'Cashout';
  const bonus = Number(params.bonusAmount || 0);
  const total = Number(params.finalCredit ?? params.amount + bonus);
  const target = params.gameName || label;

  if (params.status === 'completed') {
    const breakdown =
      params.transactionType === 'topup' && bonus > 0
        ? `${target} • ${formatCompactDollar(params.amount)} + ${formatCompactDollar(bonus)} bonus`
        : `${target} • ${formatCompactDollar(params.amount)}`;
    return `✅ ${label} Approved: $${total.toFixed(2)}\n${breakdown}`;
  }

  const trimmedNote = (params.notes || '').trim();
  return `❌ ${label} Declined: $${params.amount.toFixed(2)}\n${target}${
    trimmedNote ? ` • ${trimmedNote}` : ''
  }`;
}
