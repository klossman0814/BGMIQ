import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.alert.deleteMany();
  await prisma.insulinLog.deleteMany();
  await prisma.medicationLog.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.glucoseReading.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const password = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.create({
    data: {
      email: 'demo@bgmiq.com',
      password,
      name: 'Alex Johnson',
      profile: {
        create: {
          dateOfBirth: '1985-06-15',
          diabetesType: 'Type1',
          targetLow: 70,
          targetHigh: 180,
          providerName: 'Dr. Sarah Chen',
          emergencyContact: '+1-555-123-4567',
          phone: '+1-555-987-6543',
        },
      },
    },
  });

  // Create medications
  const meds = await Promise.all([
    prisma.medication.create({
      data: { userId: user.id, name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', isActive: true },
    }),
    prisma.medication.create({
      data: { userId: user.id, name: 'Januvia', dosage: '100mg', frequency: 'Once daily', isActive: true },
    }),
  ]);

  // Generate 90 days of realistic glucose readings
  const now = new Date();
  const readings: any[] = [];
  const mealContexts = ['fasting', 'before_meal', 'after_meal', 'bedtime', 'overnight', 'other'];
  const sources = ['manual', 'meter', 'CGM'];

  function generateBaseValue(hour: number, mealContext: string): number {
    // Simulate realistic glucose patterns
    // Fasting: 80-120 (morning)
    // Before meal: 90-140
    // After meal: 110-200 (spike)
    // Bedtime: 100-160
    // Overnight: 70-130

    let base: number;
    switch (mealContext) {
      case 'fasting':
        base = hour >= 5 && hour <= 9 ? 90 + Math.random() * 40 : 100 + Math.random() * 50;
        break;
      case 'before_meal':
        base = 90 + Math.random() * 50;
        break;
      case 'after_meal':
        base = 120 + Math.random() * 80;
        break;
      case 'bedtime':
        base = 100 + Math.random() * 60;
        break;
      case 'overnight':
        base = 80 + Math.random() * 50;
        break;
      default:
        base = 100 + Math.random() * 60;
    }

    // Add some variability
    base += (Math.random() - 0.5) * 20;

    // Occasionally generate out-of-range values for realism
    const roll = Math.random();
    if (roll < 0.03) base = 45 + Math.random() * 20; // critical low
    else if (roll < 0.08) base = 55 + Math.random() * 14; // low
    else if (roll < 0.15) base = 200 + Math.random() * 60; // high
    else if (roll < 0.18) base = 260 + Math.random() * 80; // critical high

    return Math.round(Math.max(35, Math.min(500, base)));
  }

  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    // Number of readings per day (2-8)
    const numReadings = 2 + Math.floor(Math.random() * 6);

    for (let i = 0; i < numReadings; i++) {
      const hour = 6 + Math.floor(Math.random() * 18); // 6am to 11pm
      const minute = Math.floor(Math.random() * 60);
      const readingDate = new Date(date);
      readingDate.setHours(hour, minute, 0, 0);

      const mealContext = mealContexts[Math.floor(Math.random() * mealContexts.length)];
      const glucoseValue = generateBaseValue(hour, mealContext);

      readings.push({
        userId: user.id,
        readingDatetime: readingDate,
        glucoseValue,
        mealContext,
        source: sources[Math.floor(Math.random() * sources.length)],
        carbs: Math.random() > 0.6 ? Math.floor(Math.random() * 80) + 5 : null,
        insulinUnits: Math.random() > 0.5 ? Math.round((Math.random() * 10 + 2) * 10) / 10 : null,
        medicationTaken: Math.random() > 0.3,
        activityMinutes: Math.random() > 0.8 ? Math.floor(Math.random() * 60) + 10 : null,
        symptoms: Math.random() > 0.85 ? (glucoseValue < 70 ? 'Dizziness, sweating' : 'Thirst, fatigue') : null,
        notes: Math.random() > 0.9 ? 'Feeling okay today' : null,
      });
    }
  }

  // Insert readings in batches
  for (let i = 0; i < readings.length; i += 100) {
    await prisma.glucoseReading.createMany({
      data: readings.slice(i, i + 100),
    });
  }

  // Create some insulin logs
  const insulinTypes = ['rapid_acting', 'long_acting'];
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(8, 0, 0, 0);

    await prisma.insulinLog.create({
      data: {
        userId: user.id,
        insulinType: 'long_acting',
        units: Math.round((Math.random() * 10 + 15) * 10) / 10,
        administered: date,
      },
    });

    date.setHours(12, 0, 0, 0);
    await prisma.insulinLog.create({
      data: {
        userId: user.id,
        insulinType: 'rapid_acting',
        units: Math.round((Math.random() * 5 + 3) * 10) / 10,
        administered: date,
      },
    });
  }

  // Create alerts for out-of-range readings
  const outOfRangeReadings = await prisma.glucoseReading.findMany({
    where: {
      userId: user.id,
      OR: [
        { glucoseValue: { lt: 70 } },
        { glucoseValue: { gt: 180 } },
      ],
    },
    take: 20,
  });

  for (const reading of outOfRangeReadings) {
    let type: string, severity: string, message: string;
    if (reading.glucoseValue < 54) {
      type = 'critical_low'; severity = 'critical';
      message = `CRITICAL LOW: Glucose ${reading.glucoseValue} mg/dL`;
    } else if (reading.glucoseValue < 70) {
      type = 'low'; severity = 'warning';
      message = `Low glucose: ${reading.glucoseValue} mg/dL`;
    } else if (reading.glucoseValue > 250) {
      type = 'critical_high'; severity = 'critical';
      message = `CRITICAL HIGH: Glucose ${reading.glucoseValue} mg/dL`;
    } else {
      type = 'high'; severity = 'warning';
      message = `High glucose: ${reading.glucoseValue} mg/dL`;
    }

    await prisma.alert.create({
      data: {
        userId: user.id,
        readingId: reading.id,
        type,
        severity,
        message,
      },
    });
  }

  // Create sample meals
  const mealNames = ['Oatmeal', 'Greek Salad', 'Grilled Chicken', 'Salmon & Rice', 'Scrambled Eggs', 'Turkey Sandwich', 'Vegetable Stir-fry', 'Protein Shake'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  for (let daysAgo = 60; daysAgo >= 0; daysAgo -= 2) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const mealsPerDay = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < mealsPerDay; i++) {
      const mealDate = new Date(date);
      mealDate.setHours(7 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0, 0);
      await prisma.meal.create({
        data: {
          userId: user.id,
          name: mealNames[Math.floor(Math.random() * mealNames.length)],
          carbs: Math.floor(Math.random() * 80) + 10,
          mealType: mealTypes[Math.floor(Math.random() * mealTypes.length)],
          eatenAt: mealDate,
          notes: Math.random() > 0.7 ? 'Home-cooked' : null,
        },
      });
    }
  }

  // Create sample activities
  const activityNames = ['Walking', 'Jogging', 'Cycling', 'Swimming', 'Yoga', 'Weight Training', 'Basketball', 'Elliptical'];
  const intensities = ['light', 'moderate', 'vigorous'];
  for (let daysAgo = 45; daysAgo >= 0; daysAgo -= 3) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(6 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0, 0);
    await prisma.activity.create({
      data: {
        userId: user.id,
        name: activityNames[Math.floor(Math.random() * activityNames.length)],
        duration: 15 + Math.floor(Math.random() * 50),
        intensity: intensities[Math.floor(Math.random() * intensities.length)],
        startedAt: date,
      },
    });
  }

  // Create sample medication logs
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    for (const med of meds) {
      const morningLog = new Date(date);
      morningLog.setHours(8, 0, 0, 0);
      await prisma.medicationLog.create({
        data: {
          userId: user.id,
          medicationId: med.id,
          takenAt: morningLog,
          dose: med.dosage,
          skipped: Math.random() < 0.05,
        },
      });
      if (med.frequency.includes('Twice')) {
        const eveningLog = new Date(date);
        eveningLog.setHours(20, 0, 0, 0);
        await prisma.medicationLog.create({
          data: {
            userId: user.id,
            medicationId: med.id,
            takenAt: eveningLog,
            dose: med.dosage,
            skipped: Math.random() < 0.05,
          },
        });
      }
    }
  }

  const mealCount = await prisma.meal.count();
  const activityCount = await prisma.activity.count();
  const medLogCount = await prisma.medicationLog.count();
  const insulinCount = await prisma.insulinLog.count();

  console.log('Seed data created successfully!');
  console.log(`Demo login: demo@bgmiq.com / demo1234`);
  console.log(`Created ${readings.length} glucose readings`);
  console.log(`Created ${outOfRangeReadings.length} alerts`);
  console.log(`Created ${mealCount} meals`);
  console.log(`Created ${activityCount} activities`);
  console.log(`Created ${medLogCount} medication logs`);
  console.log(`Created ${insulinCount} insulin logs`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());