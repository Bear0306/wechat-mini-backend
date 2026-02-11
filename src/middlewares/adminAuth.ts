import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { prisma } from "../db";

export type AuthedAdmin = {
  id: number;     // matches Admin.id (Int autoincrement)
  name?: string;  // optional if you want to attach it later
};

declare module "express-serve-static-core" {
  interface Request {
    admin?: AuthedAdmin;
  }
}

/** Extract Bearer token from Authorization header */
const getBearer = (req: Request): string | null => {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
};

/** Normalize IPv4‑in‑IPv6 format like ::ffff:127.0.0.1 */
const normalizeIp = (ipRaw: string | undefined | null): string | null => {
  if (!ipRaw) return null;
  let ip = ipRaw;
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") ip = "127.0.0.1";
  return ip;
};

/** Best‑effort client IP behind proxies (trust proxy must be enabled on app) */
const getClientIp = (req: Request): string | null => {
  const fwd = (req.headers["x-forwarded-for"] as string | string[] | undefined);
  if (Array.isArray(fwd) ? fwd[0] : fwd) {
    const first = Array.isArray(fwd) ? fwd[0] : fwd!;
    return normalizeIp(first.split(",")[0].trim());
  }
  return normalizeIp(req.ip || (req.socket && req.socket.remoteAddress) || null);
};

/**
 * Middleware: require valid Admin JWT **and** allowed IP.
 * - Verifies token using env.adminjwtSecret
 * - Reads adminId from payload, confirms admin exists & isActive
 * - Checks that request IP matches admin.allowedIp (if set)
 * - Sets req.admin = { id }
 *
 * Use directly:
 *   app.use('/api/admin/contest', adminAuth, ...)
 */
export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  const secret = env.adminjwtSecret as string;
  if (!secret) {
    return res.status(500).json({ error: "Server misconfigured: ADMIN_JWT_SECRET not set" });
  }

  const token = getBearer(req);
  if (!token) return res.status(401).json({ error: "Missing admin token" });

  try {
    const payload = jwt.verify(token, secret) as any;

    const adminId =
      typeof payload?.adminId === "number"
        ? payload.adminId
        : typeof payload?.adminId === "string"
        ? Number(payload.adminId)
        : undefined;

    if (!Number.isFinite(adminId)) {
      return res.status(401).json({ error: "Invalid admin token payload" });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId as number } });
    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: "Admin not found or inactive" });
    }

    const clientIp = getClientIp(req);
    const isDev = process.env.NODE_ENV !== 'production';
    // If an allowedIp is configured on the admin record, enforce it.
    // - In dev: allow 127.0.0.1 OR allowedIp
    // - In prod: require exact match with allowedIp
    if (admin.allowedIp && clientIp) {
      if (isDev && clientIp === '127.0.0.1') {
        // allowed in dev
      } else if (admin.allowedIp !== clientIp) {
        return res.status(403).json({ error: "Admin IP not allowed", ip: clientIp });
      }
    }

    req.admin = { id: admin.id };
    return next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Admin token expired" });
    }
    return res.status(401).json({ error: "Invalid admin token" });
  }
}
