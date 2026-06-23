import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const insulinRouter = Router();
insulinRouter.use(authMiddleware);

const insulinSchema = z.object({
  insulinType: z.enum(['rapid_acting', 'short_acting', 'intermediate', 'long_acting', 'pre_mixed']),
  units: z.number().positive('Units must be positive'),
  administered: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});

insulinRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.insulinLog.findMany({
      where: { userId: req.userId! },
      orderBy: { administered: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch insulin logs' });
  }
});

insulinRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const log = await prisma.insulinLog.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!log) return res.status(404).json({ error: 'Insulin log not found' });
    res.json(log);
  } catch {
    res.status(500).json({ error: 'Failed to fetch insulin log' });
  }
});

insulinRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = insulinSchema.parse(req.body);
    const log = await prisma.insulinLog.create({
      data: {
        userId: req.userId!,
        insulinType: data.insulinType,
        units: data.units,
        administered: data.administered ? new Date(data.administered) : new Date(),
        notes: data.notes ?? null,
      },
    });
    res.status(201).json(log);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to create insulin log' });
  }
});

insulinRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.insulinLog.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Insulin log not found' });
    const data = insulinSchema.partial().parse(req.body);
    const log = await prisma.insulinLog.update({
      where: { id: existing.id },
      data: {
        ...data,
        administered: data.administered ? new Date(data.administered) : undefined,
      },
    });
    res.json(log);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to update insulin log' });
  }
});

insulinRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.insulinLog.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Insulin log not found' });
    await prisma.insulinLog.delete({ where: { id: existing.id } });
    res.json({ message: 'Insulin log deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete insulin log' });
  }
});