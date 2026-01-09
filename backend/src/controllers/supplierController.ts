import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const suppliers =
      authUser.role === 'ADMIN'
        ? await prisma.supplier.findMany()
        : await prisma.supplier.findMany({ where: { userId: authUser.userId } });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers', error });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  const { name, integrationType, shippingDeadline, status, userId } = req.body;
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const ownerUserId = authUser.role === 'ADMIN' ? (userId ?? authUser.userId) : authUser.userId;
    const supplier = await prisma.supplier.create({
      data: { name, integrationType, shippingDeadline, status, userId: ownerUserId },
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error creating supplier', error });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Optional: detach relations (ProductSupplier) before deleting
    await prisma.productSupplier.deleteMany({
      where: { supplierId: id }
    });

    await prisma.supplier.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting supplier', error });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, shippingDeadline, status } = req.body;

  try {
    const authUser = (req as any).user;
    
    // Check permissions
    const existingSupplier = await prisma.supplier.findUnique({ where: { id } });
    if (!existingSupplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    if (authUser.role !== 'ADMIN' && existingSupplier.userId !== authUser.userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Prepare update data
    const data: any = {
      name,
      shippingDeadline: shippingDeadline ? parseInt(shippingDeadline) : undefined,
    };

    // Only Admin can change status
    if (authUser.role === 'ADMIN' && status) {
      data.status = status;
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating supplier', error });
  }
};
