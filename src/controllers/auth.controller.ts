import { Request, Response } from 'express';
import { z } from 'zod';
import { code2Session } from "../adapters/wechat";
import { upsertUserByOpenid } from "../services/user.service";
import { sign } from "../middlewares/auth";
import * as AdminAuthService from '../services/admin.auth.service';

// Reuse the same normalization logic as adminAuth for login IP checks
const normalizeIp = (ipRaw: string | undefined | null): string | null => {
  if (!ipRaw) return null;
  let ip = ipRaw;
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") ip = "127.0.0.1";
  return ip;
};

const getClientIp = (req: Request): string | null => {
  const fwd = (req.headers["x-forwarded-for"] as string | string[] | undefined);
  if (Array.isArray(fwd) ? fwd[0] : fwd) {
    const first = Array.isArray(fwd) ? fwd[0] : fwd!;
    return normalizeIp(first.split(",")[0].trim());
  }
  return normalizeIp(req.ip || (req.socket && req.socket.remoteAddress) || null);
};

export async function userLogin(req: Request, res: Response) {
  const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", issues: parsed.error.flatten() });
  }

  try {
    const { code } = parsed.data;

    // Resolve openid/unionid depending on environment
    let openid: string;
    let unionid: string | undefined;

    const session = await code2Session(code);
    openid = session.openid;
    unionid = session.unionid;

    // Ensure user exists
    const user = await upsertUserByOpenid(openid);

    const userId = user.id?? 5;

    const token = sign(userId, openid);
    return res.json({ token, openid });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? "Login failed" });
  }
}

export async function adminLogin(req: Request, res: Response) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  try {
    const clientIp = getClientIp(req);
    console.log(`IP ${clientIp} tried to connect to admin dashboard.`);
    const result = await AdminAuthService.adminLogin(username, password, clientIp);
    if ('status' in result && typeof result.status === 'number') {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Admin login failed' });
  }
}
