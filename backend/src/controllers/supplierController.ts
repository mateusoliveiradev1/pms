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
        : await prisma.supplier.findMany({
            where: {
              account: {
                users: {
                  some: { id: authUser.userId },
                },
              },
            },
          });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers', error });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  const { name, integrationType, shippingDeadline, type } = req.body;
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: { account: { include: { plan: true, suppliers: true } } },
    });

    if (!user || !user.account) {
      res.status(400).json({ message: 'Usuário sem conta vinculada' });
      return;
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Apenas OWNER ou ADMIN podem criar fornecedores' });
      return;
    }

    if (user.account.type !== 'COMPANY') {
      res.status(400).json({ message: 'A criação manual de fornecedores é permitida apenas para contas COMPANY' });
      return;
    }

    const planMaxSuppliers = user.account.plan?.maxSuppliers ?? 1;
    const currentSuppliers = user.account.suppliers.length;

    if (currentSuppliers >= planMaxSuppliers) {
      res.status(403).json({ message: 'Limite de fornecedores do plano atingido' });
      return;
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        type: type === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL',
        integrationType: integrationType || 'MANUAL',
        shippingDeadline,
        status: 'ACTIVE',
        active: true,
        userId: authUser.userId,
        accountId: user.account.id,
        planId: user.account.planId,
        financialStatus: 'ACTIVE',
        verificationStatus: 'PENDING',
      },
    });

    let account = user.account;
    if (user.account.onboardingStatus === 'REQUIRES_SUPPLIER') {
      account = await prisma.account.update({
        where: { id: user.account.id },
        data: { onboardingStatus: 'COMPLETO' },
      });
    }

    res.status(201).json({
      supplier,
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        planId: account.planId,
        onboardingStatus: account.onboardingStatus,
      },
    });
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
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { accountId: true, role: true },
    });

    const existingSupplier = await prisma.supplier.findUnique({ where: { id } });
    if (!existingSupplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    if (authUser.role !== 'ADMIN') {
      if (!user?.accountId || existingSupplier.accountId !== user.accountId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }

      if (user.role === 'SUPPLIER' && existingSupplier.userId !== authUser.userId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
    }

    const data: any = {
      name,
      shippingDeadline: shippingDeadline ? parseInt(shippingDeadline) : undefined,
    };

    if (authUser.role === 'ADMIN' && status) {
      data.status = status;
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating supplier', error });
  }
};
