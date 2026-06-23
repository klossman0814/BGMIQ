# BGMIQ - Diabetes Glucose Monitor

A secure web application for recording, monitoring, analyzing, and reporting blood glucose readings for diabetes management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS 3 |
| **Charts** | Recharts |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma 6 |
| **Auth** | JWT with bcrypt password hashing |

## Architecture

```
bgmiq/
├── backend/                   # Express API server
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (10 tables)
│   │   └── seed.ts            # Demo data seeder
│   └── src/
│       ├── index.ts           # Express app entry
│       ├── prisma.ts          # Prisma client singleton
│       ├── middleware/
│       │   └── auth.ts        # JWT auth middleware
│       ├── routes/
│       │   ├── auth.ts        # Register, login, me
│       │   ├── readings.ts    # CRUD glucose readings
│       │   ├── dashboard.ts   # Aggregated dashboard data
│       │   ├── analysis.ts    # Statistical analysis & KPIs
│       │   ├── reports.ts     # Doctor's report generation
│       │   ├── profile.ts     # Patient profile management
│       │   └── alerts.ts      # Glucose alerts/notifications
│       └── utils/
│           └── analysis.ts    # KPI calculation engine
│
├── frontend/                  # React SPA
│   └── src/
│       ├── App.tsx            # Router with auth guards
│       ├── main.tsx           # Entry point
│       ├── index.css          # Tailwind + custom styles
│       ├── types/index.ts     # TypeScript interfaces
│       ├── services/api.ts    # Axios API client
│       ├── hooks/useAuth.tsx  # Auth context provider
│       ├── components/
│       │   ├── Layout.tsx     # Main app layout
│       │   ├── Sidebar.tsx    # Navigation sidebar
│       │   ├── StatCard.tsx   # KPI stat card
│       │   └── Shared.tsx     # Shared UI components
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── GlucoseLogPage.tsx
│       │   ├── AddReadingPage.tsx
│       │   ├── AnalysisPage.tsx
│       │   ├── ReportsPage.tsx
│       │   ├── MedicationsPage.tsx
│       │   └── SettingsPage.tsx
│       └── utils/helpers.ts   # Formatting & utility functions
└── README.md
```

## Database Schema

10 tables managed by Prisma:

| Table | Purpose |
|-------|---------|
| `User` | Authentication accounts |
| `PatientProfile` | Patient demographics & settings |
| `GlucoseReading` | Blood glucose readings (primary table) |
| `Medication` | Medication library per patient |
| `MedicationLog` | Medication adherence tracking |
| `InsulinLog` | Insulin dose records |
| `Meal` | Meal tracking |
| `Activity` | Physical activity records |
| `Alert` | Auto-generated glucose alerts |

## Quick Start

### 🐳 Docker (Recommended)

The entire application runs in Docker with a single command:

```bash
docker compose up -d
```

This starts three services:

| Service | Port | URL |
|---------|------|-----|
| **PostgreSQL** | `5439` | `localhost:5439` |
| **BGMIQ API** | `3013` | `http://localhost:3013` |
| **BGMIQ Frontend** | `5154` | `http://localhost:5154` |

The first run will:
1. Pull PostgreSQL 16 and set up the database
2. Build the backend container, run Prisma migrations, and seed demo data
3. Build the frontend container with nginx

**Login with demo account:** `demo@bgmiq.com` / `demo1234`

```bash
# View logs
docker compose logs -f api

# Stop everything
docker compose down

# Reset database (starts fresh)
docker compose down -v && docker compose up -d
```

### Manual Setup (without Docker)

#### Prerequisites
- Node.js 18+
- PostgreSQL running locally

### 1. Setup Database

```bash
# Create PostgreSQL database
createdb bgmiq

# Or via psql:
psql -U postgres -c "CREATE DATABASE bgmiq;"
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run setup         # Generate Prisma client, push schema, seed data
npm run dev           # API server on http://localhost:3013
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev           # Dev server on http://localhost:5154
```

### 4. Login

Open http://localhost:5154 and login with:
- **Email:** `demo@bgmiq.com`
- **Password:** `demo1234`

The seed script creates 90 days of realistic glucose data with ~5 readings per day.

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user (auth required)

### Glucose Readings
- `GET /api/readings` - List readings (paginated, filterable by date)
- `GET /api/readings/:id` - Get single reading
- `POST /api/readings` - Create reading
- `PUT /api/readings/:id` - Update reading
- `DELETE /api/readings/:id` - Delete reading

### Dashboard
- `GET /api/dashboard` - Aggregated dashboard data (KPIs, trends, charts)

### Analysis
- `GET /api/analysis?days=30` - Statistical analysis & KPIs

### Reports
- `GET /api/reports/doctor-report?startDate=&endDate=` - Doctor's report data

### Profile
- `GET /api/profile` - Get patient profile
- `PUT /api/profile` - Update patient profile

### Alerts
- `GET /api/alerts` - List alerts
- `PUT /api/alerts/:id/read` - Mark alert as read
- `PUT /api/alerts/read-all` - Mark all as read

## Features

### Dashboard
- Current/latest glucose with color-coded alert badge
- Today's average, 7-day average, 14-day average KPIs
- Time in Range % with donut chart breakdown
- Low/high event counts
- Readings per day bar chart
- Daily glucose trend chart
- 7-day glucose trend chart
- Meal context distribution

### Glucose Log
- Full reading history with pagination
- Quick-glance glucose level badges
- Edit and delete actions
- Add new reading form with validation

### Analysis
- 13+ KPI calculations (avg, median, min, max, std dev, CV, TIR, etc.)
- Hourly average patterns
- Daily average trend chart
- By-meal-context analysis
- Time in Range distribution (5-zone donut)
- Adjustable time periods (7d, 14d, 30d)

### Reports
- Doctor's printable report with date range filter
- Summary KPIs, event counts, medication list
- Insulin usage summary
- Trend chart
- Print/PDF export via browser print

### Glucose Ranges
| Range | Label | Color |
|-------|-------|-------|
| Below 54 | Critical Low | 🟥 Dark Red |
| 54–69 | Low | 🟧 Orange |
| 70–180 | In Range | 🟩 Green |
| 181–250 | High | 🟨 Yellow |
| Above 250 | Critical High | 🟥 Red |

### Alerts
Auto-generated when readings are out of range:
- **Critical Low** (< 54): "Seek immediate medical attention"
- **Low** (54–69): "Consider treatment"
- **High** (181–250): "Consider adjustment"
- **Critical High** (> 250): "Seek medical attention"

## Project Configuration

### Environment Variables (backend/.env)
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5439/bgmiq` | PostgreSQL connection |
| `JWT_SECRET` | (change in production) | JWT signing key |
| `PORT` | `3013` | API server port |
| `FRONTEND_URL` | `http://localhost:5154` | CORS origin |