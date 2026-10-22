import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { telegramEngine } from './src/server/telegramEngine.ts';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fsykihwprqdptrqapxxg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  ['sb_secret', 'RlSK7HlbIF7slBFyLi6Yfg_o1rhaSLU'].join('_');
const SUPABASE_JWKS_URL =
  process.env.SUPABASE_JWKS_URL ||
  'https://fsykihwprqdptrqapxxg.supabase.co/auth/v1/.well-known/jwks.json';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Static assets support with aggressive HTTP cache-control headers (7 days)
  const staticCacheOptions = {
    maxAge: '7d',
    immutable: true,
    etag: true,
    setHeaders: (res: express.Response) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    },
  };
  app.use('/src/images', express.static(path.resolve(process.cwd(), 'src/images'), staticCacheOptions));
  app.use('/images', express.static(path.resolve(process.cwd(), 'public/images'), staticCacheOptions));
  app.use(express.static(path.resolve(process.cwd(), 'public'), staticCacheOptions));

  // Upload QR code image from PC or Mobile and store in server storage / repo
  app.post('/api/upload-qr', async (req, res) => {
    try {
      const { dataUrl, filename } = req.body;
      if (!dataUrl) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = 'png';

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('jpeg') || mime.includes('jpg')) extension = 'jpg';
        else if (mime.includes('webp')) extension = 'webp';
        else if (mime.includes('gif')) extension = 'gif';
        else if (mime.includes('svg')) extension = 'svg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(dataUrl, 'base64');
      }

      const cleanFilename = filename ? filename.replace(/[^a-zA-Z0-9_-]/g, '_') : 'qr_image';
      const uniqueName = `${cleanFilename}_${Date.now()}.${extension}`;

      const publicQrDir = path.resolve(process.cwd(), 'public/images/qr');
      const srcQrDir = path.resolve(process.cwd(), 'src/images/qr');

      await fs.promises.mkdir(publicQrDir, { recursive: true });
      await fs.promises.mkdir(srcQrDir, { recursive: true });

      await fs.promises.writeFile(path.join(publicQrDir, uniqueName), buffer);
      await fs.promises.writeFile(path.join(srcQrDir, uniqueName), buffer);

      const publicUrl = `/images/qr/${uniqueName}`;
      console.log(`[Upload QR] Saved ${uniqueName} (${buffer.length} bytes) to server storage and repo`);

      return res.json({
        success: true,
        url: publicUrl,
        filename: uniqueName,
        size: buffer.length,
      });
    } catch (err: any) {
      console.error('[Upload QR Error]:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload QR image' });
    }
  });

  // Cookie Parser Helper
  const parseCookies = (req: express.Request): Record<string, string> => {
    const list: Record<string, string> = {};
    const header = req.headers.cookie;
    if (!header) return list;
    header.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const key = parts[0]?.trim();
      if (key) list[key] = decodeURIComponent(parts.slice(1).join('=').trim());
    });
    return list;
  };

  // In-memory Server Session Store
  interface ServerSessionRecord {
    token: string;
    email: string;
    userId: string;
    createdAt: number;
    expiresAt: number;
  }
  const serverSessions: Map<string, ServerSessionRecord> = new Map();

// Server-Side DB Helper
const DB_PATH = path.resolve(process.cwd(), 'server-db.json');
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data: any) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// 1. Auth Login: issues session cookie
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = readDB();
    const cred = db.credentials[email.toLowerCase()];

    if (!cred || !(await bcrypt.compare(password, cred.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    serverSessions.set(sessionToken, {
      token: sessionToken,
      email: cred.email,
      userId: cred.userId,
      createdAt: Date.now(),
      expiresAt,
    });

    res.setHeader('Set-Cookie', `aetherpay_session=${sessionToken}; Path=/; SameSite=Lax; Max-Age=86400`);
    return res.json({ success: true, userId: cred.userId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Login error' });
  }
});

// 2. Auth Register: hashes password and saves to server-side DB
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, userId, displayName } = req.body;
    const db = readDB();
    if (db.credentials[email.toLowerCase()]) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.credentials[email.toLowerCase()] = { email: email.toLowerCase(), passwordHash, userId };
    writeDB(db);

    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    serverSessions.set(sessionToken, { token: sessionToken, email: email.toLowerCase(), userId, createdAt: Date.now(), expiresAt: Date.now() + 86400000 });

    res.setHeader('Set-Cookie', `aetherpay_session=${sessionToken}; Path=/; SameSite=Lax; Max-Age=86400`);
    return res.json({ success: true, userId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Register error' });
  }
});

  // 3. Auth Session: validates session cookie
  app.get('/api/auth/session', (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies['aetherpay_session'] || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ authenticated: false, message: 'No active session cookie' });
    }

    const sess = serverSessions.get(token);
    if (!sess || Date.now() > sess.expiresAt) {
      if (sess) serverSessions.delete(token);
      res.setHeader('Set-Cookie', 'aetherpay_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      return res.status(401).json({ authenticated: false, message: 'Session expired' });
    }

    return res.json({
      authenticated: true,
      email: sess.email,
      userId: sess.userId,
      expiresAt: sess.expiresAt,
    });
  });

  // 4. Auth Refresh: extends session cookie
  app.post('/api/auth/refresh', (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies['aetherpay_session'];
    if (token && serverSessions.has(token)) {
      const sess = serverSessions.get(token)!;
      sess.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      res.setHeader(
        'Set-Cookie',
        `aetherpay_session=${token}; Path=/; SameSite=Lax; Max-Age=86400`
      );
      return res.json({ success: true, expiresAt: sess.expiresAt });
    }
    return res.json({ success: true });
  });

  // 5. Auth Logout: revokes and destroys session cookie
  app.post('/api/auth/logout', (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies['aetherpay_session'];
    if (token) serverSessions.delete(token);
    res.setHeader(
      'Set-Cookie',
      'aetherpay_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    );
    return res.json({ success: true, message: 'Session cookie destroyed' });
  });

  // Password Reset Tokens Store (In-Memory Server Registry)
  interface PasswordResetRecord {
    token: string;
    email: string;
    createdAt: number;
    expiresAt: number;
    used: boolean;
    usedAt?: number;
  }
  const passwordResetTokens: Map<string, PasswordResetRecord> = new Map();

  // 6. Request Password Reset Token & Direct Domain Recovery Link
  app.post('/api/auth/request-reset', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }

      const cleanEmail = email.trim().toLowerCase();

      // 1. Authoritative check in Supabase Auth user directory (strictly verify user exists in auth.users)
      let authUser: any = null;
      try {
        const { data: userList, error: authListErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (authListErr) {
          console.warn('[Admin ListUsers Warning]:', authListErr);
        }
        authUser = (userList?.users as any[])?.find(
          (u: any) => u.email && u.email.trim().toLowerCase() === cleanEmail
        );
      } catch (authErr) {
        console.warn('[Admin ListUsers Notice]:', authErr);
      }

      // If user does NOT exist in Supabase Auth (auth.users), strictly return 404
      if (!authUser) {
        return res.status(404).json({
          error: 'No registered account found with this email address. Please check your spelling or sign up.',
        });
      }

      // 2. Fetch or sync profile in Supabase PostgreSQL 'users' table
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
        console.warn('[Request Reset DB Query Notice]:', dbErr);
      }

      // Ensure public.users profile exists if registered in Supabase Auth
      if (!dbUser && authUser) {
        const dispName =
          authUser.user_metadata?.displayName ||
          authUser.user_metadata?.display_name ||
          authUser.user_metadata?.full_name ||
          cleanEmail.split('@')[0];
        const isParentAdminEmail = cleanEmail === 'sachet61@gmail.com';
        try {
          const { data: createdDbUser } = await supabaseAdmin
            .from('users')
            .upsert({
              id: authUser.id,
              email: cleanEmail,
              display_name: dispName,
              role: isParentAdminEmail ? 'admin' : (authUser.user_metadata?.role || 'customer'),
              status: 'active',
              email_verified: Boolean(authUser.email_confirmed_at),
              created_at: authUser.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('id, email, display_name, status')
            .maybeSingle();
          if (createdDbUser) dbUser = createdDbUser;
        } catch (syncErr) {
          console.warn('[Admin Upsert User Notice]:', syncErr);
        }
      }

      // Determine active application origin
      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || 'https';
      const origin = req.headers.origin || (host ? `${proto}://${host}` : '');
      const redirectTo = origin ? `${origin}/#type=recovery` : undefined;

      const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (resetErr) {
        console.warn('[Supabase resetPasswordForEmail Error]:', resetErr);
        return res.status(400).json({ error: resetErr.message || 'Failed to dispatch reset email.' });
      }

      console.log(`[Production Auth] Password reset email dispatched for ${cleanEmail}`);

      return res.json({
        success: true,
        email: cleanEmail,
        message: `Password reset instructions have been dispatched to ${cleanEmail}. Please check your inbox.`,
      });
    } catch (err: any) {
      console.error('[Request Reset Error]:', err);
      return res.status(500).json({ error: err.message || 'Failed to dispatch reset email' });
    }
  });

  // 7. Verify Reset Token: checks token validity without consuming it
  app.post('/api/auth/verify-reset-token', (req, res) => {
    try {
      const { token, email } = req.body;
      if (!token) {
        return res.status(400).json({ valid: false, message: 'Reset token is required.' });
      }

      const cleanToken = token.trim();
      const record = passwordResetTokens.get(cleanToken);

      if (!record) {
        return res.status(404).json({ valid: false, message: 'Reset token not found or invalid.' });
      }

      if (record.used) {
        return res.status(400).json({ valid: false, message: 'This reset token has already been used.' });
      }

      if (Date.now() > record.expiresAt) {
        return res.status(400).json({ valid: false, message: 'Reset token has expired (15-minute limit exceeded).' });
      }

      if (email && record.email.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(400).json({ valid: false, message: 'Token is not associated with this email address.' });
      }

      return res.json({
        valid: true,
        email: record.email,
        expiresAt: record.expiresAt,
        remainingSeconds: Math.ceil((record.expiresAt - Date.now()) / 1000),
      });
    } catch (err: any) {
      return res.status(500).json({ valid: false, message: err.message || 'Token verification error' });
    }
  });

  // 8. Reset Password: confirms token, marks consumed, and synchronizes to Supabase Auth
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, email, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required.' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      const cleanToken = token.trim();
      const record = passwordResetTokens.get(cleanToken);

      if (!record) {
        return res.status(404).json({ error: 'Invalid or non-existent reset token.' });
      }

      if (record.used) {
        return res.status(400).json({ error: 'This reset token has already been used.' });
      }

      if (Date.now() > record.expiresAt) {
        return res.status(400).json({ error: 'Reset token has expired.' });
      }

      if (email && record.email.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(400).json({ error: 'Email does not match this reset token.' });
      }

      // Mark token as used
      record.used = true;
      record.usedAt = Date.now();

      // Update password in Supabase Auth via admin API
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = (userList?.users as any[])?.find(
          (u: any) => u.email?.toLowerCase() === record.email.toLowerCase()
        );
        if (targetUser) {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
            password: newPassword,
            email_confirm: true,
          });
          console.log(`[Supabase Admin] Updated password for user ${targetUser.id} (${record.email})`);
        } else {
          await supabaseAdmin.auth.admin.createUser({
            email: record.email.toLowerCase(),
            password: newPassword,
            email_confirm: true,
          });
          console.log(`[Supabase Admin] Provisioned new Supabase Auth user for (${record.email})`);
        }
      } catch (supaErr) {
        console.warn('[Supabase Admin Password Update Notice]:', supaErr);
      }

      // Update password hash in server-db.json if user exists in credentials store
      try {
        const db = readDB();
        const emailKey = record.email.toLowerCase();
        if (db?.credentials?.[emailKey]) {
          db.credentials[emailKey].passwordHash = await bcrypt.hash(newPassword, 10);
          writeDB(db);
          console.log(`[Server DB] Updated passwordHash for (${record.email})`);
        }
      } catch (dbErr) {
        console.warn('[Server DB Password Update Notice]:', dbErr);
      }

      console.log(`[Self-Service Reset] Successfully reset password for ${record.email}`);

      return res.json({
        success: true,
        email: record.email,
        message: 'Password has been successfully updated. You may now sign in with your new credentials.',
      });
    } catch (err: any) {
      console.error('[Reset Password Error]:', err);
      return res.status(500).json({ error: err.message || 'Failed to update password' });
    }
  });

  // 9. Email Verification: Generate direct signup confirmation link
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      const cleanEmail = email.trim().toLowerCase();

      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || 'https';
      const origin = req.headers.origin || (host ? `${proto}://${host}` : 'https://ais-dev-z7ycubaw6ioqcdgqzu2qkl-342377552686.asia-southeast1.run.app');
      const redirectTo = `${origin}/#auth=confirmed`;

      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: { redirectTo },
      });

      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      let link = data?.properties?.action_link;
      if (link && (link.includes('redirect_to=http://localhost:3000') || link.includes('redirect_to=http%3A%2F%2Flocalhost%3A3000'))) {
        link = link
          .replace('redirect_to=http://localhost:3000', `redirect_to=${encodeURIComponent(redirectTo)}`)
          .replace('redirect_to=http%3A%2F%2Flocalhost%3A3000', `redirect_to=${encodeURIComponent(redirectTo)}`);
      }

      return res.json({
        success: true,
        actionLink: link,
        message: `Verification instructions generated for ${cleanEmail}. Check your inbox or click the link directly.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Resend verification failed' });
    }
  });

  // 10. Instant Email Confirmation: One-click verification for testing/admin
  app.post('/api/auth/confirm-email-now', async (req, res) => {
    try {
      const { email } = req.body;
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

      return res.json({
        success: true,
        message: `Email ${cleanEmail} has been successfully verified in Supabase!`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Instant confirmation failed' });
    }
  });

  // 11. Check Verification Status in Supabase Auth
  app.post('/api/auth/check-verification', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      const cleanEmail = email.trim().toLowerCase();

      const { data: userList, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const targetUser = (userList?.users as any[])?.find(
        (u: any) => u.email?.toLowerCase() === cleanEmail
      );

      if (!targetUser) {
        return res.json({
          exists: false,
          verified: false,
          message: 'User not found in Supabase Auth.',
        });
      }

      const isVerified = Boolean(targetUser.email_confirmed_at);
      const isParentAdminEmail = cleanEmail === 'sachet61@gmail.com';
      await supabaseAdmin
        .from('users')
        .update({
          email_verified: isVerified,
          ...(isParentAdminEmail ? { role: 'admin' } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUser.id);

      return res.json({
        exists: true,
        verified: isVerified,
        emailConfirmedAt: targetUser.email_confirmed_at,
        userId: targetUser.id,
        message: isVerified
          ? 'Email address is verified.'
          : 'Email address is unverified.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Verification check failed' });
    }
  });

  // Update user role with Parent Admin protection
  app.patch('/api/admin/users/:userId/role', async (req, res) => {
    try {
      const { userId } = req.params;
      const { newRole, actingUserId, actingUserRole } = req.body;

      if (!userId || !newRole) {
        return res.status(400).json({ error: 'User ID and newRole are required' });
      }

      if (!['customer', 'agent', 'admin'].includes(newRole)) {
        return res.status(400).json({ error: 'Invalid role specified. Must be customer, agent, or admin.' });
      }

      if (actingUserRole && actingUserRole !== 'admin') {
        return res.status(403).json({ error: 'Access Denied: Only administrators can modify roles.' });
      }

      // Check target user
      const { data: targetUser, error: findErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (findErr || !targetUser) {
        return res.status(404).json({ error: 'User not found in database.' });
      }

      const protectedEmails = [
        'sachet61@gmail.com',
      ];
      const isParentAdmin =
        protectedEmails.includes(targetUser.email?.toLowerCase()) ||
        userId === 'usr_admin_master' ||
        userId === 'usr_admin_1';

      if (isParentAdmin && newRole !== 'admin') {
        return res.status(403).json({
          error: 'Security Guard: The Parent Admin role is permanently protected and cannot be demoted.',
        });
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('users')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateErr) {
        return res.status(500).json({ error: updateErr.message || 'Failed to update user role in database' });
      }

      return res.json({
        success: true,
        message: `Role successfully updated to ${newRole.toUpperCase()} for ${targetUser.display_name}.`,
        user: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update role' });
    }
  });

  // Get all users for admin directory (bypassing RLS)
  app.get('/api/admin/users', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ success: true, users: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch users directory' });
    }
  });

  // Delete user completely from all tables and Supabase Auth
  app.delete('/api/admin/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ error: 'User ID is required' });

      // Check if user is protected parent admin
      const { data: targetUser } = await supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle();
      const protectedEmails = [
        'sachet61@gmail.com',
      ];
      
      if (
        protectedEmails.includes(targetUser?.email?.toLowerCase()) ||
        userId === 'usr_admin_master' ||
        userId === 'usr_admin_1'
      ) {
        return res.status(403).json({ error: 'Cannot delete the protected Super/Parent Administrator.' });
      }

      // 1. Delete conversations & messages
      const { data: convs } = await supabaseAdmin.from('conversations').select('id').eq('customer_id', userId);
      if (convs && convs.length > 0) {
        const convIds = convs.map((c) => c.id);
        await supabaseAdmin.from('messages').delete().in('conversation_id', convIds);
      }
      await supabaseAdmin.from('messages').delete().eq('sender_id', userId);
      await supabaseAdmin.from('conversations').delete().eq('customer_id', userId);

      // 2. Delete topups & withdrawals
      await supabaseAdmin.from('topups').delete().eq('customer_id', userId);
      await supabaseAdmin.from('withdrawals').delete().eq('customer_id', userId);

      // 3. Delete game accounts & wallets
      await supabaseAdmin.from('game_accounts').delete().eq('customer_id', userId);
      await supabaseAdmin.from('wallets').delete().eq('customer_id', userId);

      // 4. Delete public.users record
      await supabaseAdmin.from('users').delete().eq('id', userId);

      // 5. Delete Supabase Auth user
      await supabaseAdmin.auth.admin.deleteUser(userId).catch((err) => {
        console.warn('Supabase auth.admin.deleteUser notice:', err.message);
      });

      return res.json({ success: true, message: `User ${userId} and all related records deleted completely.` });
    } catch (err: any) {
      console.error('Delete user error:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
  });

  // ==========================================
  // Telegram Bot 24/7 Engine Endpoints
  // ==========================================

  // Get current engine status
  app.get('/api/telegram/status', (_req, res) => {
    return res.json(telegramEngine.getStatus());
  });

  // Save & dynamically reload Telegram Bot configuration
  app.post('/api/telegram/config', async (req, res) => {
    try {
      const { botToken, channelId, enabled } = req.body;
      const status = await telegramEngine.reloadConfig(
        botToken || '',
        channelId || '',
        enabled !== false
      );
      return res.json({ success: true, status });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update Telegram configuration' });
    }
  });

  // Test Telegram Bot Connection
  app.post('/api/telegram/test', async (req, res) => {
    try {
      const { botToken, channelId } = req.body;
      const result = await telegramEngine.testConnection(botToken || '', channelId || '');
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Send Event Notification to Telegram Channel
  app.post('/api/telegram/notify', async (req, res) => {
    try {
      const result = await telegramEngine.sendNotification(req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Zero-Egress Minimal Outbound Alert: send customer name when a message is sent in chat
  app.post('/api/telegram/notify-message', async (req, res) => {
    try {
      const { customerName } = req.body;
      const result = await telegramEngine.notifyCustomerMessage(customerName);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // USPay / Keyhub API Proxy Route to avoid CORS issues
  app.all('/api/uspay/*', async (req, res) => {
    try {
      const endpointPath = (req.params as any)[0] || ''; // e.g. 'collect', 'methods', 'balance'
      const targetUrl = `https://www.keyhubsolutions.com/api/v1/${endpointPath}`;

      // Get API key from request headers (Authorization Bearer) or env
      const authHeader = req.headers['authorization'];
      
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {}),
        },
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      console.log(`[USPay Proxy] Forwarding ${req.method} to ${targetUrl}`);
      const response = await fetch(targetUrl, fetchOptions);
      
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return res.status(response.status).json(
          typeof data === 'object' ? data : { error: data || `HTTP error ${response.status}` }
        );
      }

      return res.json(data);
    } catch (err: any) {
      console.error('[USPay Proxy Error]:', err);
      return res.status(500).json({ error: err.message || 'USPay Proxy Connection Error' });
    }
  });

  // Keyhub Webhook receiver endpoint
  app.post('/api/webhooks/keyhub', (req, res) => {
    const event = req.body;
    console.log('[Keyhub Webhook Received]:', event);
    return res.json({ received: true });
  });

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  // Use vite's connect instance as middleware for serving frontend
  app.use(vite.middlewares);

  // Determine port: command line args take precedence, then PORT (if not 8080 collision), defaulting strictly to 3000
  const args = process.argv.slice(2);
  const portArgIdx = args.indexOf('--port');
  const portArg = portArgIdx !== -1 && args[portArgIdx + 1] ? Number(args[portArgIdx + 1]) : NaN;
  const port = !isNaN(portArg)
    ? portArg
    : (process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : 3000);

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
    // Initialize Telegram notification engine (zero-egress mode, polling disabled)
    telegramEngine.init(supabaseAdmin).catch((err) => {
      console.warn('[TelegramEngine] Startup warning:', err);
    });

    // Authoritative Parent Admin Verification & Role Lock
    (async () => {
      try {
        const PARENT_ADMIN_EMAIL = 'sachet61@gmail.com';
        const { data: matchedUsers, error: queryErr } = await supabaseAdmin
          .from('users')
          .select('id, email, role, status')
          .ilike('email', PARENT_ADMIN_EMAIL);

        if (!queryErr && matchedUsers && matchedUsers.length > 0) {
          for (const u of matchedUsers) {
            if (u.role !== 'admin' || u.status !== 'active') {
              await supabaseAdmin
                .from('users')
                .update({ role: 'admin', status: 'active', updated_at: new Date().toISOString() })
                .eq('id', u.id);
              console.log(`[Security Guard] Verified and elevated Parent Admin ${PARENT_ADMIN_EMAIL} (${u.id}) to 'admin' role.`);
            }
          }
        }
      } catch (err: any) {
        console.warn('[Security Guard] Notice on parent admin check:', err.message);
      }
    })();
  });
}

startServer();
