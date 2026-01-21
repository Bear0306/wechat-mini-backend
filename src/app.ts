import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './env';

import authRoutes from './routes/user/auth.routes';
import userRoutes from './routes/user/user.routes';
import contestRoutes from './routes/user/contest.routes';
import leaderboardRoutes from './routes/user/leaderboard.routes';
import referralRoutes from './routes/user/referral.routes';
import membershipRoutes from './routes/user/membership.routes';
import rewardRoutes from './routes/user/reward.routes';
// import quotaRoutes from './routes/quota.routes';

import './jobs/finalizeLeaderboards';
import { rateLimit } from './middlewares/rateLimit';

// ⬇️ Keep your existing auth.ts exactly; we import its userAuth.
import { userAuth } from './middlewares/auth';

// ⬇️ New admin-only auth that checks ADMIN_ALLOWED_IP from .env
import { adminAuth } from './middlewares/adminAuth';

// ⬇️ Minimal admin routers (examples)
import adminAuthRoutes from './routes/admin/auth.admin.routes';
import adminContestRoutes from './routes/admin/contest.admin.routes';
import adminPrizeRoutes from './routes/admin/prize.admin.routes';

const app = express();

// Ensure correct client IP detection behind reverse proxies
app.set('trust proxy', true);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    disclaimer:
      '参赛者需自行评估身体状况，平台方不承担运动损伤责任！禁止在危险区域运动，参赛者因场地选择不当受伤或造成损失的自行负责',
  })
);

// -------- USER APIs (require your existing userAuth) --------
app.use('/api/auth', rateLimit('auth', 30, 60), authRoutes);
app.use('/api/user',    userAuth, rateLimit('user', 120, 60), userRoutes);
app.use('/api/contest', userAuth, rateLimit('contest', 120, 60), contestRoutes);
app.use('/api/leaderboard', userAuth, rateLimit('board', 120, 60), leaderboardRoutes);
app.use('/api/referral',    userAuth, rateLimit('ref', 60, 60), referralRoutes);
app.use('/api/membership',  userAuth, rateLimit('member', 30, 60), membershipRoutes);
app.use('/api/reward',      userAuth, rateLimit('reward', 30, 60), rewardRoutes);
// app.use('/api/quota',    userAuth, rateLimit('reward', 30, 60), quotaRoutes);

// -------- ADMIN AUTH (login route; no adminAuth here) --------
app.use('/admin', rateLimit('adminAuth', 10, 60), adminAuthRoutes);

// -------- ADMIN APIs (require adminAuth + IP check) --------
app.use('/admin/contest', adminAuth, adminContestRoutes);
app.use('/admin/prize',   adminAuth, adminPrizeRoutes);

app.listen(env.port, () => console.log('Backend running at http://localhost:' + env.port));

export default app;
