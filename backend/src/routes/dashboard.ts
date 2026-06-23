import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { calculateKPIs } from '../utils/analysis';

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

dashboardRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    // Latest reading
    const latestReading = await prisma.glucoseReading.findFirst({
      where: { userId },
      orderBy: { readingDatetime: 'desc' },
    });

    // Today's readings
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayReadings = await prisma.glucoseReading.findMany({
      where: { userId, readingDatetime: { gte: todayStart } },
      orderBy: { readingDatetime: 'asc' },
    });

    // 7-day readings
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekReadings = await prisma.glucoseReading.findMany({
      where: { userId, readingDatetime: { gte: weekAgo } },
      orderBy: { readingDatetime: 'asc' },
    });

    // 14-day readings
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twoWeekReadings = await prisma.glucoseReading.findMany({
      where: { userId, readingDatetime: { gte: twoWeeksAgo } },
      orderBy: { readingDatetime: 'asc' },
    });

    // 30-day readings
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthReadings = await prisma.glucoseReading.findMany({
      where: { userId, readingDatetime: { gte: monthAgo } },
      orderBy: { readingDatetime: 'asc' },
    });

    // Calculate KPIs for each period
    const todayKPI = calculateKPIs(todayReadings);
    const weekKPI = calculateKPIs(weekReadings);
    const twoWeekKPI = calculateKPIs(twoWeekReadings);
    const monthKPI = calculateKPIs(monthReadings);

    // Unread alerts count
    const unreadAlerts = await prisma.alert.count({
      where: { userId, isRead: false },
    });

    // Readings per day (last 7 days)
    const readingsPerDay = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const count = weekReadings.filter(
        r => r.readingDatetime >= dayStart && r.readingDatetime < dayEnd
      ).length;
      readingsPerDay.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      });
    }

    // Daily trend data (today)
    const dailyTrendData = todayReadings.map(r => ({
      time: r.readingDatetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: r.glucoseValue,
      mealContext: r.mealContext,
    }));

    // 7-day trend data
    const weekTrendData = weekReadings.map(r => ({
      date: r.readingDatetime.toISOString().split('T')[0],
      time: r.readingDatetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: r.glucoseValue,
      mealContext: r.mealContext,
    }));

    // 14-day trend data
    const twoWeekTrendData = twoWeekReadings.map(r => ({
      date: r.readingDatetime.toISOString().split('T')[0],
      time: r.readingDatetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: r.glucoseValue,
      mealContext: r.mealContext,
    }));

    // Meal context distribution
    const mealContextCounts: Record<string, number> = {};
    for (const r of weekReadings) {
      mealContextCounts[r.mealContext] = (mealContextCounts[r.mealContext] || 0) + 1;
    }

    res.json({
      latestReading,
      todayKPI,
      weekKPI,
      twoWeekKPI,
      monthKPI,
      dailyTrendData,
      weekTrendData,
      twoWeekTrendData,
      readingsPerDay,
      mealContextDistribution: mealContextCounts,
      unreadAlerts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});