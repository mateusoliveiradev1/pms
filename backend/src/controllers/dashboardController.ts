import { Request, Response } from 'express';
import prisma from '../prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    
    // Filtros principais
    let productWhere: any = {};
    let orderWhere: any = {};
    
    // Flag para saber se estamos filtrando por fornecedor específico (para cálculo de lucro)
    let isSupplierFiltered = false;

    // 1. Lógica para Admins (SYSTEM_ADMIN ou ADMIN)
    if (authUser?.role === 'SYSTEM_ADMIN' || authUser?.role === 'ADMIN') {
        const { supplierId } = req.query as { supplierId?: string };
        
        if (supplierId) {
            // Admin filtrando por fornecedor específico
            productWhere = { suppliers: { some: { supplierId: String(supplierId) } } };
            orderWhere = { supplierId: String(supplierId) };
            isSupplierFiltered = true;
        } else {
            // Admin Global: Vê tudo (sem filtros where)
            productWhere = {};
            orderWhere = {};
            isSupplierFiltered = false;
        }
    } 
    // 2. Lógica para Outros Usuários (Account Admin, Owner, Supplier)
    else {
        if (!authUser?.userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: authUser.userId },
            select: { accountId: true, role: true },
        });

        if (!user?.accountId) {
             // Retornar zerado se não tiver conta
             res.json({ totalProducts: 0, totalOrders: 0, lowStockProducts: 0, pendingOrders: 0, totalSales: 0, totalProfit: 0 });
             return;
        }

        let supplierIds: string[] = [];

        if (user.role === 'SUPPLIER' || user.role === 'SUPPLIER_USER') {
            const suppliers = await prisma.supplier.findMany({ where: { userId: authUser.userId }, select: { id: true } });
            supplierIds = suppliers.map(s => s.id);
            // Fallback para supplier default se não achar
            if (supplierIds.length === 0) {
                 const def = await prisma.supplier.findFirst({ where: { accountId: user.accountId, isDefault: true }, select: { id: true } });
                 if (def) supplierIds = [def.id];
            }
        } else {
            // Account Admin / Owner: Vê todos os fornecedores da conta
            const suppliers = await prisma.supplier.findMany({ where: { accountId: user.accountId }, select: { id: true } });
            supplierIds = suppliers.map(s => s.id);
        }

        if (supplierIds.length === 0) {
             res.json({ totalProducts: 0, totalOrders: 0, lowStockProducts: 0, pendingOrders: 0, totalSales: 0, totalProfit: 0 });
             return;
        }

        // Aplicar filtros baseados nos IDs encontrados
        productWhere = { suppliers: { some: { supplierId: { in: supplierIds } } } };
        orderWhere = { supplierId: { in: supplierIds } };
        isSupplierFiltered = true; // Consideramos filtrado pois é restrito à conta
    }

    // Executar Queries com os filtros definidos acima
    const totalProducts = await prisma.product.count({ where: productWhere });
    const totalOrders = await prisma.order.count({ where: orderWhere });
    
    // Produtos com estoque baixo (ex: < 5)
    const lowStockProducts = await prisma.product.count({
        where: {
            ...productWhere,
            stockAvailable: { lt: 5 }
        }
    });

    // Pedidos pendentes (ex: NEW ou SENT_TO_SUPPLIER)
    const pendingOrders = await prisma.order.count({
        where: {
            ...orderWhere,
            status: { in: ['NEW', 'SENT_TO_SUPPLIER'] }
        }
    });

    // Total de vendas (Soma totalAmount de pedidos não cancelados)
    const totalSalesAggregate = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
            ...orderWhere,
            status: { not: 'CANCELLED' }
        }
    });

    const totalSales = totalSalesAggregate._sum.totalAmount || 0;

    // Cálculo de Lucro
    let totalProfit = 0;

    if (isSupplierFiltered) {
        // Se filtrado por fornecedor, usamos o netValue (repasse)
        const payoutAggregate = await prisma.order.aggregate({
            _sum: { netValue: true },
            where: { ...orderWhere, status: { not: 'CANCELLED' } }
        });
        totalProfit = payoutAggregate._sum.netValue || 0;
    } else {
        // Se Global (Admin), calculamos Receita - Custo
        // Buscar pedidos com itens e produtos para calcular custo
        const ordersForProfit = await prisma.order.findMany({
            where: { ...orderWhere, status: { not: 'CANCELLED' } },
            include: { items: { include: { product: { include: { suppliers: true } } } } }
        });
        
        for (const order of ordersForProfit) {
            for (const item of order.items) {
                const product = item.product as any;
                // Simplificação: Pega preço do primeiro fornecedor como custo
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
