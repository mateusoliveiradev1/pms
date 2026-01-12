import { Request, Response } from 'express';
import prisma from '../prisma';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { query } = req.query as { query?: string };
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;

    const where: any = {};
    
    if (query) {
        where.OR = [
            { name: { contains: String(query), mode: 'insensitive' } },
            { sku: { contains: String(query), mode: 'insensitive' } },
        ];
    }

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
        res.json([]);
        return;
      }

      let suppliers: Array<{ id: string }> = [];

      if (user.role === 'SUPPLIER') {
        suppliers = await prisma.supplier.findMany({
          where: { userId: authUser.userId },
          select: { id: true },
        });

        if (suppliers.length === 0) {
          const defaultSupplier = await prisma.supplier.findFirst({
            where: { accountId: user.accountId, isDefault: true },
            select: { id: true },
          });
          suppliers = defaultSupplier ? [defaultSupplier] : [];
        }
      } else {
        suppliers = await prisma.supplier.findMany({
          where: { accountId: user.accountId },
          select: { id: true },
        });
      }

      if (suppliers.length === 0) {
        res.json([]);
        return;
      }

      where.suppliers = { some: { supplierId: { in: suppliers.map((s) => s.id) } } };
    }

    const products = await prisma.product.findMany({
      where,
      include: { suppliers: { include: { supplier: true } } },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: { suppliers: { include: { supplier: true } } }
        });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product', error });
    }
};

export const createProduct = async (req: Request, res: Response) => {
  const { 
    name, sku, description, imageUrl, 
    marginType, marginValue,
    // Supplier Info (Array or Single for now)
    supplierId, supplierPrice, virtualStock, safetyStock 
  } = req.body;

  try {
    // 1. Prepare Supplier Data
    const sPrice = Number(supplierPrice);
    const vStock = Number(virtualStock || 0);
    const sStock = Number(safetyStock || 0);
    const available = Math.max(0, vStock - sStock);

    // 2. Calculate Final Price (Best price logic or just first supplier)
    // For MVP, we assume the input comes with 1 supplier initially.
    let finalPrice = sPrice;
    const mValue = Number(marginValue);
    
    if (marginType === 'FIXED') {
        finalPrice += mValue;
    } else {
        finalPrice += (sPrice * mValue / 100);
    }

    const product = await prisma.product.create({
      data: {
        name, sku, description, imageUrl, 
        stockAvailable: available, // Initial total stock
        marginType, 
        marginValue: mValue, 
        price: finalPrice,
        suppliers: {
            create: [
                {
                    supplierId,
                    price: sPrice,
                    virtualStock: vStock,
                    stock: vStock,
                    safetyStock: sStock,
                    externalId: 'MANUAL-' + Date.now() // Required field
                }
            ]
        },
        inventoryLogs: {
            create: {
                quantity: available,
                type: 'RESTOCK',
                reason: 'Initial Stock'
            }
        }
      },
      include: { suppliers: true }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { 
        name, sku, description, imageUrl, 
        marginType, marginValue,
        // Optional: update primary supplier info if provided
        supplierPrice, virtualStock, safetyStock 
    } = req.body;

    try {
        // Fetch existing to handle logic properly (simplified for MVP)
        // If supplier info is provided, we update the FIRST supplier found (simplification)
        // Ideally, we should pass supplierId to know WHICH supplier to update.
        
        // For this MVP step, let's just update the product fields and re-calculate price if needed.
        // NOTE: Updating stock/price of a specific supplier should ideally have its own endpoint or be clearer.
        // We will assume this updates the 'main' supplier for this product if only one exists.

        const existingProduct = await prisma.product.findUnique({
            where: { id },
            include: { suppliers: true }
        });

        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let finalPrice = existingProduct.price;
        let totalStock = existingProduct.stockAvailable;

        // If updating supplier params, we need to know WHICH supplier. 
        // Fallback: Update the first one.
        if (existingProduct.suppliers.length > 0 && (supplierPrice !== undefined || virtualStock !== undefined)) {
            const supplierRel = existingProduct.suppliers[0];
            
            const newSPrice = supplierPrice !== undefined ? Number(supplierPrice) : supplierRel.price;
            const newVStock = virtualStock !== undefined ? Number(virtualStock) : supplierRel.virtualStock;
            const newSStock = safetyStock !== undefined ? Number(safetyStock) : supplierRel.safetyStock;
            const newAvailable = Math.max(0, newVStock - newSStock);

            // Update Relation
            await prisma.productSupplier.update({
                where: { id: supplierRel.id },
                data: {
                    price: newSPrice,
                    virtualStock: newVStock,
                    safetyStock: newSStock
                }
            });

            // Re-calc product globals
            totalStock = newAvailable; // If multiple suppliers, we should sum them up. 
            // For MVP Multi-supplier: Sum all stocks
            // But here we only updated one. Ideally we should re-query or calc diff.
            // Let's keep it simple:
            totalStock = newAvailable; 

            // Re-calc Price
             const mValue = Number(marginValue || existingProduct.marginValue);
             let basePrice = newSPrice;
             
             if (marginType === 'FIXED') {
                 finalPrice = basePrice + mValue;
             } else {
                 finalPrice = basePrice + (basePrice * mValue / 100);
             }
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                name, sku, description, imageUrl, 
                stockAvailable: totalStock,
                marginType,
                marginValue: Number(marginValue),
                price: finalPrice
            },
            include: { suppliers: true }
        });

        // Log if stock changed
        const diff = totalStock - existingProduct.stockAvailable;
        if (diff !== 0) {
            await prisma.inventoryLog.create({
                data: {
                    productId: id,
                    quantity: diff,
                    type: 'ADJUSTMENT',
                    reason: 'Manual Update'
                }
            });
        }

        res.json(product);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error updating product', error });
    }
};

export const exportProductsCsv = async (req: Request, res: Response) => {
  try {
    const { query } = req.query as { query?: string };
    const where = query
      ? {
          OR: [
            { name: { contains: String(query), mode: 'insensitive' as any } },
            { sku: { contains: String(query), mode: 'insensitive' as any } },
          ],
        }
      : undefined;
    const products = await prisma.product.findMany({
      where,
      include: { suppliers: true }
    });
    const header = ['id','name','sku','price','stockAvailable','suppliersCount'].join(',');
    const rows = products.map((p: any) => {
      const cols = [
        p.id,
        p.name,
        p.sku,
        String(p.price ?? 0),
        String(p.stockAvailable ?? 0),
        String(p.suppliers?.length ?? 0)
      ];
      return cols.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=\"products.csv\"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Error exporting products CSV', error });
  }
};

export const getProductHistory = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const logs = await prisma.inventoryLog.findMany({
            where: { productId: id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history', error });
    }
};
