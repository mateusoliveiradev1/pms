import { Request, Response } from 'express';
import prisma from '../prisma';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: { suppliers: { include: { supplier: true } } },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
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
        finalPrice,
        suppliers: {
            create: [
                {
                    supplierId,
                    supplierPrice: sPrice,
                    virtualStock: vStock,
                    safetyStock: sStock
                }
            ]
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

        let finalPrice = existingProduct.finalPrice;
        let totalStock = existingProduct.stockAvailable;

        // If updating supplier params, we need to know WHICH supplier. 
        // Fallback: Update the first one.
        if (existingProduct.suppliers.length > 0 && (supplierPrice !== undefined || virtualStock !== undefined)) {
            const supplierRel = existingProduct.suppliers[0];
            
            const newSPrice = supplierPrice !== undefined ? Number(supplierPrice) : supplierRel.supplierPrice;
            const newVStock = virtualStock !== undefined ? Number(virtualStock) : supplierRel.virtualStock;
            const newSStock = safetyStock !== undefined ? Number(safetyStock) : supplierRel.safetyStock;
            const newAvailable = Math.max(0, newVStock - newSStock);

            // Update Relation
            await prisma.productSupplier.update({
                where: { id: supplierRel.id },
                data: {
                    supplierPrice: newSPrice,
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
                finalPrice
            },
            include: { suppliers: true }
        });
        res.json(product);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error updating product', error });
    }
};
