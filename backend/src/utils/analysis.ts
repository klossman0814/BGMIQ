interface GlucoseReadingData {
  glucoseValue: number;
  mealContext: string;
  readingDatetime: Date;
  carbs?: number | null;
  insulinUnits?: number | null;
  medicationTaken?: boolean;
  activityMinutes?: number | null;
}

export function calculateKPIs(readings: GlucoseReadingData[]) {
  if (readings.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      median: 0,
      stdDev: 0,
      coefficientOfVariation: 0,
      gmi: 0,
      timeInRangePercent: 0,
      timeBelowRangePercent: 0,
      timeAboveRangePercent: 0,
      timeVeryLowPercent: 0,
      timeVeryHighPercent: 0,
      lowEvents: 0,
      highEvents: 0,
      inRangeCount: 0,
      totalCount: 0,
    };
  }

  const values = readings.map(r => r.glucoseValue);
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);

  // Basic stats
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / n;
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // Standard deviation
  const variance = values.reduce((acc, v) => acc + (v - average) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = average > 0 ? (stdDev / average) * 100 : 0;

  // Time in ranges
  const veryLow = values.filter(v => v < 54).length;
  const low = values.filter(v => v >= 54 && v < 70).length;
  const inRange = values.filter(v => v >= 70 && v <= 180).length;
  const high = values.filter(v => v > 180 && v <= 250).length;
  const veryHigh = values.filter(v => v > 250).length;

  // GMI = 3.31 + 0.02392 × mean glucose (mg/dL) — ADA standard formula
  const gmi = 3.31 + 0.02392 * average;

  return {
    average: Math.round(average * 10) / 10,
    min,
    max,
    median: Math.round(median * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    coefficientOfVariation: Math.round(coefficientOfVariation * 10) / 10,
    gmi: Math.round(gmi * 10) / 10,
    timeInRangePercent: Math.round((inRange / n) * 100),
    timeBelowRangePercent: Math.round(((veryLow + low) / n) * 100),
    timeAboveRangePercent: Math.round(((high + veryHigh) / n) * 100),
    timeVeryLowPercent: Math.round((veryLow / n) * 100),
    timeVeryHighPercent: Math.round((veryHigh / n) * 100),
    lowEvents: veryLow + low,
    highEvents: high + veryHigh,
    inRangeCount: inRange,
    totalCount: n,
  };
}

export function calculateDetailedKPIs(readings: GlucoseReadingData[]) {
  const values = readings.map(r => r.glucoseValue);
  const n = values.length;
  if (n === 0) {
    return {
      overnightLows: 0,
      morningHighs: 0,
      postMealSpikes: 0,
      medicationAdherence: 0,
      daysLoggedPercent: 0,
      readingsPerDay: 0,
      hypoglycemiaEvents: 0,
      hyperglycemiaEvents: 0,
    };
  }

  // Overnight lows (12am-6am, < 70)
  const overnightLows = readings.filter(r => {
    const h = r.readingDatetime.getHours();
    return r.glucoseValue < 70 && h >= 0 && h <= 6;
  }).length;

  // Morning highs (6am-10am, > 180)
  const morningHighs = readings.filter(r => {
    const h = r.readingDatetime.getHours();
    return r.glucoseValue > 180 && h >= 6 && h <= 10;
  }).length;

  // Post-meal spikes (after_meal readings with high values)
  const postMealSpikes = readings.filter(r => {
    return r.mealContext === 'after_meal' && r.glucoseValue > 180;
  }).length;

  // Unique days
  const uniqueDays = new Set(readings.map(r => r.readingDatetime.toISOString().split('T')[0]));
  const firstDay = new Date(Math.min(...readings.map(r => r.readingDatetime.getTime())));
  const lastDay = new Date(Math.max(...readings.map(r => r.readingDatetime.getTime())));
  const totalDays = Math.max(Math.ceil((lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)), 1);

  // Hypo/Hyper events
  const hypoglycemiaEvents = values.filter(v => v < 70).length;
  const hyperglycemiaEvents = values.filter(v => v > 180).length;
  const medicationAdherence = readings.filter(r => r.medicationTaken).length;

  return {
    overnightLows,
    morningHighs,
    postMealSpikes,
    medicationAdherence: readings.length > 0 ? Math.round((medicationAdherence / readings.length) * 100) : 0,
    daysLoggedPercent: Math.round((uniqueDays.size / totalDays) * 100),
    readingsPerDay: Math.round((n / uniqueDays.size) * 10) / 10,
    hypoglycemiaEvents,
    hyperglycemiaEvents,
  };
}