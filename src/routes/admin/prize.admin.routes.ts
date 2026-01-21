import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../db';


const router = Router();

router.post('/claim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const page = Number(body.page ?? 1);
    const size = Number(body.size ?? 50);

    // protect your DB from huge requests
    const take = Math.min(Math.max(size, 1), 200);
    const skip = Math.max((page - 1) * take, 0);

    // TODO: build "where" from body.filters if you need filtering
    const where = {};

    // Example Prisma query (replace with your actual table name and relations)
    const claims = await prisma.contestPrizeClaim.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    // Return raw rows; frontend will render all fields dynamically
    res.json(claims);
  } catch (err) {
    next(err);
  }

});

export default router;
