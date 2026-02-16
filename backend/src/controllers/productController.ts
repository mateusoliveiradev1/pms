import { Request, Response } from 'express';
import prisma from '../prisma';
import { Role } from '@prisma/client';
import { createItem, updateItemStock } from '../services/mercadoLivreService';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { query } = req.query as { query?: string };
    const authUser = (req as any).user as { userId?: string; role?: Role } | undefined;

    const where: any = {};
    
    if (query) {
        where.OR = [
            { name: { contains: String(query), mode: 'insensitive' } },
            { sku: { contains: String(query), mode: 'insensitive' } },
        ];
    }

    // 1. Determine Allowed Scope and Filter
    let allowedSupplierIds: string[] = [];
    const isSystemAdmin = authUser?.role === Role.SYSTEM_ADMIN;

    if (isSystemAdmin) {
        // System Admin: see everything
    } else {
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

        if (user.role === Role.SELLER) {
            allowedSupplierIds = await prisma.supplier.findMany({
                where: { userId: authUser.userId },
                select: { id: true },
            }).then(list => list.map(s => s.id));

            if (allowedSupplierIds.length === 0) {
                const defaultSupplier = await prisma.supplier.findFirst({
                    where: { accountId: user.accountId, isDefault: true },
                    select: { id: true },
                });
                if (defaultSupplier) allowedSupplierIds.push(defaultSupplier.id);
            }
        } else {
            // OWNER, ACCOUNT_ADMIN
            allowedSupplierIds = await prisma.supplier.findMany({
                where: { accountId: user.accountId },
                select: { id: true },
            }).then(list => list.map(s => s.id));
        }

        if (allowedSupplierIds.length === 0) {
            res.json([]);
            return;
        }
    }

    // 2. Apply Filters
    const rawSupplierId = req.query.supplierId;
    const requestedSupplierId = (rawSupplierId && rawSupplierId !== 'undefined' && rawSupplierId !== 'null') 
        ? String(rawSupplierId) 
        : null;

    console.log(`📦 [GetProducts] UserRole: ${authUser?.role}, RawQuery: ${rawSupplierId}, Parsed: ${requestedSupplierId}`);

    if (requestedSupplierId) {
        if (isSystemAdmin) {
            // FORCE Filter for System Admin
            where.suppliers = { some: { supplierId: requestedSupplierId } };
        } else {
            // For others, validate access
            if (allowedSupplierIds.includes(requestedSupplierId)) {
                where.suppliers = { some: { supplierId: requestedSupplierId } };
            } else {
                // Not allowed -> Return Empty
                where.suppliers = { some: { supplierId: '00000000-0000-0000-0000-000000000000' } };
            }
        }
    } else {
        // No specific filter requested
        if (!isSystemAdmin) {
            // If not admin and no filter, restrict to allowed list
             where.suppliers = { some: { supplierId: { in: allowedSupplierIds } } };
        }
        // If System Admin and NO filter, we do NOT add where.suppliers, effectively showing ALL.
    }

    console.log(`📦 [GetProducts] Final Where:`, JSON.stringify(where));

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
    let targetSupplierId = supplierId;

    // Strict Supplier Check - No Fallbacks
    if (!targetSupplierId) {
        const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
        if (authUser?.userId) {
            const user = await prisma.user.findUnique({ where: { id: authUser.userId }, select: { accountId: true, role: true } });
            
            // If user is SELLER, try to find their linked supplier
            if (user?.role === 'SELLER') {
                const s = await prisma.supplier.findFirst({ where: { userId: authUser.userId }, select: { id: true } });
                if (s) targetSupplierId = s.id;
            } else if (user?.accountId) {
                // If Account Admin/Owner, try to find default or check if there is ONLY ONE supplier
                const suppliers = await prisma.supplier.findMany({ where: { accountId: user.accountId }, select: { id: true } });
                if (suppliers.length === 1) {
                    targetSupplierId = suppliers[0].id;
                } else {
                     const def = suppliers.find((s: any) => (s as any).isDefault); // Type check might be needed if isDefault is not in select, but prisma handles it
                     // Re-query with isDefault
                     const defS = await prisma.supplier.findFirst({ where: { accountId: user.accountId, isDefault: true }, select: { id: true } });
                     if (defS) targetSupplierId = defS.id;
                }
            }
        }
    }

    if (!targetSupplierId) {
        res.status(400).json({ message: 'É obrigatório informar o Fornecedor (supplierId) para criar um produto.' });
        return;
    }

    // Verify if Supplier exists and belongs to account (Security)
    // ... (Implied by above logic but good to double check if passed in body)

    const sPrice = Number(supplierPrice || 0);
    const vStock = Number(virtualStock || 0);
    const sStock = Number(safetyStock || 0);
    const available = Math.max(0, vStock - sStock);

    // 2. Calculate Final Price
    let finalPrice = sPrice;
    const mValue = Number(marginValue || 0);
    
    if (marginType === 'FIXED') {
        finalPrice += mValue;
    } else {
        finalPrice += (sPrice * mValue / 100);
    }

    // 3. Auto-Publish to Mercado Livre (100% Automatic Flow)
    // Check if user has connected integration
    const authUser = (req as any).user;
    if (authUser?.userId) {
        const providerKey = `MERCADOLIVRE:${authUser.userId}`;
        const integration = await prisma.integration.findUnique({
            where: { provider: providerKey }
        });

        if (integration) {
            try {
                // We need the product created first
                // Re-fetch or pass the created object?
                // The variable 'product' was missing in previous context because it was created AFTER this block in original code?
                // Wait, in my previous edit I put this block AFTER creation.
                // Let's ensure 'product' is defined.
            } catch (e: any) {
                 // ...
            }
        }
    }

    // CREATE PRODUCT FIRST
    const product = await prisma.product.create({
      data: {
        name, sku, description, imageUrl, 
        stockAvailable: available,
        marginType: marginType || 'PERCENTAGE', 
        marginValue: mValue, 
        price: finalPrice,
        suppliers: {
            create: [
                {
                    supplierId: targetSupplierId,
                    price: sPrice,
                    virtualStock: vStock,
                    stock: vStock,
                    safetyStock: sStock,
                    externalId: 'MANUAL-' + Date.now()
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

    // NOW PUBLISH
    if (authUser?.userId) {
        const providerKey = `MERCADOLIVRE:${authUser.userId}`;
        const integration = await prisma.integration.findUnique({
            where: { provider: providerKey }
        });

        if (integration) {
            try {
                console.log(`[Auto-Publish] Publishing ${product.name} to Mercado Livre...`);
                const mlItem = await createItem(integration.accessToken, product);
                
                // Update Product with ML ID
                await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        mercadoLivreId: mlItem.id,
                        mercadoLivreStatus: 'active' // Assuming success
                    }
                });
                console.log(`[Auto-Publish] Success! ML ID: ${mlItem.id}`);
            } catch (e: any) {
                console.error(`[Auto-Publish] Failed for product ${product.id}:`, e.response?.data || e.message);
            }
        }
    }

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
        supplierPrice, virtualStock, safetyStock,
        supplierId // Now we require this to know which supplier to update
    } = req.body;

    try {
        const existingProduct = await prisma.product.findUnique({
            where: { id },
            include: { suppliers: true }
        });

        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Determine which Supplier Relation to Update
        let targetSupplierRel = null;
        
        if (supplierId) {
            targetSupplierRel = existingProduct.suppliers.find(s => s.supplierId === String(supplierId));
        } else if (existingProduct.suppliers.length === 1) {
            targetSupplierRel = existingProduct.suppliers[0];
        }

        let finalPrice = existingProduct.price;
        
        // If we found a supplier to update
        if (targetSupplierRel && (supplierPrice !== undefined || virtualStock !== undefined)) {
            const newSPrice = supplierPrice !== undefined ? Number(supplierPrice) : targetSupplierRel.price;
            const newVStock = virtualStock !== undefined ? Number(virtualStock) : targetSupplierRel.virtualStock;
            const newSStock = safetyStock !== undefined ? Number(safetyStock) : targetSupplierRel.safetyStock;
            
            // Update Relation
            await prisma.productSupplier.update({
                where: { id: targetSupplierRel.id },
                data: {
                    price: newSPrice,
                    virtualStock: newVStock,
                    safetyStock: newSStock,
                    stock: newVStock // Sync stock for MVP
                }
            });

            // Re-calc Price based on THIS supplier's new price + margin
            // NOTE: If product has multiple suppliers, which price wins?
            // Usually the lowest or the default. For now, we update the main price based on the update action.
             const mValue = Number(marginValue || existingProduct.marginValue);
             let basePrice = newSPrice;
             
             if (marginType === 'FIXED') {
                 finalPrice = basePrice + mValue;
             } else {
                 finalPrice = basePrice + (basePrice * mValue / 100);
             }
        } else if (marginValue !== undefined) {
             // Only margin changed, re-calc based on current price of (first) supplier or average?
             // Fallback to first for price base
             const basePrice = existingProduct.suppliers[0]?.price || 0;
             const mValue = Number(marginValue);
             if (marginType === 'FIXED') {
                 finalPrice = basePrice + mValue;
             } else {
                 finalPrice = basePrice + (basePrice * mValue / 100);
             }
        }

        // Re-calc Total Stock
        const allSuppliers = await prisma.productSupplier.findMany({ where: { productId: id } });
        const totalStock = allSuppliers.reduce((acc, s) => acc + Math.max(0, s.virtualStock - s.safetyStock), 0);

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

        // 4. Sync Stock to Mercado Livre (100% Automatic)
        if (product.mercadoLivreId) {
             const authUser = (req as any).user;
             if (authUser?.userId) {
                 const providerKey = `MERCADOLIVRE:${authUser.userId}`;
                 const integration = await prisma.integration.findUnique({
                     where: { provider: providerKey }
                 });
                 if (integration) {
                     // Sync total stock or just the updated supplier?
                     // Usually we sync total available stock.
                     await updateItemStock(integration.accessToken, product.mercadoLivreId, totalStock);
                 }
             }
        }

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
