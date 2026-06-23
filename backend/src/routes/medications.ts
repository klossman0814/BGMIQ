import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const medicationsRouter = Router();
medicationsRouter.use(authMiddleware);

const medicationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  prescribedBy: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

medicationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const medications = await prisma.medication.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json(medications);
  } catch {
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

medicationsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const med = await prisma.medication.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!med) return res.status(404).json({ error: 'Medication not found' });
    res.json(med);
  } catch {
    res.status(500).json({ error: 'Failed to fetch medication' });
  }
});

medicationsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = medicationSchema.parse(req.body);
    const med = await prisma.medication.create({
      data: {
        userId: req.userId!,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        prescribedBy: data.prescribedBy ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
      },
    });
    res.status(201).json(med);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

medicationsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.medication.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Medication not found' });
    const data = medicationSchema.partial().parse(req.body);
    const med = await prisma.medication.update({
      where: { id: existing.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    res.json(med);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

medicationsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.medication.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Medication not found' });
    await prisma.medication.delete({ where: { id: existing.id } });
    res.json({ message: 'Medication deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});