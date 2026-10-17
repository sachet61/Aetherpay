import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { telegramEngine } from './src/server/telegramEngine';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qlurdhimtgchlgoaziqq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdXJkaGltdGdjaGxnb2F6aXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA2MTY2NiwiZXhwIjoyMTA3NjM3NjY2fQ.iH8f_0MXUD3faa43gc13XtfBc_r_tKptMqrfZkbxuag';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Static assets support for /src/images, /images, and /images/qr
  app.use('/src/images', express.static(path.resolve(process.cwd(), 'src/images')));
  app.use('/images', express.static(path.resolve(process.cwd(), 'public/images')));
  app.use(express.static(path.resolve(process.cwd(), 'public')));

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

      // Determine active application origin
      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || 'https';
      const origin = req.headers.origin || (host ? `${proto}://${host}` : 'https://ais-dev-z7ycubaw6ioqcdgqzu2qkl-342377552686.asia-southeast1.run.app');
      const redirectTo = `${origin}/#type=recovery`;

      let directActionLink: string | null = null;
      let recoveryHashedToken: string | null = null;

      try {
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: cleanEmail,
          options: {
            redirectTo,
          },
        });

        if (!error && data?.properties?.action_link) {
          let link = data.properties.action_link;
          // Replace any hardcoded localhost:3000 redirect_to with active domain
          if (link.includes('redirect_to=http://localhost:3000') || link.includes('redirect_to=http%3A%2F%2Flocalhost%3A3000')) {
            link = link
              .replace('redirect_to=http://localhost:3000', `redirect_to=${encodeURIComponent(redirectTo)}`)
              .replace('redirect_to=http%3A%2F%2Flocalhost%3A3000', `redirect_to=${encodeURIComponent(redirectTo)}`);
          }
          directActionLink = link;
          recoveryHashedToken = data.properties.hashed_token || null;
        }
      } catch (adminErr) {
        console.warn('[Admin GenerateLink Notice]:', adminErr);
      }

      // Generate in-app 6-digit pin and security token
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const codePart = Math.floor(100000 + Math.random() * 900000); // 6-digit code
      const token = `RST-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

      const record: PasswordResetRecord = {
        token,
        email: cleanEmail,
        createdAt: Date.now(),
        expiresAt,
        used: false,
      };

      passwordResetTokens.set(token, record);
      passwordResetTokens.set(String(codePart), record);
      if (recoveryHashedToken) {
        passwordResetTokens.set(recoveryHashedToken, record);
      }

      console.log(`[Self-Service Reset] Generated token for ${cleanEmail}: ${token} / PIN: ${codePart}`);

      return res.json({
        success: true,
        token,
        pin: String(codePart),
        actionLink: directActionLink,
        email: cleanEmail,
        expiresAt,
        message: `Self-service password reset link and 6-digit PIN generated for ${cleanEmail}. Valid for 15 minutes.`,
      });
    } catch (err: any) {
      console.error('[Request Reset Error]:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate reset token' });
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
        const targetUser = userList?.users?.find(
          (u) => u.email?.toLowerCase() === record.email.toLowerCase()
        );
        if (targetUser) {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
            password: newPassword,
          });
          console.log(`[Supabase Admin] Updated password for user ${targetUser.id} (${record.email})`);
        }
      } catch (supaErr) {
        console.warn('[Supabase Admin Password Update Notice]:', supaErr);
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
      const targetUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
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

      const targetUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );

      if (!targetUser) {
        return res.json({
          exists: false,
          verified: false,
          message: 'User not found in Supabase Auth.',
        });
      }

      const isVerified = Boolean(targetUser.email_confirmed_at);
      return res.json({
        exists: true,
        verified: isVerified,
        emailConfirmedAt: targetUser.email_confirmed_at,
        userId: targetUser.id,
        message: isVerified
          ? 'Email address is verified in Supabase.'
          : 'Email address is unconfirmed in Supabase.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Verification check failed' });
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

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  // USPay / Keyhub API Proxy Route to avoid CORS issues
  app.all('/api/uspay/*', async (req, res) => {
    try {
      const endpointPath = (req.params as Record<string, string>)[0] || ''; // e.g. 'collect', 'methods', 'balance'
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

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
    // Start continuous 24/7 background Telegram polling
    telegramEngine.init(supabaseAdmin).catch((err) => {
      console.warn('[TelegramEngine] Background startup warning:', err);
    });
  });
}

startServer();
