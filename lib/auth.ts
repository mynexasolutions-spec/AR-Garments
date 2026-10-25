import crypto from 'crypto';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  userType?: 'customer' | 'business';
  createdAt?: string;
}

// ─── In-Memory Users Fallback ──────────────────────────────────────────────────
// Allows instant signup/login even before database tables are created in Supabase
export interface StoredUser extends AuthUser {
  passwordHash: string;
}

export const memoryUsers: StoredUser[] = [];

// ─── Password Hashing & Verification ──────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
}

// ─── Session Token (HMAC signed) ──────────────────────────────────────────────
const AUTH_SECRET = process.env.AUTH_SECRET || 'ar-garments-secret-jwt-key-2026';

export function createSessionToken(user: AuthUser): string {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    userType: user.userType || 'customer',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      userType: payload.userType || 'customer',
    };
  } catch {
    return null;
  }
}
