import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSalesStats = async (req: Request, res: Response) => {
  // console.log('Fetching sales stats...'); // Reduced noise
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Ensure dates are compared correctly in UTC if needed, but standard Date usually works
    // If empty results persist, check if database timezone differs significantly
    
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

    // console.log(`Found ${orders.length} orders for stats.`); // Reduced noise

    // Group by day
    const salesByDate: Record<string, number> = {};
    
    orders.forEach(order => {
      // Format date as YYYY-MM-DD
      const dateKey = order.createdAt.toISOString().split('T')[0];
      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + (Number(order.totalAmount) || 0);
    });

    // Fill missing days with 0
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      
      chartData.push({
        date: `${d.getDate()}/${d.getMonth() + 1}`, // DD/MM format for chart
        fullDate: dateKey,
        value: salesByDate[dateKey] || 0
      });
    }

    const totalSales = orders.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
    const totalOrders = orders.length;

    res.json({
      totalSales,
      totalOrders,
      chartData
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ message: 'Error fetching sales stats' });
  }
};

export const getTopProducts = async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: { gte: thirtyDaysAgo },
          status: { not: 'CANCELLED' }
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    });

    const productIds = topItems
        .map(item => item.productId)
        .filter((id): id is string => id !== null);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true }
    });

    const result = topItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        id: item.productId,
        name: product?.name || 'Produto Desconhecido',
        sku: product?.sku || '',
        quantity: item._sum.quantity || 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ message: 'Error fetching top products' });
  }
};

export const getOrdersByStatus = async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      }
    });

    const result = statusCounts.map(item => ({
      status: item.status,
      count: item._count.id
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching orders by status:', error);
    res.status(500).json({ message: 'Error fetching orders by status' });
  }
};
