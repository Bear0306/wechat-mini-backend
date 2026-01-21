import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";

export type AuthedUser = {
  id: number;
  openId?: string;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
  }
}

const getBearer = (req: Request): string | null => {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
};

/** Populate req.user if a valid token is present (expects only { uid, openId? }). */
export function userAuth(req: Request, _res: Response, next: NextFunction) {
  const secret = env.jwtSecret as string;
  if (!secret) throw new Error("JWT_SECRET is not set");

  const token = getBearer(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, secret) as any;

    const uid =
      typeof payload?.uid === "number"
        ? payload.uid
        : typeof payload?.uid === "string"
        ? Number(payload.uid)
        : undefined;

    if (Number.isFinite(uid)) {
      const openId =
        typeof payload?.openId === "string" ? payload.openId : undefined;
      req.user = { id: uid as number, openId };
    }
  } catch {
    // invalid token => anonymous
  }

  next();
}

/** 401 if req.user is missing. */
export function requireUser() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    next();
  };
}

/** Helper to sign a JWT encoding { uid, openId? }. */
export function sign(uid: number, openId?: string, secret = env.jwtSecret as string) {
  if (!secret) throw new Error("JWT_SECRET is not set");
  const payload: Record<string, any> = { uid };
  if (openId) payload.openId = openId;
  // No custom exp; dev-friendly. Add { expiresIn: '7d' } if you want later.
  return jwt.sign(payload, secret);
}
