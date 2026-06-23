import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { calculateKPIs, calculateDetailedKPIs } from '../utils/analysis';

export const reportsRouter = Router();
reportsRouter.use(authMiddleware);

reportsRouter.get('/doctor-report', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = { userId };
    if (startDate && endDate) {
      where.readingDatetime = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    const [readings, user, medications, insulinLogs, medicationLogs] = await Promise.all([
      prisma.glucoseReading.findMany({ where, orderBy: { readingDatetime: 'asc' } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, profile: true },
      }),
      prisma.medication.findMany({ where: { userId, isActive: true } }),
      prisma.insulinLog.findMany({
        where: { userId, administered: where.readingDatetime || {} },
        orderBy: { administered: 'asc' },
      }),
      prisma.medicationLog.findMany({
        where: { userId, takenAt: where.readingDatetime || {} },
        orderBy: { takenAt: 'asc' },
        include: { medication: true },
      }),
    ]);

    const basicKPI = calculateKPIs(readings);
    const detailedKPI = calculateDetailedKPIs(readings);

    // Low events
    const lowEvents = readings.filter(r => r.glucoseValue < 70);
    const highEvents = readings.filter(r => r.glucoseValue > 180);
    const overnightLows = readings.filter(r => {
      const h = r.readingDatetime.getHours();
      return r.glucoseValue < 70 && (h >= 0 && h <= 6);
    });
    const morningHighs = readings.filter(r => {
      const h = r.readingDatetime.getHours();
      return r.glucoseValue > 180 && (h >= 6 && h <= 10);
    });

    // Post-meal spike analysis
    const afterMealReadings = readings.filter(r => r.mealContext === 'after_meal' && r.carbs);
    const postMealSpikes = afterMealReadings.map(r => ({
      date: r.readingDatetime,
      glucoseValue: r.glucoseValue,
      carbs: r.carbs,
    }));

    // Medication adherence
    const totalMeds = medicationLogs.length;
    const takenMeds = medicationLogs.filter(l => !l.skipped).length;
    const adherencePercent = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 0;

    // Days logged
    const uniqueDays = new Set(readings.map(r => r.readingDatetime.toISOString().split('T')[0]));
    const dateRange = startDate && endDate
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 30;
    const daysLoggedPercent = Math.round((uniqueDays.size / Math.max(dateRange, 1)) * 100);

    // Insulin summary
    const insulinSummary: Record<string, { totalUnits: number; count: number }> = {};
    for (const log of insulinLogs) {
      if (!insulinSummary[log.insulinType]) {
        insulinSummary[log.insulinType] = { totalUnits: 0, count: 0 };
      }
      insulinSummary[log.insulinType].totalUnits += log.units;
      insulinSummary[log.insulinType].count++;
    }

    res.json({
      generatedAt: new Date().toISOString(),
      patient: {
        name: user?.name || 'Unknown',
        email: user?.email,
        profile: user?.profile,
      },
      dateRange: { startDate, endDate },
      summary: {
        totalReadings: readings.length,
        uniqueDays: uniqueDays.size,
        daysLoggedPercent,
        readingsPerDay: readings.length / Math.max(uniqueDays.size, 1),
      },
      kpis: {
        ...basicKPI,
        ...detailedKPI,
        adherencePercent,
      },
      events: {
        lowEvents: lowEvents.length,
        highEvents: highEvents.length,
        overnightLows: overnightLows.length,
        morningHighs: morningHighs.length,
        postMealSpikes: postMealSpikes.length,
      },
      trendData: readings.map(r => ({
        date: r.readingDatetime.toISOString().split('T')[0],
        time: r.readingDatetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: r.glucoseValue,
        mealContext: r.mealContext,
        symptoms: r.symptoms,
      })),
      medications: medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
      })),
      medicationLogs: medicationLogs.map(l => ({
        name: l.medication.name,
        dose: l.dose,
        takenAt: l.takenAt,
        skipped: l.skipped,
        notes: l.notes,
      })),
      insulinSummary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});