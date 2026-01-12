import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    let where: any = {};

    // RBAC Scope Enforcement
    if (user.role === 'SYSTEM_ADMIN') {
        // Can see all, but filter if query param provided
        if (req.query.accountId) where.accountId = req.query.accountId;
    } else if (user.role === 'ACCOUNT_ADMIN') {
        // Must only see own account's suppliers
        const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
        if (!dbUser?.accountId) {
             res.status(403).json({ message: 'User not linked to an account' });
             return;
        }
        where.accountId = dbUser.accountId;
    } else if (user.role === 'SUPPLIER_ADMIN' || user.role === 'SUPPLIER_USER') {
         // Can only see their own supplier(s) linked to their user
         // Assuming User <-> Supplier relationship via userId field in Supplier or via User.suppliers
         where.userId = user.userId;
    } else {
        // Default deny/fallback
        res.status(403).json({ message: 'Unauthorized access level' });
        return;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        plan: true,
        account: { select: { name: true, email: true } }
      },
    });
    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
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

    if (user.account.type === 'INDIVIDUAL' && user.role !== 'SYSTEM_ADMIN') {
        res.status(403).json({ message: 'Individual accounts cannot create additional suppliers manually.' });
        return;
    }

    // Verify User Permission (Must be Account Admin or System Admin)
    if (user.role !== 'ACCOUNT_ADMIN' && user.role !== 'SYSTEM_ADMIN' && user.role !== 'ADMIN') {
         res.status(403).json({ message: 'Only Account Admins can create suppliers.' });
         return;
    }

    // 2. Check Plan Limits
    const planMaxSuppliers = user.account.plan?.maxSuppliers ?? 1;
    const currentSuppliersCount = await prisma.supplier.count({
      where: { accountId: user.account.id },
    });

    if (currentSuppliersCount >= planMaxSuppliers) {
      res.status(403).json({ message: 'Limite de fornecedores do plano atingido' });
      return;
    }

    const account = user.account;

    // 3. Create Supplier
    const newSupplier = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          name,
          type: type || 'INDIVIDUAL', // Default to INDIVIDUAL if not specified
          integrationType: integrationType || 'MANUAL',
          status: 'ACTIVE',
          active: true,
          accountId: account.id,
          isDefault: false,
          planId: account.planId,
          userId: authUser.userId,
          shippingDeadline,
          financialStatus: 'ACTIVE',
          verificationStatus: 'PENDING',
        },
      });

      // Audit Log
      await tx.adminLog.create({
        data: {
           adminId: user.id,
           adminName: user.email || 'Unknown',
           action: 'CREATE_SUPPLIER',
           targetId: supplier.id,
           details: JSON.stringify({ name: supplier.name, type: supplier.type }),
           reason: 'Manual creation by Admin'
        }
      });

      // Update Account Status if it's the first supplier for a Company
      if (account.type === 'COMPANY' && currentSuppliersCount === 0) {
          await tx.account.update({
              where: { id: account.id },
              data: { onboardingStatus: 'COMPLETO' }
          });
      }

      return supplier;
    });

    res.status(201).json(newSupplier);
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
