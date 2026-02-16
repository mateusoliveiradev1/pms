import { Request, Response } from 'express';
import prisma from '../prisma';
import { createNotification } from './notificationController';
import { FinancialService } from '../services/financialService';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    const { status } = req.query as { status?: string };
    let where: any = {};
    if (status) where.status = String(status);

    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (authUser.role === 'SYSTEM_ADMIN' || authUser.role === 'ADMIN') {
      // Full visibility; optionally filter by accountId or supplierId
      if (req.query.supplierId) where.supplierId = String(req.query.supplierId);
      if (req.query.accountId) {
        const supplierIds = await prisma.supplier.findMany({
          where: { accountId: String(req.query.accountId) },
          select: { id: true }
        }).then((list: any[]) => list.map((s: any) => s.id));
        where.supplierId = { in: supplierIds };
      }
    } else {
      const user = await prisma.user.findUnique({ where: { id: authUser.userId }, select: { accountId: true, role: true } });
      if (!user?.accountId) {
        res.json([]);
        return;
      }
      if (user.role === 'ACCOUNT_ADMIN') {
        const supplierIds = await prisma.supplier.findMany({
          where: { accountId: user.accountId },
          select: { id: true }
        }).then((list: any[]) => list.map((s: any) => s.id));
        where.supplierId = { in: supplierIds };
      } else {
        const supplierIds = await prisma.supplier.findMany({
          where: { userId: authUser.userId },
          select: { id: true }
        }).then((list: any[]) => list.map((s: any) => s.id));
        if (supplierIds.length === 0) {
          res.json([]);
          return;
        }
        where.supplierId = { in: supplierIds };
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

export const getOrderStatusStats = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    const where: any = {};

    if (authUser?.role !== 'SYSTEM_ADMIN' && authUser?.role !== 'ADMIN') {
        if (!authUser?.userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await prisma.user.findUnique({ 
            where: { id: authUser.userId }, 
            select: { accountId: true, role: true } 
        });

        if (!user?.accountId) {
             // Return zeros if no account
            res.json({ ALL: 0, NEW: 0, SENT_TO_SUPPLIER: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 });
            return;
        }

        if (user.role === 'ACCOUNT_ADMIN') {
             const supplierIds = await prisma.supplier.findMany({
                 where: { accountId: user.accountId },
                 select: { id: true }
             }).then((list: any[]) => list.map((s: any) => s.id));
             where.supplierId = { in: supplierIds };
        } else {
             // Supplier User
             const supplierIds = await prisma.supplier.findMany({
                 where: { userId: authUser.userId },
                 select: { id: true }
             }).then((list: any[]) => list.map((s: any) => s.id));
             
             if (supplierIds.length === 0) {
                 res.json({ ALL: 0, NEW: 0, SENT_TO_SUPPLIER: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 });
                 return;
             }
             where.supplierId = { in: supplierIds };
        }
    }

    const grouped = await prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { _all: true }
    });
    const map: Record<string, number> = {};
    for (const g of grouped) {
      // @ts-ignore
      map[g.status] = g._count._all || 0;
    }
    const all = await prisma.order.count({ where });
    res.json({
      ALL: all,
      NEW: map['NEW'] || 0,
      SENT_TO_SUPPLIER: map['SENT_TO_SUPPLIER'] || 0,
      SHIPPING: map['SHIPPING'] || 0,
      DELIVERED: map['DELIVERED'] || 0,
      CANCELLED: map['CANCELLED'] || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order status stats', error });
  }
};

export const exportOrdersCsv = async (req: Request, res: Response) => {
  try {
    const { status } = req.query as { status?: string };
    const where = status ? { status: String(status) } : undefined;
    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    const header = ['id','customerName','status','totalAmount','itemsCount','createdAt'].join(',');
    const rows = orders.map((o: any) => {
      const cols = [
        o.id,
        o.customerName || '',
        o.status,
        String(o.totalAmount ?? 0),
        String(o.items.length),
        o.createdAt.toISOString()
      ];
      return cols.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=\"orders.csv\"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Error exporting orders CSV', error });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  const { customerName, customerAddress, items, totalAmount, mercadoLivreId, marketplaceFee = 0 } = req.body;

  // items should be an array of { productId, quantity, price }

  try {
    const order = await prisma.$transaction(async (tx: any) => {
        let orderSupplierId: string | null = null;
        let orderCommissionRate = 0;

        // 1. Calculate Totals & Validate Stock
        let totalAmount = 0;
        const processedItems = [];

        for (const item of items) {
             // ... (código existente de validação de item) ...
             const product = await prisma.product.findUnique({
                 where: { id: item.productId }
             });
             
             if (!product) throw new Error(`Product ${item.productId} not found`);

             // Check Supplier Stock
             const supplierStock = await prisma.productSupplier.findFirst({
                 where: { productId: item.productId, stock: { gte: item.quantity } }
             });

             if (!supplierStock) throw new Error(`Insufficient stock for product ${product.name}`);
             
             // Set Supplier for Order (First item dictates supplier for now, or ensure all items are from same supplier)
             if (!orderSupplierId) {
                 orderSupplierId = supplierStock.supplierId;
             } else if (orderSupplierId !== supplierStock.supplierId) {
                 // For MVP, split orders by supplier or block mixed carts. 
                 // Assuming block mixed carts for now.
                 throw new Error('Mixed supplier cart not supported yet');
             }
             
             processedItems.push({
                 productId: item.productId,
                 quantity: item.quantity,
                 unitPrice: product.price, // Use current price
                 total: product.price * item.quantity,
                 sku: product.sku
             });
             
             totalAmount += product.price * item.quantity;
        }

        if (!orderSupplierId) {
            throw new Error('Could not determine supplier for order');
        }

        // Get Commission Rate
        if (orderSupplierId) {
             orderCommissionRate = await (await import('../services/commissionService')).CommissionService.getCommissionRateForSupplier(String(orderSupplierId));
        }

        // Calculate Financials
        let financialData = {
            marketplaceFee: 0,
            commissionValue: 0,
            netValue: 0,
            payoutStatus: 'PENDING'
        };

        if (orderSupplierId) {
            const financials = FinancialService.calculateOrderFinancials(
                totalAmount,
                orderCommissionRate,
                marketplaceFee
            );
            financialData = {
                marketplaceFee: financials.marketplaceFee,
                commissionValue: financials.platformCommission,
                netValue: financials.supplierPayout,
                payoutStatus: 'PENDING'
            };
        } else {
            throw new Error('Could not determine supplier for this order. All products must belong to a valid supplier.');
        }

        // 2. Create Order
        return await tx.order.create({
            data: {
                orderNumber: 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                customerName,
                shippingAddress: customerAddress,
                totalAmount,
                status: 'PENDING',
                supplierId: orderSupplierId,
                ...financialData,
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        sku: item.sku || 'UNKNOWN', // Fallback or require SKU
                        unitPrice: item.price,
                        total: item.price * item.quantity
                    }))
                }
            },
            include: { items: true }
        });
    });
    
    // Notification Logic
    await createNotification(
        'Novo Pedido', 
        `Pedido #${order.id.slice(0, 8)} criado com sucesso.`,
        'ORDER'
    );

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating order', error: error.message || error });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, trackingCode } = req.body;

    try {
        const existingOrder = await prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!existingOrder) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        if (status === 'CANCELLED' && existingOrder.status !== 'CANCELLED') {
            for (const item of existingOrder.items) {
                if (!item.productId) continue;

                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    include: { suppliers: true }
                });
                if (!product) continue;

                if (product.suppliers && product.suppliers.length > 0) {
                    const supplierRel = product.suppliers[0];
                    const newVirtualStock = supplierRel.virtualStock + item.quantity;
                    await prisma.productSupplier.update({
                        where: { id: supplierRel.id },
                        data: { virtualStock: newVirtualStock }
                    });

                    // Recalculate global stock
                    const suppliers = await prisma.productSupplier.findMany({
                        where: { productId: item.productId }
                    });
                    const totalAvailable = suppliers.reduce((sum: number, s: any) => {
                        const available = Math.max(0, s.virtualStock - s.safetyStock);
                        return sum + available;
                    }, 0);
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { stockAvailable: totalAvailable }
                    });

                    // Log Return
                    await prisma.inventoryLog.create({
                        data: {
                            productId: item.productId,
                            quantity: item.quantity,
                            type: 'RETURN',
                            reason: `Order #${id.substring(0,8)} Cancelled`
                        }
                    });
                } else {
                    const newAvailable = (product.stockAvailable || 0) + item.quantity;
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { stockAvailable: newAvailable }
                    });

                    // Log Return
                    await prisma.inventoryLog.create({
                        data: {
                            productId: item.productId,
                            quantity: item.quantity,
                            type: 'RETURN',
                            reason: `Order #${id.substring(0,8)} Cancelled`
                        }
                    });
                }
            }

            await createNotification(
                'Pedido Cancelado',
                `Pedido #${existingOrder.id.substring(0,8)} cancelado e estoque restaurado`,
                'ORDER'
            );

            // Trigger Financial Refund Logic
            try {
                await FinancialService.processOrderRefund(id, 'Pedido Cancelado/Reembolsado');
                console.log(`Refund processed for order ${id}`);
            } catch (refundError: any) {
                console.error(`Failed to process refund for order ${id}:`, refundError.message);
            }
        }

        const order = await prisma.order.update({
            where: { id },
            data: { status }
        });

        // Trigger Payment if Delivered/Completed
        if (status === 'DELIVERED') {
            try {
                await FinancialService.processOrderPayment(id);
                console.log(`Payment processed for order ${id}`);
            } catch (payoutError: any) {
                console.error(`Failed to process payment for order ${id}:`, payoutError.message);
                // Optionally: We could notify admin or retry later. 
                // For now, we just log it. The financialStatus will remain PENDING.
            }
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error updating order', error });
    }
}
