import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/firebaseAuth';

const router = Router();

// ─── GET /api/activity ───────────────────────────────────────────────────────
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', fileId, action } = req.query;
    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));

    const activities = await prisma.activity.findMany({
      where: {
        userId: req.user!.id,
        ...(fileId && { fileId: String(fileId) }),
        ...(action && { action: String(action) }),
      },
      include: {
        file: { select: { id: true, filename: true, mimeType: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(String(limit)),
    });

    const total = await prisma.activity.count({
      where: { userId: req.user!.id },
    });

    res.json({ activities, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
  } catch (error) {
    console.error('GET /activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
