import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createPlan = async (req: Request, res: Response) => {
  try {
    const { name, monthlyPrice, cycleDays } = req.body;

    const plan = await prisma.plan.create({
      data: {
        name,
        monthlyPrice: parseFloat(monthlyPrice),
        cycleDays: cycleDays ? parseInt(cycleDays) : 30
      }
    });

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Error creating plan' });
  }
};

export const listPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Error listing plans' });
  }
};

export const updatePlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, monthlyPrice, cycleDays } = req.body;

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        monthlyPrice: monthlyPrice ? parseFloat(monthlyPrice) : undefined,
        cycleDays: cycleDays ? parseInt(cycleDays) : undefined
      }
    });

    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Error updating plan' });
  }
};

export const deletePlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.plan.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting plan' });
  }
};
