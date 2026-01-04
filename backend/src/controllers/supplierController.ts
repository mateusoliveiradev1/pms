import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers', error });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  const { name, integrationType, shippingDeadline, status } = req.body;
  try {
    const supplier = await prisma.supplier.create({
      data: { name, integrationType, shippingDeadline, status },
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
