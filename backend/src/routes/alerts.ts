import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const alertsRouter = Router();
alertsRouter.use(authMiddleware);

alertsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const unreadOnly = req.query.unread === 'true';

    const where: any = { userId: req.userId! };
    if (unreadOnly) where.isRead = false;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reading: {
          select: { glucoseValue: true, readingDatetime: true },
        },
      },
    });

    res.json(alerts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

alertsRouter.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.alert.updateMany({
      where: { id: parseInt(req.params.id as string), userId: req.userId! },
      data: { isRead: true },
    });
    res.json({ message: 'Alert marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

alertsRouter.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.alert.updateMany({
      where: { userId: req.userId!, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All alerts marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to update alerts' });
  }
});

alertsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.alert.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Alert not found' });
    await prisma.alert.delete({ where: { id: existing.id } });
    res.json({ message: 'Alert deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});