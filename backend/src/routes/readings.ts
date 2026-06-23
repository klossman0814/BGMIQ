import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const readingsRouter = Router();
readingsRouter.use(authMiddleware);

const readingSchema = z.object({
  readingDatetime: z.string().datetime().optional(),
  glucoseValue: z.number().int().min(20, 'Glucose value must be at least 20').max(600, 'Glucose value must be at most 600'),
  mealContext: z.enum(['fasting', 'before_meal', 'after_meal', 'bedtime', 'overnight', 'other']).optional(),
  source: z.enum(['manual', 'meter', 'CGM']).optional(),
  carbs: z.number().int().optional().nullable(),
  insulinUnits: z.number().optional().nullable(),
  medicationTaken: z.boolean().optional(),
  activityMinutes: z.number().int().optional().nullable(),
  symptoms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Create reading
readingsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = readingSchema.parse(req.body);
    const reading = await prisma.glucoseReading.create({
      data: {
        userId: req.userId!,
        readingDatetime: data.readingDatetime ? new Date(data.readingDatetime) : new Date(),
        glucoseValue: data.glucoseValue,
        mealContext: data.mealContext || 'other',
        source: data.source || 'manual',
        carbs: data.carbs ?? null,
        insulinUnits: data.insulinUnits ?? null,
        medicationTaken: data.medicationTaken ?? false,
        activityMinutes: data.activityMinutes ?? null,
        symptoms: data.symptoms ?? null,
        notes: data.notes ?? null,
      },
    });

    // Auto-create alerts based on glucose value
    await createAlertsForReading(req.userId!, reading.id, reading.glucoseValue);

    res.status(201).json(reading);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create reading' });
  }
});

// Get all readings (with pagination and filters)
readingsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = { userId: req.userId! };
    if (startDate && endDate) {
      where.readingDatetime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [readings, total] = await Promise.all([
      prisma.glucoseReading.findMany({
        where,
        orderBy: { readingDatetime: 'desc' },
        skip,
        take: limit,
      }),
      prisma.glucoseReading.count({ where }),
    ]);

    res.json({
      readings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// Get single reading
readingsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const reading = await prisma.glucoseReading.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!reading) return res.status(404).json({ error: 'Reading not found' });
    res.json(reading);
  } catch {
    res.status(500).json({ error: 'Failed to fetch reading' });
  }
});

// Update reading
readingsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await prisma.glucoseReading.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!existing) return res.status(404).json({ error: 'Reading not found' });

    const data = readingSchema.partial().parse(req.body);
    const reading = await prisma.glucoseReading.update({
      where: { id: existing.id },
      data: {
        ...data,
        readingDatetime: data.readingDatetime ? new Date(data.readingDatetime) : undefined,
      },
    });

    // Update alerts for this reading
    await prisma.alert.deleteMany({ where: { readingId: reading.id } });
    await createAlertsForReading(req.userId!, reading.id, reading.glucoseValue);

    res.json(reading);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update reading' });
  }
});

// Delete reading
readingsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.glucoseReading.findFirst({
      where: { id: parseInt(req.params.id as string), userId: req.userId! },
    });
    if (!existing) return res.status(404).json({ error: 'Reading not found' });

    await prisma.glucoseReading.delete({ where: { id: existing.id } });
    // Clean up related alerts
    await prisma.alert.deleteMany({ where: { readingId: existing.id } });

    res.json({ message: 'Reading deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete reading' });
  }
});

// Helper: Create alerts based on glucose value
async function createAlertsForReading(userId: number, readingId: number, glucoseValue: number) {
  const profile = await prisma.patientProfile.findUnique({ where: { userId } });
  const low = profile?.targetLow || 70;
  const high = profile?.targetHigh || 180;

  let type: string, severity: string, message: string;

  if (glucoseValue < 54) {
    type = 'critical_low';
    severity = 'critical';
    message = `CRITICAL LOW: Glucose reading ${glucoseValue} mg/dL — below 54 mg/dL. Seek immediate medical attention.`;
  } else if (glucoseValue < low) {
    type = 'low';
    severity = 'warning';
    message = `Low glucose: ${glucoseValue} mg/dL — below target ${low} mg/dL. Consider treatment.`;
  } else if (glucoseValue > 250) {
    type = 'critical_high';
    severity = 'critical';
    message = `CRITICAL HIGH: Glucose reading ${glucoseValue} mg/dL — above 250 mg/dL. Seek medical attention.`;
  } else if (glucoseValue > high) {
    type = 'high';
    severity = 'warning';
    message = `High glucose: ${glucoseValue} mg/dL — above target ${high} mg/dL. Consider adjustment.`;
  } else {
    return; // In range — no alert needed
  }

  await prisma.alert.create({
    data: { userId, readingId, type, severity, message },
  });
}