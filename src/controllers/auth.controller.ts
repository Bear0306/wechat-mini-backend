import { Request, Response } from 'express';
import { z } from 'zod';
import { code2Session } from "../adapters/wechat";
import { upsertUserByOpenid } from "../services/user.service";
import { sign } from "../middlewares/auth";

export async function userLogin (req: Request, res: Response) {
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
    const user = await upsertUserByOpenid(openid, unionid);

    const userId = user.id?? 5;

    const token = sign(userId, openid);
    return res.json({ token, openid });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? "Login failed" });
  }
}
