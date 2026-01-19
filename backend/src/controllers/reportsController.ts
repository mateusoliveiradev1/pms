import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSalesStats = async (req: Request, res: Response) => {
  // console.log('Fetching sales stats...'); // Reduced noise
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let where: any = {
      createdAt: { gte: thirtyDaysAgo },
      status: { not: 'CANCELLED' }
    };

    // 1. Determine Allowed Scope and Filter
    let allowedSupplierIds: string[] = [];
    const isSystemAdmin = authUser?.role === 'SYSTEM_ADMIN' || authUser?.role === 'ADMIN';

    if (isSystemAdmin) {
        // System Admin can see everything, so allowed list is effectively "ALL"
        // We handle specific filtering below
    } else {
        if (!authUser?.userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await prisma.user.findUnique({ where: { id: authUser.userId }, select: { accountId: true, role: true } });
        
        if (!user?.accountId) {
             res.json({ totalSales: 0, totalOrders: 0, chartData: [] });
             return;
        }

        if (user.role === 'ACCOUNT_ADMIN') {
             allowedSupplierIds = await prisma.supplier.findMany({
                 where: { accountId: user.accountId },
                 select: { id: true }
             }).then(list => list.map(s => s.id));
        } else {
             allowedSupplierIds = await prisma.supplier.findMany({
                 where: { userId: authUser.userId },
                 select: { id: true }
             }).then(list => list.map(s => s.id));
             
             if (allowedSupplierIds.length === 0) {
                 res.json({ totalSales: 0, totalOrders: 0, chartData: [] });
                 return;
             }
        }
    }

    // 2. Apply Filters
    const rawSupplierId = req.query.supplierId;
    const requestedSupplierId = (rawSupplierId && rawSupplierId !== 'undefined' && rawSupplierId !== 'null') 
        ? String(rawSupplierId) 
        : null;

    if (requestedSupplierId) {
        if (isSystemAdmin) {
            where.supplierId = requestedSupplierId;
        } else {
            if (allowedSupplierIds.includes(requestedSupplierId)) {
                where.supplierId = requestedSupplierId;
            } else {
                where.supplierId = '00000000-0000-0000-0000-000000000000';
            }
        }
    } else {
        if (!isSystemAdmin) {
            where.supplierId = { in: allowedSupplierIds };
        }
    }
    
    console.log(`📊 [SalesStats] Final Where:`, JSON.stringify(where));
    
    // Ensure dates are compared correctly in UTC if needed, but standard Date usually works
    // If empty results persist, check if database timezone differs significantly
    
    const orders = await prisma.order.findMany({
      where,
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
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const isSystemAdmin = authUser?.role === 'SYSTEM_ADMIN' || authUser?.role === 'ADMIN';
    const rawSupplierId = req.query.supplierId;
    const requestedSupplierId = (rawSupplierId && rawSupplierId !== 'undefined' && rawSupplierId !== 'null') 
        ? String(rawSupplierId) 
        : null;

    let orderWhere: any = {
      createdAt: { gte: thirtyDaysAgo },
      status: { not: 'CANCELLED' }
    };

    // Filter Logic (Copied from getSalesStats for consistency)
    if (isSystemAdmin) {
        if (requestedSupplierId) {
            orderWhere.supplierId = requestedSupplierId;
        }
    } else {
        // ... (Simplified for brevity as TopProducts is less critical for security context leak here, 
        // BUT strictly we should check permissions. For now, assuming standard user flow is protected by auth middleware context)
        // Wait, we MUST protect data.
        if (!authUser?.userId) return res.status(401).json({ message: 'Unauthorized' });
        
        const user = await prisma.user.findUnique({ where: { id: authUser.userId }, select: { accountId: true, role: true } });
        let allowedSupplierIds: string[] = [];

        if (user?.role === 'ACCOUNT_ADMIN') {
             allowedSupplierIds = await prisma.supplier.findMany({ where: { accountId: user?.accountId || '' }, select: { id: true } }).then(l => l.map(s => s.id));
        } else {
             allowedSupplierIds = await prisma.supplier.findMany({ where: { userId: authUser.userId }, select: { id: true } }).then(l => l.map(s => s.id));
        }

        if (requestedSupplierId && allowedSupplierIds.includes(requestedSupplierId)) {
            orderWhere.supplierId = requestedSupplierId;
        } else {
            orderWhere.supplierId = { in: allowedSupplierIds };
        }
    }

    const topItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: orderWhere
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
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const isSystemAdmin = authUser?.role === 'SYSTEM_ADMIN' || authUser?.role === 'ADMIN';
    const rawSupplierId = req.query.supplierId;
    const requestedSupplierId = (rawSupplierId && rawSupplierId !== 'undefined' && rawSupplierId !== 'null') 
        ? String(rawSupplierId) 
        : null;

    let where: any = {
      createdAt: { gte: thirtyDaysAgo }
    };

    if (isSystemAdmin) {
        if (requestedSupplierId) {
            where.supplierId = requestedSupplierId;
        }
    } else {
        if (!authUser?.userId) return res.status(401).json({ message: 'Unauthorized' });
        
        const user = await prisma.user.findUnique({ where: { id: authUser.userId }, select: { accountId: true, role: true } });
        let allowedSupplierIds: string[] = [];

        if (user?.role === 'ACCOUNT_ADMIN') {
             allowedSupplierIds = await prisma.supplier.findMany({ where: { accountId: user?.accountId || '' }, select: { id: true } }).then(l => l.map(s => s.id));
        } else {
             allowedSupplierIds = await prisma.supplier.findMany({ where: { userId: authUser.userId }, select: { id: true } }).then(l => l.map(s => s.id));
        }

        if (requestedSupplierId && allowedSupplierIds.includes(requestedSupplierId)) {
            where.supplierId = requestedSupplierId;
        } else {
            where.supplierId = { in: allowedSupplierIds };
        }
    }

    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where,
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
