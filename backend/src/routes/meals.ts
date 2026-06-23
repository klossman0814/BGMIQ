import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const mealsRouter = Router();
mealsRouter.use(authMiddleware);

const mealSchema = z.object({
  name: z.string().min(1, 'Meal name is required'),
  carbs: z.number().int().optional().nullable(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
  eatenAt: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});

mealsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const meals = await prisma.meal.findMany({
      where: { userId: req.userId! },
      orderBy: { eatenAt: 'desc' },
      take: 100,
    });
    res.json(meals);
  } catch {
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

mealsRouter.get('/analysis', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const months = parseInt(req.query.months as string) || 3;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const meals = await prisma.meal.findMany({
      where: { userId, eatenAt: { gte: startDate } },
      orderBy: { eatenAt: 'desc' },
    });

    if (meals.length === 0) {
      return res.json({ meals: [], rankings: null });
    }

    const mealAnalyses: any[] = [];

    for (const meal of meals) {
      const mealTime = meal.eatenAt.getTime();

      // Readings 30 min before to 4 hours after
      const windowStart = new Date(mealTime - 30 * 60 * 1000);
      const windowEnd = new Date(mealTime + 4 * 60 * 60 * 1000);

      const readings = await prisma.glucoseReading.findMany({
        where: {
          userId,
          readingDatetime: { gte: windowStart, lte: windowEnd },
        },
        orderBy: { readingDatetime: 'asc' },
      });

      if (readings.length === 0) continue;

      // Baseline: closest reading within 30 min BEFORE meal
      const beforeReadings = readings.filter(r => r.readingDatetime.getTime() <= mealTime);
      const baseline = beforeReadings.length > 0
        ? beforeReadings[beforeReadings.length - 1]
        : null;

      if (!baseline) continue;

      // Readings after meal
      const afterReadings = readings.filter(r => r.readingDatetime.getTime() > mealTime);

      if (afterReadings.length === 0) continue;

      // 1 hour post (±15 min window)
      const oneHourTarget = mealTime + 60 * 60 * 1000;
      const oneHour = afterReadings.reduce((best, r) => {
        const diff = Math.abs(r.readingDatetime.getTime() - oneHourTarget);
        return diff < Math.abs(best.readingDatetime.getTime() - oneHourTarget) ? r : best;
      }, afterReadings[0]);

      // 2 hour post (±15 min window)
      const twoHourTarget = mealTime + 2 * 60 * 60 * 1000;
      const twoHour = afterReadings.reduce((best, r) => {
        const diff = Math.abs(r.readingDatetime.getTime() - twoHourTarget);
        return diff < Math.abs(best.readingDatetime.getTime() - twoHourTarget) ? r : best;
      }, afterReadings[0]);

      // Peak within 3 hours
      const threeHourCutoff = mealTime + 3 * 60 * 60 * 1000;
      const peakReadings = afterReadings.filter(r => r.readingDatetime.getTime() <= threeHourCutoff);
      if (peakReadings.length === 0) continue;
      const peak = peakReadings.reduce((max, r) => r.glucoseValue > max.glucoseValue ? r : max, peakReadings[0]);

      const spike = peak.glucoseValue - baseline.glucoseValue;
      const minutesToPeak = Math.round((peak.readingDatetime.getTime() - mealTime) / 60000);

      // Return to baseline: first reading after peak that's <= baseline + 10%
      const baselineThreshold = baseline.glucoseValue + Math.round(baseline.glucoseValue * 0.1);
      const returnReadings = afterReadings.filter(r => r.readingDatetime.getTime() > peak.readingDatetime.getTime());
      const returnToBaseline = returnReadings.find(r => r.glucoseValue <= baselineThreshold) || null;
      const minutesAfterPeak = returnToBaseline
        ? Math.round((returnToBaseline.readingDatetime.getTime() - peak.readingDatetime.getTime()) / 60000)
        : null;

      mealAnalyses.push({
        mealId: meal.id,
        name: meal.name,
        mealType: meal.mealType,
        carbs: meal.carbs,
        eatenAt: meal.eatenAt,
        baseline: { value: baseline.glucoseValue, time: baseline.readingDatetime },
        oneHour: { value: oneHour.glucoseValue, time: oneHour.readingDatetime },
        twoHour: { value: twoHour.glucoseValue, time: twoHour.readingDatetime },
        peak: { value: peak.glucoseValue, time: peak.readingDatetime, minutesToPeak },
        spike,
        returnToBaseline: returnToBaseline
          ? { value: returnToBaseline.glucoseValue, time: returnToBaseline.readingDatetime, minutesAfterPeak }
          : null,
        readingCount: readings.length,
      });
    }

    // Rankings
    const byMealType: Record<string, { totalSpike: number; count: number }> = {};
    const byName: Record<string, { totalSpike: number; count: number }> = {};
    const byCarbRange: Record<string, { totalSpike: number; count: number }> = {};

    for (const ma of mealAnalyses) {
      if (!byMealType[ma.mealType]) byMealType[ma.mealType] = { totalSpike: 0, count: 0 };
      byMealType[ma.mealType].totalSpike += ma.spike;
      byMealType[ma.mealType].count++;

      if (!byName[ma.name]) byName[ma.name] = { totalSpike: 0, count: 0 };
      byName[ma.name].totalSpike += ma.spike;
      byName[ma.name].count++;

      const carbRange = ma.carbs == null ? 'Unknown'
        : ma.carbs <= 30 ? '0-30g'
        : ma.carbs <= 60 ? '31-60g'
        : ma.carbs <= 90 ? '61-90g'
        : '90g+';
      if (!byCarbRange[carbRange]) byCarbRange[carbRange] = { totalSpike: 0, count: 0 };
      byCarbRange[carbRange].totalSpike += ma.spike;
      byCarbRange[carbRange].count++;
    }

    const sortedBySpike = [...mealAnalyses].sort((a, b) => b.spike - a.spike);
    const foods = Object.entries(byName)
      .map(([name, data]) => ({ name, avgSpike: Math.round(data.totalSpike / data.count), count: data.count }))
      .filter(f => f.count >= 1);

    const rankings = {
      highestSpike: sortedBySpike.length > 0 ? { name: sortedBySpike[0].name, spike: sortedBySpike[0].spike, mealType: sortedBySpike[0].mealType, carbs: sortedBySpike[0].carbs, eatenAt: sortedBySpike[0].eatenAt } : null,
      lowestSpike: sortedBySpike.length > 0 ? { name: sortedBySpike[sortedBySpike.length - 1].name, spike: sortedBySpike[sortedBySpike.length - 1].spike, mealType: sortedBySpike[sortedBySpike.length - 1].mealType, carbs: sortedBySpike[sortedBySpike.length - 1].carbs, eatenAt: sortedBySpike[sortedBySpike.length - 1].eatenAt } : null,
      byMealType: Object.entries(byMealType).map(([type, data]) => ({ type, avgSpike: Math.round(data.totalSpike / data.count), count: data.count })),
      byCarbRange: Object.entries(byCarbRange).map(([range, data]) => ({ range, avgSpike: Math.round(data.totalSpike / data.count), count: data.count })),
      bestFoods: foods.sort((a, b) => a.avgSpike - b.avgSpike).slice(0, 5),
      worstFoods: foods.sort((a, b) => b.avgSpike - a.avgSpike).slice(0, 5),
    };

    res.json({ meals: mealAnalyses, rankings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Meal analysis failed' });
  }
});

mealsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const meal = await prisma.meal.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json(meal);
  } catch {
    res.status(500).json({ error: 'Failed to fetch meal' });
  }
});

mealsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = mealSchema.parse(req.body);
    const meal = await prisma.meal.create({
      data: {
        userId: req.userId!,
        name: data.name,
        carbs: data.carbs ?? null,
        mealType: data.mealType,
        eatenAt: data.eatenAt ? new Date(data.eatenAt) : new Date(),
        notes: data.notes ?? null,
      },
    });
    res.status(201).json(meal);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to create meal' });
  }
});

mealsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.meal.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Meal not found' });
    const data = mealSchema.partial().parse(req.body);
    const meal = await prisma.meal.update({
      where: { id: existing.id },
      data: {
        ...data,
        eatenAt: data.eatenAt ? new Date(data.eatenAt) : undefined,
      },
    });
    res.json(meal);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

mealsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.meal.findFirst({ where: { id: parseInt(req.params.id as string), userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Meal not found' });
    await prisma.meal.delete({ where: { id: existing.id } });
    res.json({ message: 'Meal deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});