import { Router } from "express";
import { z } from "zod";
import { requireUser } from "../../middlewares/auth";
import { updateUserProfile } from "../../services/user.service";
import { reverseGeocodeCity } from "../../adapters/maps";
import { cityOnlyName } from "../../utils/location";
import { prisma } from "../../db";
import dayjs from "dayjs";
import { code2Session, decryptWeRun } from '../../adapters/wechat';
const router = Router();

function sumAvail(items: { qty: number; consumedQty: number; expiresAt: Date | null }[]) {
  const now = new Date();
  return items.reduce((acc, it) => {
    if (it.expiresAt && it.expiresAt < now) return acc;
    return acc + Math.max(0, (it.qty ?? 0) - (it.consumedQty ?? 0));
  }, 0);
}

function getThisWeekRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  // JS: 0=Sun..6=Sat → days since Monday:
  const daysFromMon = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysFromMon);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

/** Update profile (authenticated) */
router.post("/profile", requireUser(), async (req, res) => {
  const body = z
    .object({
      phone: z.string().optional(),
      realNameVerified: z.boolean().optional(),
      birthday: z.string().datetime().optional(), // ISO string
      lat: z.number().optional(),
      lng: z.number().optional(),
      wechatNick: z.string().optional(),
      avatarUrl: z.string().url().optional(),
    })
    .parse(req.body);

  const uid = req.user!.id;

  let city: string | undefined;
  if (typeof body.lat === "number" && typeof body.lng === "number") {
    const gc = await reverseGeocodeCity(body.lat, body.lng);
    city = cityOnlyName(gc);
  }

  const profile = await updateUserProfile(uid, {
    phone: body.phone,
    wechatNick: body.wechatNick,
    avatarUrl: body.avatarUrl,
    realNameVerified: body.realNameVerified,
    birthDate: body.birthday ? new Date(body.birthday) : undefined,
    city,
  });

  res.json({ profile });
});

/** Current user basic info + weekly steps + joinable counts (authenticated) */
router.get("/me", requireUser(), async (req, res) => {
  const uid = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, wechatNick: true },
  });
  if (!user) return res.status(404).json({ message: "用户不存在" });

  const { start, end } = getThisWeekRange();

  const entries = await prisma.contestEntry.findMany({
    where: {
      userId: uid,
      verified: true,
      submittedAt: { gte: start, lt: end },
    },
    select: { steps: true },
  });
  const weekSteps = entries.reduce((sum: number, e: { steps?: number | null }) => sum + (e.steps || 0), 0);

  const now = new Date();
  const credits = await prisma.entryCredit.findMany({
    where: {
      userId: uid,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { qty: true, consumedQty: true, expiresAt: true },
  });
  const joinCount = sumAvail(credits);

  res.json({
    uid: user.id,
    nickname: user.wechatNick || "我的昵称",
    weekSteps,
    joinCount,
  });
});

/** Current user stats (authenticated) */
router.get("/me/stats", requireUser(), async (req, res) => {
  const uid = req.user!.id;

  const [entryCredits, doubleCredits, membership, referrals, todayAds] = await Promise.all([
    prisma.entryCredit.findMany({
      where: { userId: uid },
      select: { qty: true, consumedQty: true, expiresAt: true },
    }),
    prisma.doubleCredit.findMany({
      where: { userId: uid },
      select: { qty: true, consumedQty: true, expiresAt: true },
    }),
    prisma.membership.findUnique({ where: { userId: uid } }),
    prisma.referral.count({ where: { referrerId: uid } }),
    prisma.adReward.findMany({
      where: {
        userId: uid,
        watchedAt: { gte: dayjs().startOf("day").toDate() },
      },
      select: { id: true, granted: true },
    }),
  ]);

  const joinCount = sumAvail(entryCredits);
  const doubleCount = sumAvail(doubleCredits);

  // Ads progress example: every 3 watches -> reward
  const watched = todayAds.length;
  const toNext = (3 - (watched % 3)) % 3;

  res.json({
    joinCount, // 可挑战次数
    doubleCount, // 奖励翻倍次数
    referrals: {
      successCount: referrals, // 推荐成功人数
    },
    ads: { watched, toNext }, // 今日广告进度
    membership: membership ? { tier: membership.tier, endAt: membership.endAt } : null,
  });
});

router.get("/leftChallenge", requireUser(), async (req, res) => {
  const uid = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, leftChallenge: true },
  });
  if (!user) return res.status(404).json({ message: "用户不存在" });

  const remained =
    typeof user.leftChallenge === "number" && Number.isFinite(user.leftChallenge)
      ? Math.max(0, user.leftChallenge)
      : 3; // default

  res.json({ leftChallenge: remained });
});

router.get('/me/quota-stats', async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    const rc = await prisma.referralCode.findUnique({
      where: { userId },
      select: { usedCount: true },
    });

    const invited = rc?.usedCount ?? 0;

    // Minimal shape that your frontend expects:
    // You compute toNext on the client; we just return invited here.
    return res.json({
      referrals: {
        invited,      // ← usedCount from ReferralCode
      },

      // If you later want to add other buckets, keep keys stable:
      // ads: { watched: 0, required: 3 },
      // membership: { tier: 'NONE' },
      // quota: { count: 0 },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Failed to load quota stats' });
  }
});

router.post('/werun/decrypt', async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { encryptedData, iv, code } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    if (!encryptedData || !iv || !code) {
      return res.status(400).json({ ok: false, error: 'Missing params' });
    }

    const wxRes = await code2Session(code);
    const sessionKey = wxRes.session_key;

    const data = decryptWeRun(encryptedData, sessionKey, iv);

    // Minimal shape your frontend expects
    return res.json({
      werun: {
        stepInfoList: data.stepInfoList ?? [],
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Failed to decrypt WeRun data',
    });
  }
});

export default router;
