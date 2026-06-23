import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

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

// Delete all readings for the current user
readingsRouter.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.glucoseReading.deleteMany({ where: { userId: req.userId! } });
    await prisma.alert.deleteMany({ where: { userId: req.userId! } });
    res.json({ message: `Deleted ${count.count} glucose readings`, deleted: count.count });
  } catch {
    res.status(500).json({ error: 'Failed to delete readings' });
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

// Import CSV file with glucose readings
readingsRouter.post('/import', multer().single('csvFile'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    if (req.file.mimetype !== 'text/csv' && !req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a CSV file.' });
    }

    // Timezone offset sent by the browser (minutes from UTC, e.g., 240 for UTC-4)
    const timezoneOffset = parseInt(req.body.timezoneOffset || '0');

    const csvBuffer = req.file.buffer;
    if (!csvBuffer) {
      return res.status(400).json({ error: 'Failed to read uploaded file' });
    }

    // Libre3 CSV sometimes has a metadata row before the header row.
    // Find the actual header row (starts with "Device,") and skip anything before it.
    const raw = csvBuffer.toString('utf-8');
    const lines = raw.split('\n');
    let startLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('Device,')) {
        startLine = i;
        break;
      }
    }

    const results: any[] = [];

    await new Promise<void>((resolve, reject) => {
      Readable.from(lines.slice(startLine).join('\n'))
        .pipe(csv())
        .on('data', (row: any) => results.push(row))
        .on('end', () => resolve())
        .on('error', (e) => reject(e));
    });

    const readingsToInsert: {
      userId: number;
      readingDatetime: Date;
      glucoseValue: number;
      mealContext: string;
      source: string;
      medicationTaken: boolean;
    }[] = [];
    const errors: string[] = [];

    for (const row of results) {
      try {
        if (!row['Historic Glucose mg/dL'] && !row['Scan Glucose mg/dL']) {
          continue;
        }

        const glucoseValue = parseInt(row['Historic Glucose mg/dL'] || row['Scan Glucose mg/dL'], 10);

        if (isNaN(glucoseValue) || glucoseValue < 20 || glucoseValue > 600) {
          errors.push(`Invalid glucose value ${glucoseValue} in row`);
          continue;
        }

        let readingDatetime = new Date();
        if (row['Device Timestamp']) {
          try {
            const parts = row['Device Timestamp'].split(' ');
            const [m, d, y] = parts[0].split('-').map(Number);
            const [h, min] = parts[1].split(':').map(Number);
            const ampm = parts[2];
            let hr = h;
            if (ampm === 'PM' && h !== 12) hr = h + 12;
            if (ampm === 'AM' && h === 12) hr = 0;
            readingDatetime = new Date(Date.UTC(y, m - 1, d, hr, min) + timezoneOffset * 60 * 1000);
          } catch {}
        }

        readingsToInsert.push({
          userId: req.userId!,
          readingDatetime,
          glucoseValue,
          mealContext: 'other',
          source: 'CGM',
          medicationTaken: false,
        });
      } catch (e: any) {
        errors.push(e.message);
      }
    }

    if (readingsToInsert.length === 0) {
      return res.json({
        message: 'No valid glucose readings found in the CSV file',
        imported: 0,
        errors: errors.length > 0 ? errors : [],
      });
    }

    // Bulk insert all readings in a single query
    const createdReadings = await prisma.glucoseReading.createManyAndReturn({
      data: readingsToInsert,
    });

    // Create alerts in bulk (query profile once)
    const profile = await prisma.patientProfile.findUnique({ where: { userId: req.userId! } });
    const low = profile?.targetLow || 70;
    const high = profile?.targetHigh || 180;

    const alertsToInsert: {
      userId: number;
      readingId: number;
      type: string;
      severity: string;
      message: string;
    }[] = [];

    for (const reading of createdReadings) {
      let type: string, severity: string, message: string;

      if (reading.glucoseValue < 54) {
        type = 'critical_low';
        severity = 'critical';
        message = `CRITICAL LOW: Glucose reading ${reading.glucoseValue} mg/dL — below 54 mg/dL. Seek immediate medical attention.`;
      } else if (reading.glucoseValue < low) {
        type = 'low';
        severity = 'warning';
        message = `Low glucose: ${reading.glucoseValue} mg/dL — below target ${low} mg/dL. Consider treatment.`;
      } else if (reading.glucoseValue > 250) {
        type = 'critical_high';
        severity = 'critical';
        message = `CRITICAL HIGH: Glucose reading ${reading.glucoseValue} mg/dL — above 250 mg/dL. Seek medical attention.`;
      } else if (reading.glucoseValue > high) {
        type = 'high';
        severity = 'warning';
        message = `High glucose: ${reading.glucoseValue} mg/dL — above target ${high} mg/dL. Consider adjustment.`;
      } else {
        continue;
      }

      alertsToInsert.push({ userId: req.userId!, readingId: reading.id, type, severity, message });
    }

    if (alertsToInsert.length > 0) {
      await prisma.alert.createMany({ data: alertsToInsert });
    }

    res.json({
      message: `Successfully imported ${createdReadings.length} glucose readings`,
      imported: createdReadings.length,
      errors: errors.length > 0 ? errors : [],
    });
  } catch (err: any) {
    console.error('CSV Import Error:', err);
    res.status(500).json({ error: `Failed to import CSV file: ${err.message}` });
  }
});