import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const profileRouter = Router();
profileRouter.use(authMiddleware);

const profileSchema = z.object({
  dateOfBirth: z.string().optional().nullable(),
  diabetesType: z.enum(['Type1', 'Type2', 'Gestational', 'Pre-diabetic', 'Other']).optional().nullable(),
  targetLow: z.number().int().min(50).max(100).optional(),
  targetHigh: z.number().int().min(100).max(300).optional(),
  providerName: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

profileRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: req.userId! },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

profileRouter.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = profileSchema.parse(req.body);
    const profile = await prisma.patientProfile.update({
      where: { userId: req.userId! },
      data: {
        dateOfBirth: data.dateOfBirth ?? undefined,
        diabetesType: data.diabetesType ?? undefined,
        targetLow: data.targetLow ?? undefined,
        targetHigh: data.targetHigh ?? undefined,
        providerName: data.providerName ?? undefined,
        emergencyContact: data.emergencyContact ?? undefined,
        phone: data.phone ?? undefined,
      },
    });
    res.json(profile);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});