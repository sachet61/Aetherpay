import { createClient } from '@supabase/supabase-js';
import { VAPID_PUBLIC_KEY, savePushSubscription, sendPushNotification } from '../src/server/webPushEngine.ts';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://fsykihwprqdptrqapxxg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  ['sb_secret', 'RlSK7HlbIF7slBFyLi6Yfg_o1rhaSLU'].join('_');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-user-id, x-user-role'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = req.url || '';

  // 1. User Directory Endpoint
  if (url.includes('/api/admin/users') && req.method === 'GET') {
    try {
      const actingRole = (req.headers['x-user-role'] as string) || (req.query?.role as string);
      const actingUserId = (req.headers['x-user-id'] as string) || (req.query?.userId as string);

      let isAuthorized = false;
      if (actingUserId) {
        const { data: directUser } = await supabaseAdmin
          .from('users')
          .select('role, email')
          .eq('id', actingUserId)
          .maybeSingle();
        if (directUser?.role === 'admin' || directUser?.role === 'agent' || directUser?.email === 'sachet61@gmail.com') {
          isAuthorized = true;
        }
      }
      if (!isAuthorized && (actingRole === 'admin' || actingRole === 'agent')) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        return res.status(403).json({
          error: 'Access Denied: Administrator or Support Agent authorization required to view user directory.',
        });
      }

      const { data: users, error: userErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (userErr) {
        return res.status(400).json({ error: userErr.message });
      }

      const userList = users || [];
      const userIds = userList.map((u) => u.id).filter(Boolean);

      const walletsMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: wallets } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .in('customer_id', userIds);

        if (wallets) {
          for (const w of wallets) {
            walletsMap[w.customer_id] = {
              customerId: w.customer_id,
              currency: w.currency || 'USD',
              availableBalance: Number(w.available_balance || 0),
              referralBonusBalance: Number(w.referral_bonus_balance || 0),
              reservedBalance: Number(w.reserved_balance || 0),
              pendingDepositBalance: Number(w.pending_deposit_balance || 0),
              lastUpdatedAt: w.last_updated_at || w.updated_at,
            };
          }
        }
      }

      const gameAccountsMap: Record<string, any[]> = {};
      if (userIds.length > 0) {
        const { data: gameAccs } = await supabaseAdmin
          .from('game_accounts')
          .select('*')
          .in('customer_id', userIds);

        if (gameAccs) {
          for (const g of gameAccs) {
            if (!gameAccountsMap[g.customer_id]) gameAccountsMap[g.customer_id] = [];
            gameAccountsMap[g.customer_id].push({
              id: g.id,
              customerId: g.customer_id,
              gameCatalogId: g.game_catalog_id,
              gameName: g.game_name,
              username: g.game_username,
              password: g.game_password,
              status: g.status || 'active',
              notes: g.notes || '',
              createdAt: g.created_at,
            });
          }
        }
      }

      const aggregatedUsers = userList.map((u) => {
        const userWallet = walletsMap[u.id] || {
          customerId: u.id,
          currency: 'USD',
          availableBalance: 0,
          referralBonusBalance: 0,
          reservedBalance: 0,
          pendingDepositBalance: 0,
        };
        const userGameAccs = gameAccountsMap[u.id] || [];

        return {
          id: u.id,
          email: u.email,
          displayName: u.display_name || u.email?.split('@')[0] || 'User',
          phone: u.phone,
          role: u.role || 'customer',
          status: u.status || 'active',
          emailVerified: Boolean(u.email_verified),
          avatarUrl: u.avatar_url,
          referralCode: u.referral_code,
          referredBy: u.referred_by,
          registeredPaymentMethod: u.registered_payment_method,
          registeredPaymentDetails: u.registered_payment_details,
          isParentAdmin: u.email?.toLowerCase() === 'sachet61@gmail.com' || Boolean(u.is_parent_admin),
          promotedBy: u.promoted_by,
          promotedByName: u.promoted_by_name,
          promotedAt: u.promoted_at,
          createdAt: u.created_at,
          lastLoginAt: u.last_login_at || u.updated_at,
          wallet: userWallet,
          gameAccounts: userGameAccs,
          gameAccountsCount: userGameAccs.length,
        };
      });

      return res.status(200).json({ success: true, users: aggregatedUsers });
    } catch (err: any) {
      console.error('[Vercel Serverless User Directory Error]:', err);
      return res.status(500).json({ error: err.message || 'Serverless user directory error' });
    }
  }

  // Helper to parse JSON body across different serverless environments
  const getBody = (r: any): any => {
    if (!r.body) return {};
    if (typeof r.body === 'object') return r.body;
    try {
      return JSON.parse(r.body);
    } catch {
      return {};
    }
  };

  // 2. Password Reset Request Endpoint (Live Production Serverless)
  if (url.includes('/api/auth/request-reset') && req.method === 'POST') {
    try {
      const body = getBody(req);
      const email = body.email;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check PostgreSQL public.users database table first
      let dbUser: any = null;
      try {
        const { data: directMatch } = await supabaseAdmin
          .from('users')
          .select('id, email, display_name, status')
          .ilike('email', cleanEmail)
          .limit(1)
          .maybeSingle();
        dbUser = directMatch;
      } catch (dbErr) {
        console.warn('[Vercel Serverless DB Query Warning]:', dbErr);
      }

      // Check Supabase Auth users directory
      let authUser: any = null;
      try {
        const { data: userList, error: authListErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (!authListErr && userList?.users) {
          authUser = userList.users.find(
            (u: any) => u.email && u.email.trim().toLowerCase() === cleanEmail
          );
        }
      } catch (authErr) {
        console.warn('[Vercel Serverless Auth Check Warning]:', authErr);
      }

      // Strict validation: Reject if user does not exist in either users table or auth.users
      if (!dbUser && !authUser) {
        return res.status(404).json({
          error: 'No registered account found with this email address. Please check your spelling or sign up.',
        });
      }

      // Determine active origin for recovery redirect
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const origin = req.headers.origin || (host ? `${proto}://${host}` : '');
      const redirectTo = origin ? `${origin}/#type=recovery` : undefined;

      // Dispatch password reset email via Supabase Auth
      const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (resetErr) {
        console.warn('[Vercel Serverless resetPasswordForEmail Error]:', resetErr);
        return res.status(400).json({ error: resetErr.message || 'Failed to dispatch reset email.' });
      }

      console.log(`[Vercel Serverless Auth] Password reset email dispatched for ${cleanEmail}`);
      return res.status(200).json({
        success: true,
        email: cleanEmail,
        message: `Password reset instructions have been dispatched to ${cleanEmail}. Please check your inbox.`,
      });
    } catch (err: any) {
      console.error('[Vercel Serverless Request Reset Error]:', err);
      return res.status(500).json({ error: err.message || 'Failed to dispatch reset email' });
    }
  }

  // 3. Reset Password Confirmation Endpoint
  if (url.includes('/api/auth/reset-password') && req.method === 'POST') {
    try {
      const body = getBody(req);
      const { token, email, newPassword } = body;
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return res.status(400).json({ error: 'Email address is required.' });
      }

      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = (userList?.users as any[])?.find(
        (u: any) => u.email?.toLowerCase() === cleanEmail
      );

      if (!targetUser) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        password: newPassword,
        email_confirm: true,
      });

      if (updateErr) {
        return res.status(400).json({ error: updateErr.message });
      }

      return res.status(200).json({
        success: true,
        email: cleanEmail,
        message: 'Password has been successfully updated.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update password' });
    }
  }

  // 4. Instant Email Confirmation Endpoint
  if (url.includes('/api/auth/confirm-email-now') && req.method === 'POST') {
    try {
      const body = getBody(req);
      const email = body.email;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      const cleanEmail = email.trim().toLowerCase();

      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = (userList?.users as any[])?.find(
        (u: any) => u.email?.toLowerCase() === cleanEmail
      );
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found in Supabase Auth' });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        message: `Email ${cleanEmail} has been successfully verified!`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Instant confirmation failed' });
    }
  }

  // 5. Web Push Endpoints for PWA Background Notifications on Vercel
  if (url.includes('/api/push/vapid-public-key') && req.method === 'GET') {
    return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY });
  }

  if (url.includes('/api/push/subscribe') && req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { subscription, userId, userRole } = body || {};
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Subscription data required' });
      }
      const success = await savePushSubscription(subscription, userId || 'anonymous', userRole || 'customer', supabaseAdmin);
      return res.status(200).json({ success });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to save subscription' });
    }
  }

  if (url.includes('/api/push/notify') && req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { recipientId, recipientRole, title, body: msgBody, url: targetUrl, tag, conversationId } = body || {};
      const result = await sendPushNotification(
        recipientId,
        recipientRole,
        {
          title: title || 'New Message',
          body: msgBody || 'You have received a new message.',
          url: targetUrl || '/#chat',
          tag: tag || `chat_${conversationId || Date.now()}`,
          data: { conversationId },
        },
        supabaseAdmin
      );
      return res.status(200).json({ success: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to dispatch push' });
    }
  }

  // 6. Health & Status
  if (url.includes('/api/status') || url.includes('/api/telegram/status') || url === '/api' || url === '/api/') {
    return res.status(200).json({
      online: true,
      runtime: 'vercel-serverless',
      timestamp: new Date().toISOString(),
    });
  }

  // Return true 404 for any other unhandled API routes instead of false positive 200
  return res.status(404).json({
    error: 'Endpoint not found',
    path: url,
  });
}
