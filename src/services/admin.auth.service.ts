import crypto from 'crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import * as AES from '../crypto/aes';
import { env } from '../env';

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export async function adminLogin(username: string, password: string) {
  const secret = env.adminjwtSecret as string;
  if (!secret) throw new Error('Server misconfigured: ADMIN_JWT_SECRET not set');

  const nameIndex = sha256Hex(String(username).toLowerCase());
  const admin = await prisma.admin.findUnique({ where: { nameIndex } });

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  if (!admin || !admin.isActive) {
    await delay(150);
    return { status: 401 as const, error: 'Invalid admin credentials' };
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
