import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { calculateKPIs, calculateDetailedKPIs } from '../utils/analysis';

export const analysisRouter = Router();
analysisRouter.use(authMiddleware);

analysisRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const days = parseInt(req.query.days as string) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const readings = await prisma.glucoseReading.findMany({
      where: {
        userId,
        readingDatetime: { gte: startDate },
      },
      orderBy: { readingDatetime: 'asc' },
    });

    // Basic KPIs
    const basicKPI = calculateKPIs(readings);

    // Detailed KPIs
    const detailedKPI = calculateDetailedKPIs(readings);

    // Readings by meal context
    const byMealContext: Record<string, { count: number; avg: number; values: number[] }> = {};
    for (const r of readings) {
      if (!byMealContext[r.mealContext]) {
        byMealContext[r.mealContext] = { count: 0, avg: 0, values: [] };
      }
      byMealContext[r.mealContext].count++;
      byMealContext[r.mealContext].values.push(r.glucoseValue);
    }
    for (const key of Object.keys(byMealContext)) {
      const vals = byMealContext[key].values;
      byMealContext[key].avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }

    // Hourly averages
    const hourly: Record<number, number[]> = {};
    for (const r of readings) {
      const hour = r.readingDatetime.getHours();
      if (!hourly[hour]) hourly[hour] = [];
      hourly[hour].push(r.glucoseValue);
    }
    const hourlyAverages = Object.entries(hourly).map(([hour, values]) => ({
      hour: parseInt(hour),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    })).sort((a, b) => a.hour - b.hour);

    // Daily averages
    const daily: Record<string, number[]> = {};
    for (const r of readings) {
      const dateKey = r.readingDatetime.toISOString().split('T')[0];
      if (!daily[dateKey]) daily[dateKey] = [];
      daily[dateKey].push(r.glucoseValue);
    }
    const dailyAverages = Object.entries(daily).map(([date, values]) => ({
      date,
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Time in range donut data
    const timeInRange = {
      veryLow: basicKPI.timeVeryLowPercent,
      low: basicKPI.timeBelowRangePercent - basicKPI.timeVeryLowPercent,
      inRange: basicKPI.timeInRangePercent,
      high: basicKPI.timeAboveRangePercent - basicKPI.timeVeryHighPercent,
      veryHigh: basicKPI.timeVeryHighPercent,
    };

    // Low/High events by day
    const eventsByDay: Record<string, { lows: number; highs: number; criticalLows: number; criticalHighs: number }> = {};
    for (const r of readings) {
      const dateKey = r.readingDatetime.toISOString().split('T')[0];
      if (!eventsByDay[dateKey]) eventsByDay[dateKey] = { lows: 0, highs: 0, criticalLows: 0, criticalHighs: 0 };
      if (r.glucoseValue < 54) eventsByDay[dateKey].criticalLows++;
      else if (r.glucoseValue < 70) eventsByDay[dateKey].lows++;
      if (r.glucoseValue > 250) eventsByDay[dateKey].criticalHighs++;
      else if (r.glucoseValue > 180) eventsByDay[dateKey].highs++;
    }

    res.json({
      basic: basicKPI,
      detailed: detailedKPI,
      byMealContext,
      hourlyAverages,
      dailyAverages,
      timeInRange,
      eventsByDay,
      totalReadings: readings.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});