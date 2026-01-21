import 'dotenv/config';
import argon2 from 'argon2';
import crypto from 'crypto';
import * as AES from '../src/crypto/aes';
import { prisma } from '../src/db';

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

async function setAdmin(username: string, password: string, ip: string) {
  // 1) Derive fields
  const encName = AES.aesEncrypt(username);
  const nameIndex = sha256Hex(username.toLowerCase());
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  // 2) Upsert into admins table (must have unique index on nameIndex)
  const admin = await prisma.admin.upsert({
    where: { nameIndex },                                  // UNIQUE
    update: { encName, passwordHash, allowedIp: ip, isActive: true },
    create: { encName, nameIndex, passwordHash, allowedIp: ip, isActive: true },
    // if your id is autoincrement Int, Prisma will handle it automatically
  });

  // 3) Log result
  console.log('\n✅ Admin record saved in database:');
  console.log({
    id: admin.id,
    nameIndex: admin.nameIndex,
    allowedIp: admin.allowedIp,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  });
}

async function main() {
  const [,, nameArg, passArg, ipArg] = process.argv;
  if (!nameArg || !passArg || !ipArg) {
    console.error('Usage: ts-node scripts/set-admin.ts <adminName> <adminPassword> <allowedIp>');
    process.exit(1);
  }

  try {
    await setAdmin(nameArg, passArg, ipArg);
  } catch (err) {
    console.error('❌ Failed to set admin:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
