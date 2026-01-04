import { Request, Response } from 'express';
import prisma from '../prisma';
import { createNotification } from './notificationController';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const { status } = req.query as { status?: string };
    const where = status ? { status: String(status) } : undefined;
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
    const rows = orders.map(o => {
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
  const { customerName, customerAddress, items, totalAmount, mercadoLivreId } = req.body;

  // items should be an array of { productId, quantity, price }

  try {
    const order = await prisma.order.create({
      data: {
        customerName,
        customerAddress,
        totalAmount,
        mercadoLivreId,
        items: {
          create: items.map((item: any) => ({
            product: { connect: { id: item.productId } },
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: { items: true }
    });
    
    // Notification Logic
    await createNotification(
        'Novo Pedido', 
        `Pedido #${order.id.substring(0,8)} criado no valor de R$ ${totalAmount}`, 
        'ORDER'
    );

    // Update Stock Logic (Simple decrement from Available)
    // In a multi-supplier world, we should choose which supplier to decrement.
    // For MVP, we decrement the global 'stockAvailable' and 'virtualStock' of the primary supplier.
    
    for (const item of items) {
        const product = await prisma.product.findUnique({
            where: { id: item.productId },
            include: { suppliers: true }
        });

        if (!product) continue;

        // If product has suppliers, decrement from the primary supplier and recompute consolidated stock
        if (product.suppliers.length > 0) {
            const supplierRel = product.suppliers[0];
            const newVirtualStock = Math.max(0, supplierRel.virtualStock - item.quantity);

            await prisma.productSupplier.update({
                where: { id: supplierRel.id },
                data: { virtualStock: newVirtualStock }
            });

            const suppliers = await prisma.productSupplier.findMany({
                where: { productId: item.productId }
            });

            const totalAvailable = suppliers.reduce((sum, s) => {
                const available = Math.max(0, s.virtualStock - s.safetyStock);
                return sum + available;
            }, 0);

            await prisma.product.update({
                where: { id: item.productId },
                data: { stockAvailable: totalAvailable }
            });

            if (totalAvailable < 5) {
                await createNotification(
                    'Estoque Baixo',
                    `Produto ${product.name} está com estoque baixo (${totalAvailable})`,
                    'STOCK'
                );
            }
        } else {
            // Fallback: products created sem relação de fornecedor
            const newAvailable = Math.max(0, (product.stockAvailable || 0) - item.quantity);
            await prisma.product.update({
                where: { id: item.productId },
                data: { stockAvailable: newAvailable }
            });

            if (newAvailable < 5) {
                await createNotification(
                    'Estoque Baixo',
                    `Produto ${product.name} está com estoque baixo (${newAvailable})`,
                    'STOCK'
                );
            }
        }
    }

    res.status(201).json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error creating order', error });
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
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    include: { suppliers: true }
                });
                if (!product) continue;

                if (product.suppliers.length > 0) {
                    const supplierRel = product.suppliers[0];
                    const newVirtualStock = supplierRel.virtualStock + item.quantity;
                    await prisma.productSupplier.update({
                        where: { id: supplierRel.id },
                        data: { virtualStock: newVirtualStock }
                    });

                    const suppliers = await prisma.productSupplier.findMany({
                        where: { productId: item.productId }
                    });
                    const totalAvailable = suppliers.reduce((sum, s) => {
                        const available = Math.max(0, s.virtualStock - s.safetyStock);
                        return sum + available;
                    }, 0);
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { stockAvailable: totalAvailable }
                    });
                } else {
                    const newAvailable = (product.stockAvailable || 0) + item.quantity;
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { stockAvailable: newAvailable }
                    });
                }
            }

            await createNotification(
                'Pedido Cancelado',
                `Pedido #${existingOrder.id.substring(0,8)} cancelado e estoque restaurado`,
                'ORDER'
            );
        }

        const order = await prisma.order.update({
            where: { id },
            data: { status, trackingCode }
        });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error updating order', error });
    }
}
