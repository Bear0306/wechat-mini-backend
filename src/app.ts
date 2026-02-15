import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { env } from './env';

import authRoutes from './routes/user/auth.routes';
import meRoutes from './routes/user/me.routes';
import contestRoutes from './routes/user/contest.routes';
import leaderboardRoutes from './routes/user/leaderboard.routes';
import referralRoutes from './routes/user/referral.routes';
import membershipRoutes from './routes/user/membership.routes';
import rewardRoutes from './routes/user/reward.routes';
// import quotaRoutes from './routes/quota.routes';

import './jobs/updateContestStatus';
import { rateLimit } from './middlewares/rateLimit';

// ⬇️ Keep your existing auth.ts exactly; we import its userAuth.
import { userAuth } from './middlewares/auth';

// ⬇️ New admin-only auth that checks ADMIN_ALLOWED_IP from .env
import { adminAuth } from './middlewares/adminAuth';

// ⬇️ Admin routers
import adminAuthRoutes from './routes/admin/auth.admin.routes';
import adminContestRoutes from './routes/admin/contest.admin.routes';
import adminPrizeRoutes from './routes/admin/prize.admin.routes';
import adminPrizeRuleRoutes from './routes/admin/prizeRule.admin.routes';
import adminUserRoutes from './routes/admin/user.admin.routes';
import adminLeaderboardRoutes from './routes/admin/leaderboard.admin.routes';
import adminServiceAgentRoutes from './routes/admin/serviceAgent.admin.routes';
import adminRegionRoutes from './routes/admin/region.admin.routes';

const app = express();

// Ensure correct client IP detection behind reverse proxies
app.set('trust proxy', true);

// app.use(helmet());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
      },
    },
  })
);
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

// -------- USER APIs: /api/user/* (require userAuth) --------
app.use('/api/user/auth', rateLimit('auth', 30, 60), authRoutes);
app.use('/api/user/me', userAuth, rateLimit('user', 120, 60), meRoutes);
app.use('/api/user/contest', userAuth, rateLimit('contest', 120, 60), contestRoutes);
app.use('/api/user/leaderboard', userAuth, rateLimit('board', 120, 60), leaderboardRoutes);
app.use('/api/user/referral', userAuth, rateLimit('ref', 60, 60), referralRoutes);
app.use('/api/user/membership', userAuth, rateLimit('member', 30, 60), membershipRoutes);
app.use('/api/user/reward', userAuth, rateLimit('reward', 30, 60), rewardRoutes);

// -------- ADMIN APIs: /api/admin/* --------
app.use('/api/admin/auth', rateLimit('adminAuth', 10, 60), adminAuthRoutes);
app.use('/api/admin/contest', adminAuth, adminContestRoutes);
app.use('/api/admin/prize', adminAuth, adminPrizeRoutes);
app.use('/api/admin/prize-rule', adminAuth, adminPrizeRuleRoutes);
app.use('/api/admin/user', adminAuth, adminUserRoutes);
app.use('/api/admin/leaderboard', adminAuth, adminLeaderboardRoutes);
app.use('/api/admin/service-agent', adminAuth, adminServiceAgentRoutes);
app.use('/api/admin/region', adminAuth, adminRegionRoutes);

// -------- ADMIN FRONTEND: serve built React app from /admin --------
// At runtime, this resolves to <project-root>/public/admin
// (because compiled app.js lives in dist/, and dist/../public/admin => public/admin).
const adminFrontendDir = path.join(__dirname, '../public/admin');

// Serve the built React admin app and its assets under /admin.
app.use('/', express.static(adminFrontendDir));

// If "/login" is requested, redirect to "/"
app.get('/login', (req, res) => {
  res.redirect('/');
});

// For the main admin entry URL, return index.html so the React app can boot.
app.get('/', (req, res) => {
  console.log('Serving admin index for', req.path);
  res.sendFile(path.join(adminFrontendDir, 'index.html'));
});

app.use('/avatars', express.static('public/avatars'))

app.listen(env.port, () => console.log('Backend running at http://localhost:' + env.port));

export default app;
