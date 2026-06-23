import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const activitiesRouter = Router();
activitiesRouter.use(authMiddleware);

const activitySchema = z.object({
  name: z.string().min(1, 'Activity name is required'),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute'),
  intensity: z.enum(['light', 'moderate', 'vigorous']).optional().nullable(),
  startedAt: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});

activitiesRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { userId: req.userId! },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    res.json(activities);
  } catch {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

activitiesRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const activity = await prisma.activity.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json(activity);
  } catch {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

activitiesRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = activitySchema.parse(req.body);
    const activity = await prisma.activity.create({
      data: {
        userId: req.userId!,
        name: data.name,
        duration: data.duration,
        intensity: data.intensity ?? null,
        startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
        notes: data.notes ?? null,
      },
    });
    res.status(201).json(activity);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

activitiesRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.activity.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    const data = activitySchema.partial().parse(req.body);
    const activity = await prisma.activity.update({
      where: { id: existing.id },
      data: {
        ...data,
        startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
      },
    });
    res.json(activity);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

activitiesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.activity.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    await prisma.activity.delete({ where: { id: existing.id } });
    res.json({ message: 'Activity deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});