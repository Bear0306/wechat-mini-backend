import { Router } from "express";
import { z } from "zod";
import { code2Session } from "../../adapters/wechat";
import { upsertUserByOpenid } from "../../services/user.service";
import { sign } from "../../middlewares/auth";

const router = Router();

router.post("/login", async (req, res) => {
  const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", issues: parsed.error.flatten() });
  }

  try {
    const { code } = parsed.data;

    // Resolve openid/unionid depending on environment
    let openid: string;
    let unionid: string | undefined;

    // DevTool Emulator: mock openid from code
    openid = `mock_${code}`;
    unionid = undefined;

    // // Real WeChat(PC, Phone)
    // const session = await code2Session(code);
    // openid = session.openid;
    // unionid = session.unionid;

    // Ensure user exists
    const user = await upsertUserByOpenid(openid, unionid);

    // DevTool Emulator: Force userId = 5 in development BEFORE signing
    const userId = process.env.NODE_ENV === "production" ? user.id : 5;
    // // Real WeChat(PC, Phone)    
    // const userId = user.id;

    const token = sign(userId, openid);
    return res.json({ token, openid });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? "Login failed" });
  }
});

export default router;
