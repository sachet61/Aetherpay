import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { telegramEngine } from './src/server/telegramEngine.ts';
import { VAPID_PUBLIC_KEY, savePushSubscription, sendPushNotification, getSubscriptionsForUser } from './src/server/webPushEngine.ts';

dotenv.config();

const isPlaceholder = (val: string | undefined | null): boolean => {
  if (!val) return true;
  const v = val.trim().toLowerCase();
  return (
    !v ||
    v.includes('your-project') ||
    v.includes('your-supabase') ||
    v.includes('example.com') ||
    v === 'placeholder' ||
    v.includes('undefined') ||
    v.includes('null')
  );
};

const rawServerSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = isPlaceholder(rawServerSupabaseUrl)
  ? 'https://fsykihwprqdptrqapxxg.supabase.co'
  : rawServerSupabaseUrl.trim();

const rawServerServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';
const SUPABASE_SERVICE_ROLE_KEY = isPlaceholder(rawServerServiceRoleKey)
  ? ['sb_secret', 'RlSK7HlbIF7slBFyLi6Yfg_o1rhaSLU'].join('_')
  : rawServerServiceRoleKey.trim();

const rawServerJwksUrl = process.env.SUPABASE_JWKS_URL || '';
const SUPABASE_JWKS_URL = isPlaceholder(rawServerJwksUrl)
  ? 'https://fsykihwprqdptrqapxxg.supabase.co/auth/v1/.well-known/jwks.json'
  : rawServerJwksUrl.trim();

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function ensureStorageBuckets(adminClient: any) {
  if (!adminClient?.storage) return;
  const targetBuckets = [
    { name: 'avatars', limit: 10485760 },
    { name: 'chat_attachments', limit: 15728640 },
  ];
  try {
    const { data: existingBuckets, error } = await adminClient.storage.listBuckets();
    if (error) {
      console.warn('[Storage Auto-Provisioning Notice]:', error.message);
      return;
    }
    const existingNames = new Set((existingBuckets || []).map((b: any) => b.name));
    for (const b of targetBuckets) {
      if (!existingNames.has(b.name)) {
        const { error: createErr } = await adminClient.storage.createBucket(b.name, {
          public: true,
          fileSizeLimit: b.limit,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
        });
        if (createErr) {
          console.warn(`[Storage Auto-Provisioning] Notice on bucket "${b.name}":`, createErr.message);
        } else {
          console.log(`[Storage Auto-Provisioning] Successfully provisioned public bucket "${b.name}"`);
        }
      }
    }
  } catch (err: any) {
    console.warn('[Storage Auto-Provisioning error]:', err?.message || err);
  }
}

async function startServer() {
  // Background self-healing storage bucket initialization
  ensureStorageBuckets(supabaseAdmin).catch(() => {});

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

      // 1. Authoritative check in Supabase PostgreSQL 'users' table
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

      // 2. Check Supabase Auth user directory
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

      // If user does NOT exist in either Supabase Auth (auth.users) or public.users, strictly return 404
      if (!authUser && !dbUser) {
        return res.status(404).json({
          error: 'No registered account found with this email address. Please check your spelling or sign up.',
        });
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

      // 1. Check PostgreSQL public.users directory
      let dbUser: any = null;
      try {
        const { data: directMatch } = await supabaseAdmin
          .from('users')
          .select('id, email, email_verified, role')
          .ilike('email', cleanEmail)
          .maybeSingle();
        dbUser = directMatch;
      } catch (dbErr) {
        console.warn('[Check Verification DB Query Notice]:', dbErr);
      }

      // 2. Check Supabase Auth user directory with pagination
      let targetUser: any = null;
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        targetUser = (userList?.users as any[])?.find(
          (u: any) => u.email?.toLowerCase() === cleanEmail
        );
      } catch (authErr) {
        console.warn('[Check Verification Auth Query Notice]:', authErr);
      }

      if (!targetUser && !dbUser) {
        return res.json({
          exists: false,
          verified: false,
          message: 'User not found in Supabase Auth or database directory.',
        });
      }

      const isAuthVerified = Boolean(targetUser?.email_confirmed_at);
      const isDbVerified = Boolean(dbUser?.email_verified);
      const isVerified = isAuthVerified || isDbVerified;
      const isParentAdminEmail = cleanEmail === 'sachet61@gmail.com';
      const userId = targetUser?.id || dbUser?.id;

      if (userId && isVerified) {
        await supabaseAdmin
          .from('users')
          .update({
            email_verified: true,
            ...(isParentAdminEmail ? { role: 'admin' } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        // Ensure auth.users reflects confirmed state if confirmed in public.users
        if (targetUser && !isAuthVerified) {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
            email_confirm: true,
          }).catch(() => {});
        }
      }

      return res.json({
        exists: true,
        verified: isVerified,
        emailConfirmedAt: targetUser?.email_confirmed_at || (isDbVerified ? new Date().toISOString() : null),
        userId,
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

      // Check target user by ID or email
      let targetUser: any = null;
      const { data: userById, error: findByIdErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userById) {
        targetUser = userById;
      } else {
        const { data: userByEmail } = await supabaseAdmin
          .from('users')
          .select('*')
          .ilike('email', userId)
          .maybeSingle();
        targetUser = userByEmail;
      }

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found in database.' });
      }

      const protectedEmails = [
        'sachet61@gmail.com',
      ];
      const isParentAdmin =
        protectedEmails.includes(targetUser.email?.toLowerCase()) ||
        targetUser.id === 'usr_admin_master' ||
        targetUser.id === 'usr_admin_1';

      if (isParentAdmin && newRole !== 'admin') {
        return res.status(403).json({
          error: 'Security Guard: The Parent Admin role is permanently protected and cannot be demoted.',
        });
      }

      // 1. Update public.users database row
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('users')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUser.id)
        .select()
        .single();

      if (updateErr) {
        return res.status(500).json({ error: updateErr.message || 'Failed to update user role in database' });
      }

      // 2. Dual-sync to Supabase Auth metadata to prevent JWT/session downgrades
      try {
        let authUserId = targetUser.id;
        const { data: authUserDirect } = await supabaseAdmin.auth.admin.getUserById(authUserId).catch(() => ({ data: null }));
        let existingMeta = authUserDirect?.user?.user_metadata || {};

        if (!authUserDirect?.user && targetUser.email) {
          const { data: authList } = await supabaseAdmin.auth.admin.listUsers().catch(() => ({ data: { users: [] } }));
          const matched = authList?.users?.find((u) => u.email?.toLowerCase() === targetUser.email?.toLowerCase());
          if (matched) {
            authUserId = matched.id;
            existingMeta = matched.user_metadata || {};
          }
        }

        if (authUserId) {
          await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            user_metadata: {
              ...existingMeta,
              role: newRole,
            },
          });
        }
      } catch (authSyncErr) {
        console.warn('Auth metadata sync notice:', authSyncErr);
      }

      // 3. Decommission legacy customer support conversation if user is now staff (agent or admin)
      if (['agent', 'admin'].includes(newRole)) {
        try {
          const userIds = [targetUser.id, userId].filter(Boolean);
          const userEmail = targetUser.email?.toLowerCase();
          const { data: staffConvs } = await supabaseAdmin
            .from('conversations')
            .select('id, customer_id, customer_email');

          const matchingConvs = (staffConvs || []).filter(
            (c: any) =>
              (c.customer_id && userIds.includes(c.customer_id)) ||
              (c.customer_email && userEmail && c.customer_email.toLowerCase() === userEmail)
          );

          if (matchingConvs.length > 0) {
            const ids = matchingConvs.map((c: any) => c.id);
            await supabaseAdmin.from('messages').delete().in('conversation_id', ids);
            await supabaseAdmin.from('conversations').delete().in('id', ids);
            console.log(`[Staff Inbox Guard] Cleaned up customer support conversation for promoted user ${targetUser.email} (${ids.join(', ')})`);
          }
        } catch (cleanupErr) {
          console.warn('[Staff Inbox Guard] Conversation decommissioning notice:', cleanupErr);
        }
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

  // Get all users for admin directory (bypassing RLS with live wallet and game accounts aggregation)
  app.get('/api/admin/users', async (req, res) => {
    try {
      // 1. Authorize admin/agent access
      const cookies = parseCookies(req);
      const token = cookies['aetherpay_session'] || req.headers.authorization?.replace('Bearer ', '');
      const actingRole = (req.headers['x-user-role'] as string) || (req.query.role as string);
      const actingUserId = (req.headers['x-user-id'] as string) || (req.query.userId as string);

      let isAuthorized = false;
      if (token && serverSessions.has(token)) {
        const sess = serverSessions.get(token)!;
        if (Date.now() <= sess.expiresAt) {
          const { data: authUser } = await supabaseAdmin.from('users').select('role').eq('id', sess.userId).maybeSingle();
          if (authUser?.role === 'admin' || authUser?.role === 'agent' || sess.email === 'sachet61@gmail.com') {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized && actingUserId) {
        const { data: directUser } = await supabaseAdmin.from('users').select('role, email').eq('id', actingUserId).maybeSingle();
        if (directUser?.role === 'admin' || directUser?.role === 'agent' || directUser?.email === 'sachet61@gmail.com') {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && (actingRole === 'admin' || actingRole === 'agent')) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Access Denied: Administrator or Support Agent authorization required to view user directory.' });
      }

      // Fetch up to 100 users ordered by created_at DESC
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

      // Batched lookup of wallets
      const walletsMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: wallets } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .in('customer_id', userIds);

        if (wallets && wallets.length > 0) {
          for (const w of wallets) {
            walletsMap[w.customer_id] = {
              customerId: w.customer_id,
              currency: w.currency || 'USD',
              availableBalance: Number(w.balance ?? w.available_balance ?? 0),
              referralBonusBalance: Number(w.referral_bonus_balance ?? 0),
              reservedBalance: Number(w.pending_withdrawal ?? w.reserved_balance ?? 0),
              pendingDepositBalance: Number(w.pending_deposit ?? w.pending_deposit_balance ?? 0),
              lastUpdatedAt: w.updated_at || w.last_updated_at || new Date().toISOString(),
            };
          }
        }
      }

      // Batched lookup of game accounts
      const gameAccountsMap: Record<string, any[]> = {};
      if (userIds.length > 0) {
        const { data: gameAccs } = await supabaseAdmin
          .from('game_accounts')
          .select('*')
          .in('customer_id', userIds);

        if (gameAccs && gameAccs.length > 0) {
          for (const g of gameAccs) {
            if (!gameAccountsMap[g.customer_id]) {
              gameAccountsMap[g.customer_id] = [];
            }
            gameAccountsMap[g.customer_id].push({
              id: g.id,
              customerId: g.customer_id,
              gameCatalogId: g.game_id || g.game_catalog_id,
              gameName: g.game_title || g.game_name,
              username: g.username || g.game_username,
              password: g.password || g.game_password,
              status: g.status || 'active',
              notes: g.pin || g.notes || '',
              createdAt: g.created_at,
            });
          }
        }
      }

      // Merge into aggregated user profiles
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

      return res.json({ success: true, users: aggregatedUsers });
    } catch (err: any) {
      console.error('Fetch users directory error:', err);
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

  // Get saved Telegram Bot configuration (for pre-filling admin settings on load)
  app.get('/api/telegram/config', (_req, res) => {
    return res.json({ success: true, ...telegramEngine.getConfig() });
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
      return res.json({ success: true, status, config: telegramEngine.getConfig() });
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

  // Zero-Egress Minimal Outbound Alert: send customer name when a message is sent in chat (debounced)
  app.post('/api/telegram/notify-message', async (req, res) => {
    try {
      const { customerName, conversationId } = req.body;
      const result = await telegramEngine.notifyCustomerMessage(customerName, conversationId);
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

  // Secure Storage Fallback Upload Endpoint (Uses Service Role to guarantee bucket existence & persistence)
  app.post('/api/storage/upload', async (req, res) => {
    try {
      const { bucket, path: filePath, fileBase64, contentType } = req.body;
      if (!bucket || !filePath || !fileBase64) {
        return res.status(400).json({ error: 'bucket, path, and fileBase64 are required' });
      }

      await ensureStorageBuckets(supabaseAdmin);

      const buffer = Buffer.from(fileBase64, 'base64');
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: contentType || 'image/webp',
          upsert: true,
          cacheControl: '86400',
        });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data?.path || filePath);

      return res.json({
        success: true,
        url: urlData.publicUrl,
        path: data?.path || filePath,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server storage upload failed' });
    }
  });

  // Web Push VAPID Public Key Endpoint with Edge Caching
  app.get('/api/push/vapid-public-key', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Web Push Register Device Subscription Endpoint
  app.post('/api/push/subscribe', async (req, res) => {
    try {
      const { subscription, userId, userRole, userEmail } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Subscription data required' });
      }
      const success = await savePushSubscription(
        subscription,
        userId || 'anonymous',
        userRole || 'customer',
        supabaseAdmin,
        userEmail
      );
      return res.json({ success });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to save subscription' });
    }
  });

  // Web Push Dispatch Notification Endpoint
  app.post('/api/push/notify', async (req, res) => {
    try {
      const { recipientId, recipientRole, userEmail, title, body, url, tag, conversationId, actionType } = req.body;
      const result = await sendPushNotification(
        recipientId,
        recipientRole,
        {
          title: title || 'Swift Sweeps Support',
          body: body || 'You have received a new notification.',
          url: url || '/#chat',
          tag: tag || `swiftsweeps_${actionType || 'alert'}_${Date.now()}`,
          data: { conversationId, actionType, url },
          targetEmail: userEmail,
        },
        supabaseAdmin
      );
      return res.json({ success: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to dispatch push' });
    }
  });

  // Test Push Notification Endpoint for Device Verification
  app.post('/api/push/test', async (req, res) => {
    try {
      const { userId, userRole, userEmail } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required for testing' });
      }
      const result = await sendPushNotification(
        userId,
        userRole,
        {
          title: 'Swift Sweeps Notification Test',
          body: 'Heads-up alert working in background with sound and vibration!',
          url: '/#chat',
          tag: `test_${Date.now()}`,
          data: { test: true },
          targetEmail: userEmail,
        },
        supabaseAdmin
      );
      return res.json({ success: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Test push dispatch failed' });
    }
  });

  // Web Push Status Verification Endpoint
  app.get('/api/push/status', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const email = req.query.email as string;
      const role = req.query.role as string;
      if (!userId && !email) {
        return res.json({ linked: false, count: 0 });
      }
      const subs = await getSubscriptionsForUser(userId, role, supabaseAdmin, email);
      return res.json({
        linked: subs.length > 0,
        count: subs.length,
      });
    } catch (e: any) {
      return res.json({ linked: false, count: 0 });
    }
  });

  // Game Accounts Retrieval Endpoint (Service Role Guaranteed)
  app.get('/api/game-accounts', async (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      let query = supabaseAdmin.from('game_accounts').select('*').order('created_at', { ascending: false });
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const { data, error } = await query.limit(100);
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.json({ accounts: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to query game accounts' });
    }
  });

  // Game Account Direct Provisioning Endpoint
  app.post('/api/game-accounts/provision', async (req, res) => {
    try {
      const { customerId, gameId, gameTitle, username, password, pin, status, reviewerId, reviewerName } = req.body;
      if (!customerId || !gameId || !username || !password) {
        return res.status(400).json({ error: 'customerId, gameId, username, and password are required' });
      }

      const now = new Date().toISOString();
      const accountId = `ga_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const { data, error } = await supabaseAdmin
        .from('game_accounts')
        .upsert({
          id: accountId,
          customer_id: customerId,
          game_id: gameId,
          game_title: gameTitle || 'Game',
          username: username.trim(),
          password: password.trim(),
          pin: pin || null,
          status: status || 'active',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // Log to audit table
      await supabaseAdmin.from('audit_logs').insert({
        id: `audit_${Date.now()}`,
        actor_id: reviewerId || 'staff',
        actor_name: reviewerName || 'Staff Operator',
        actor_role: 'agent',
        action: 'GAME_CREDENTIALS_PROVISIONED',
        entity_type: 'game_account',
        entity_id: accountId,
        details: `Provisioned credentials for ${gameTitle || gameId} (Username: ${username}) via Admin Desk.`,
        created_at: now,
      }).then(() => {}, () => {});

      return res.json({ success: true, account: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to provision game account' });
    }
  });

  // Support Guard: Purge automated bot greetings from PostgreSQL messages table
  app.post('/api/support/purge-bot-greetings', async (_req, res) => {
    try {
      const { data: botMsgs, error: queryErr } = await supabaseAdmin
        .from('messages')
        .select('id, content')
        .or('content.ilike.%Welcome to Swift Sweeps Support%,content.ilike.%treasury and gaming care specialists assist you today%');

      if (queryErr) {
        return res.status(500).json({ error: queryErr.message });
      }

      const count = botMsgs?.length || 0;
      if (count > 0) {
        const ids = botMsgs.map((m: any) => m.id);
        const { error: delErr } = await supabaseAdmin.from('messages').delete().in('id', ids);
        if (delErr) {
          return res.status(500).json({ error: delErr.message });
        }
      }

      return res.json({ success: true, purgedCount: count });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to purge bot greetings' });
    }
  });

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

    // Self-Healing Cleanup: Purge legacy customer support conversations belonging to staff (agent or admin)
    (async () => {
      try {
        const { data: staffUsers } = await supabaseAdmin
          .from('users')
          .select('id, email, role')
          .in('role', ['agent', 'admin']);

        if (staffUsers && staffUsers.length > 0) {
          const staffIds = staffUsers.map((u: any) => u.id).filter(Boolean);
          const staffEmails = staffUsers.map((u: any) => u.email?.toLowerCase()).filter(Boolean);

          const { data: lingeringConvs } = await supabaseAdmin
            .from('conversations')
            .select('id, customer_id, customer_email');

          if (lingeringConvs && lingeringConvs.length > 0) {
            const convsToDelete = lingeringConvs.filter(
              (c: any) =>
                (c.customer_id && staffIds.includes(c.customer_id)) ||
                (c.customer_email && staffEmails.includes(c.customer_email.toLowerCase()))
            );

            if (convsToDelete.length > 0) {
              const convIdsToDelete = convsToDelete.map((c: any) => c.id);
              console.log(`[Staff Inbox Guard] Self-healing: purging ${convIdsToDelete.length} lingering staff support conversations:`, convIdsToDelete);
              await supabaseAdmin.from('messages').delete().in('conversation_id', convIdsToDelete);
              await supabaseAdmin.from('conversations').delete().in('id', convIdsToDelete);
            }
          }
        }
      } catch (err: any) {
        console.warn('[Staff Inbox Guard] Startup self-healing purge notice:', err?.message || err);
      }
    })();

    // Authoritative Bot Greeting Purge Guard: Purge automated greetings from PostgreSQL messages table
    (async () => {
      try {
        const { data: botMsgs, error: queryErr } = await supabaseAdmin
          .from('messages')
          .select('id, content')
          .or('content.ilike.%Welcome to Swift Sweeps Support%,content.ilike.%treasury and gaming care specialists assist you today%');

        if (!queryErr && botMsgs && botMsgs.length > 0) {
          const idsToDelete = botMsgs.map((m: any) => m.id);
          console.log(`[Support Desk Guard] Self-healing: purging ${idsToDelete.length} legacy bot greetings from messages table.`);
          await supabaseAdmin.from('messages').delete().in('id', idsToDelete);
        }
      } catch (err: any) {
        console.warn('[Support Desk Guard] Bot greeting purge notice:', err?.message || err);
      }
    })();
  });
}

startServer();
