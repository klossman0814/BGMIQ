import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const medicationLogsRouter = Router();
medicationLogsRouter.use(authMiddleware);

const logSchema = z.object({
  medicationId: z.number().int().positive(),
  takenAt: z.string().datetime().optional(),
  dose: z.string().optional().nullable(),
  skipped: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

medicationLogsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await prisma.medicationLog.findMany({
      where: { userId: req.userId! },
      orderBy: { takenAt: 'desc' },
      take: limit,
      include: { medication: { select: { name: true, dosage: true } } },
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch medication logs' });
  }
});

medicationLogsRouter.get('/today', async (req: AuthRequest, res: Response) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [logs, medications] = await Promise.all([
      prisma.medicationLog.findMany({
        where: { userId: req.userId!, takenAt: { gte: todayStart, lte: todayEnd } },
        orderBy: { takenAt: 'desc' },
        include: { medication: { select: { name: true, dosage: true } } },
      }),
      prisma.medication.findMany({ where: { userId: req.userId!, isActive: true } }),
    ]);

    res.json({ logs, medications });
  } catch {
    res.status(500).json({ error: 'Failed to fetch today logs' });
  }
});

medicationLogsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = logSchema.parse(req.body);
    const med = await prisma.medication.findFirst({ where: { id: data.medicationId, userId: req.userId! } });
    if (!med) return res.status(404).json({ error: 'Medication not found' });

    const log = await prisma.medicationLog.create({
      data: {
        userId: req.userId!,
        medicationId: data.medicationId,
        takenAt: data.takenAt ? new Date(data.takenAt) : new Date(),
        dose: data.dose ?? med.dosage,
        skipped: data.skipped ?? false,
        notes: data.notes ?? null,
      },
      include: { medication: { select: { name: true, dosage: true } } },
    });
    res.status(201).json(log);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to log medication' });
  }
});

medicationLogsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.medicationLog.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Log not found' });
    await prisma.medicationLog.delete({ where: { id: existing.id } });
    res.json({ message: 'Log deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete log' });
  }
});