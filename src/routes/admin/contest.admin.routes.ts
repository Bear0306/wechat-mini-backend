import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../db';

const router = Router();

// All routes here are already protected by adminAuth in app.ts

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const page = Number(body.page ?? 1);
    const size = Number(body.size ?? 50);

    // protect your DB from huge requests
    const take = Math.min(Math.max(size, 1), 200);
    const skip = Math.max((page - 1) * take, 0);

    // TODO: build "where" from body.filters if you need filtering
    const where = {}; 

    const contests = await prisma.contest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      // include: { ... } // if you need relations
    });

    // Return raw rows; frontend will render all fields dynamically
    res.json(contests);
  } catch (err) {
    next(err);
  }
});


export default router;
