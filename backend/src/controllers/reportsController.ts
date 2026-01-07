import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSalesStats = async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        },
        status: {
            not: 'CANCELLED'
        }
      },
      select: {
        createdAt: true,
        totalAmount: true
      }
    });

    const stats: Record<string, number> = {};
    orders.forEach(order => {
        const date = order.createdAt.toISOString().split('T')[0];
        stats[date] = (stats[date] || 0) + Number(order.totalAmount);
    });

    const result = [];
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        result.push({
            date: dateStr, // e.g., 2023-10-27
            total: stats[dateStr] || 0
        });
    }

    res.json(result.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales stats', error });
  }
};
