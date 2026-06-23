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