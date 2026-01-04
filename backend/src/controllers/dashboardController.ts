import { Request, Response } from 'express';
import prisma from '../prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();
    
    // Produtos com estoque baixo (ex: < 5)
    const lowStockProducts = await prisma.product.count({
        where: {
            stockAvailable: {
                lt: 5
            }
        }
    });

    // Pedidos pendentes (ex: NEW ou SENT_TO_SUPPLIER)
    const pendingOrders = await prisma.order.count({
        where: {
            status: {
                in: ['NEW', 'SENT_TO_SUPPLIER']
            }
        }
    });

    // Total de vendas (Soma totalAmount de pedidos não cancelados)
    const totalSalesAggregate = await prisma.order.aggregate({
        _sum: {
            totalAmount: true
        },
        where: {
            status: {
                not: 'CANCELLED'
            }
        }
    });

    const totalSales = totalSalesAggregate._sum.totalAmount || 0;

    res.json({
        totalProducts,
        totalOrders,
        lowStockProducts,
        pendingOrders,
        totalSales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching dashboard stats', error });
  }
};
