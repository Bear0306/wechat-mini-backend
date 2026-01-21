import { Router } from "express";
import crypto from "crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import * as AES from "../../crypto/aes";
import { env } from "../../env";

const prisma = new PrismaClient();
const router = Router();

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/**
 * POST /admin/login
 * Body: { username: string, password: string }
 * Checks against admins table (created by scripts/set-admin.ts):
 *   - nameIndex = sha256(lower(username))
 *   - encName (AES) must decrypt to username (defense in depth)
 *   - passwordHash (argon2) must verify
 * On success: returns { token, expiresIn, admin: { id } }
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const secret = env.adminjwtSecret as string;
  if (!secret) {
    return res.status(500).json({ error: "Server misconfigured: ADMIN_JWT_SECRET not set" });
  }

  try {
    // 1) Lookup by deterministic index
    const nameIndex = sha256Hex(String(username).toLowerCase());
    const admin = await prisma.admin.findUnique({ where: { nameIndex } });

    // Uniform delay to reduce user enumeration
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    if (!admin || !admin.isActive) {
      await delay(150);
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    // 2) Decrypt stored name and compare
    let storedName: string;
    try {
      storedName = AES.aesDecrypt(admin.encName);
    } catch {
      return res.status(500).json({ error: "Corrupt admin record" });
    }
    if (storedName !== username) {
      await delay(150);
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    // 3) Verify password
    const ok = await argon2.verify(admin.passwordHash, password);
    if (!ok) {
      await delay(150);
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    // 4) Issue admin JWT (no IP check)
    const expiresIn = Number(env.adminjwtExpiresIn || 3600); // seconds
    const token = jwt.sign(
      { adminId: admin.id, role: "admin" },
      secret,
      { expiresIn }
    );

    return res.json({
      token,
      expiresIn,
      admin: { id: admin.id },
    });
  } catch (err) {
    return res.status(500).json({ error: "Admin login failed" });
  }
});

export default router;
