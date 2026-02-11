import crypto from 'crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import * as AES from '../crypto/aes';
import { env } from '../env';

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

/** Normalize IPv4‑in‑IPv6 format like ::ffff:127.0.0.1 (used for login IP checks) */
const normalizeIp = (ipRaw: string | undefined | null): string | null => {
  if (!ipRaw) return null;
  let ip = ipRaw;
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
};

export async function adminLogin(username: string, password: string, clientIpRaw?: string | null) {
  const secret = env.adminjwtSecret as string;
  if (!secret) throw new Error('Server misconfigured: ADMIN_JWT_SECRET not set');

  const nameIndex = sha256Hex(String(username).toLowerCase());
  const admin = await prisma.admin.findUnique({ where: { nameIndex } });

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  if (!admin || !admin.isActive) {
    await delay(150);
    return { status: 401 as const, error: 'Invalid admin credentials' };
  }

  // Enforce IP restriction at login time:
  // - If admin.allowedIp is set
  // - And we have a client IP
  // - And they don't match after normalization
  // => reject login before issuing any token.
  const clientIp = normalizeIp(clientIpRaw ?? null);
  if (admin.allowedIp && clientIp && admin.allowedIp !== clientIp) {
    await delay(150);
    return { status: 403 as const, error: 'Admin IP not allowed' };
  }

  let storedName: string;
  try {
    storedName = AES.aesDecrypt(admin.encName);
  } catch {
    return { status: 500 as const, error: 'Corrupt admin record' };
  }
  if (storedName !== username) {
    await delay(150);
    return { status: 401 as const, error: 'Invalid admin credentials' };
  }

  const ok = await argon2.verify(admin.passwordHash, password);
  if (!ok) {
    await delay(150);
    return { status: 401 as const, error: 'Invalid admin credentials' };
  }

  const expiresIn = Number(env.adminjwtExpiresIn || 3600);
  const token = jwt.sign({ adminId: admin.id, role: 'admin' }, secret, { expiresIn });
  return { token, expiresIn, admin: { id: admin.id } };
}
