import { Request, Response } from 'express';
import prisma from '../prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    let supplierIds: string[] | undefined = undefined;

    if (authUser?.role !== 'ADMIN') {
      if (!authUser?.userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: { accountId: true, role: true },
      });

      if (!user?.accountId) {
        res.json({
          totalProducts: 0,
          totalOrders: 0,
          lowStockProducts: 0,
          pendingOrders: 0,
          totalSales: 0,
          totalProfit: 0,
        });
        return;
      }

      if (user.role === 'SUPPLIER') {
        const suppliers = await prisma.supplier.findMany({
          where: { userId: authUser.userId },
          select: { id: true },
        });
        supplierIds = suppliers.map((s) => s.id);

        if (supplierIds.length === 0) {
          const defaultSupplier = await prisma.supplier.findFirst({
            where: { accountId: user.accountId, isDefault: true },
            select: { id: true },
          });
          supplierIds = defaultSupplier ? [defaultSupplier.id] : [];
        }
      } else {
        const suppliers = await prisma.supplier.findMany({
          where: { accountId: user.accountId },
          select: { id: true },
        });
        supplierIds = suppliers.map((s) => s.id);
      }

      if (supplierIds.length === 0) {
        res.json({
          totalProducts: 0,
          totalOrders: 0,
          lowStockProducts: 0,
          pendingOrders: 0,
          totalSales: 0,
          totalProfit: 0,
        });
        return;
      }
    }

    const productWhere = supplierIds ? { suppliers: { some: { supplierId: { in: supplierIds } } } } : {};
    const orderWhere = supplierIds ? { supplierId: { in: supplierIds } } : {};

    const totalProducts = await prisma.product.count({ where: productWhere });
    const totalOrders = await prisma.order.count({ where: orderWhere });
    
    // Produtos com estoque baixo (ex: < 5)
    const lowStockProducts = await prisma.product.count({
        where: {
            ...productWhere,
            stockAvailable: {
                lt: 5
            }
        }
    });

    // Pedidos pendentes (ex: NEW ou SENT_TO_SUPPLIER)
    const pendingOrders = await prisma.order.count({
        where: {
            ...orderWhere,
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
            ...orderWhere,
            status: {
                not: 'CANCELLED'
            }
        }
    });

    const totalSales = totalSalesAggregate._sum.totalAmount || 0;

    // Lucro estimado: soma de (preço venda - custo fornecedor principal) * qtd, em pedidos não cancelados
    // Se for Supplier, o lucro dele é (Preço Pago pelo Admin - Custo Dele)? 
    // Ou (Preço Venda - Comissao)?
    // O model atual tem `supplierPayout` no Order.
    // Se supplierId definido, vamos usar supplierPayout.
    
    let totalProfit = 0;

    if (supplierIds) {
        const payoutAggregate = await prisma.order.aggregate({
            _sum: { netValue: true },
            where: { ...orderWhere, status: { not: 'CANCELLED' } }
        });
        totalProfit = payoutAggregate._sum.netValue || 0;
    } else {
        // For Admin: Existing logic (Revenue - Cost)
        const ordersForProfit = await prisma.order.findMany({
            where: { status: { not: 'CANCELLED' } },
            include: { items: { include: { product: { include: { suppliers: true } } } } }
        });
        
        for (const order of ordersForProfit) {
            for (const item of order.items) {
                const product = item.product as any;
                const primarySupplier = (product.suppliers || [])[0];
                const cost = primarySupplier ? Number(primarySupplier.price) : 0;
                const revenue = Number(item.unitPrice);
                totalProfit += (revenue - cost) * Number(item.quantity);
            }
        }
    }

    res.json({
        totalProducts,
        totalOrders,
        lowStockProducts,
        pendingOrders,
        totalSales,
        totalProfit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching dashboard stats', error });
  }
};
