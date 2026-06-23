export interface User {
  id: number;
  email: string;
  name: string;
  profile?: PatientProfile;
}

export interface PatientProfile {
  id: number;
  userId: number;
  dateOfBirth: string | null;
  diabetesType: string | null;
  glucoseUnit: string;
  targetLow: number;
  targetHigh: number;
  providerName: string | null;
  emergencyContact: string | null;
  phone: string | null;
}

export interface GlucoseReading {
  id: number;
  userId: number;
  readingDatetime: string;
  glucoseValue: number;
  mealContext: MealContext;
  source: ReadingSource;
  carbs: number | null;
  insulinUnits: number | null;
  medicationTaken: boolean;
  activityMinutes: number | null;
  symptoms: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MealContext = 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'overnight' | 'other';
export type ReadingSource = 'manual' | 'meter' | 'CGM';
export type DiabetesType = 'Type1' | 'Type2' | 'Gestational' | 'Pre-diabetic' | 'Other';

export interface DashboardData {
  latestReading: GlucoseReading | null;
  todayKPI: KPI;
  weekKPI: KPI;
  twoWeekKPI: KPI;
  monthKPI: KPI;
  dailyTrendData: TrendPoint[];
  weekTrendData: TrendPoint[];
  twoWeekTrendData: TrendPoint[];
  readingsPerDay: ReadingsPerDay[];
  mealContextDistribution: Record<string, number>;
  unreadAlerts: number;
}

export interface TrendPoint {
  time: string;
  date?: string;
  value: number;
  mealContext: string;
}

export interface ReadingsPerDay {
  date: string;
  count: number;
}

export interface KPI {
  average: number;
  min: number;
  max: number;
  median: number;
  stdDev: number;
  coefficientOfVariation: number;
  gmi: number;
  timeInRangePercent: number;
  timeBelowRangePercent: number;
  timeAboveRangePercent: number;
  timeVeryLowPercent: number;
  timeVeryHighPercent: number;
  lowEvents: number;
  highEvents: number;
  inRangeCount: number;
  totalCount: number;
}

export interface DetailedKPI {
  overnightLows: number;
  morningHighs: number;
  postMealSpikes: number;
  medicationAdherence: number;
  adherencePercent: number;
  daysLoggedPercent: number;
  readingsPerDay: number;
  hypoglycemiaEvents: number;
  hyperglycemiaEvents: number;
}

export interface AnalysisData {
  basic: KPI;
  detailed: DetailedKPI;
  byMealContext: Record<string, { count: number; avg: number; values: number[] }>;
  hourlyAverages: HourlyAverage[];
  dailyAverages: DailyAverage[];
  timeInRange: TimeInRangeData;
  eventsByDay: Record<string, { lows: number; highs: number; criticalLows: number; criticalHighs: number }>;
  totalReadings: number;
}

export interface HourlyAverage {
  hour: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface DailyAverage {
  date: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface TimeInRangeData {
  veryLow: number;
  low: number;
  inRange: number;
  high: number;
  veryHigh: number;
}

export interface DoctorReport {
  generatedAt: string;
  patient: {
    name: string;
    email: string | undefined;
    profile: PatientProfile | null;
  };
  dateRange: { startDate: string; endDate: string } | null;
  summary: {
    totalReadings: number;
    uniqueDays: number;
    daysLoggedPercent: number;
    readingsPerDay: number;
  };
  kpis: KPI & DetailedKPI;
  events: {
    lowEvents: number;
    highEvents: number;
    overnightLows: number;
    morningHighs: number;
    postMealSpikes: number;
  };
  trendData: TrendPoint[];
  medications: { name: string; dosage: string; frequency: string }[];
  medicationLogs: { name: string; dose: string; takenAt: string; skipped: boolean; notes: string | null }[];
  insulinSummary: Record<string, { totalUnits: number; count: number }>;
}

export interface AlertData {
  id: number;
  type: string;
  severity: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  reading: { glucoseValue: number; readingDatetime: string } | null;
}

export interface PaginatedReadings {
  readings: GlucoseReading[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}