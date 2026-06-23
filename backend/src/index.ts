import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { readingsRouter } from './routes/readings';
import { dashboardRouter } from './routes/dashboard';
import { analysisRouter } from './routes/analysis';
import { reportsRouter } from './routes/reports';
import { profileRouter } from './routes/profile';
import { alertsRouter } from './routes/alerts';
import { mealsRouter } from './routes/meals';
import { activitiesRouter } from './routes/activities';
import { insulinRouter } from './routes/insulin';
import { medicationsRouter } from './routes/medications';
import { medicationLogsRouter } from './routes/medication-logs';

const app = express();
const PORT = process.env.PORT || 3013;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5154', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/readings', readingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/insulin', insulinRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/medication-logs', medicationLogsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`BGMIQ API running on port ${PORT}`);
});

export default app;