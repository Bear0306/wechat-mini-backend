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

/**
 * Middleware: require valid Admin JWT.
 * - Verifies token using env.adminjwtSecret
 * - Reads adminId from payload, confirms admin exists & isActive
 * - Sets req.admin = { id }
 *
 * Use directly:
 *   app.use('/admin/contest', adminAuth, ...)
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

    req.admin = { id: admin.id };
    return next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Admin token expired" });
    }
    return res.status(401).json({ error: "Invalid admin token" });
  }
}
