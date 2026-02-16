import { Request, Response } from 'express';
import prisma from '../prisma';
import { Role, AccountType } from '@prisma/client';

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    let where: any = {};

    // RBAC Scope Enforcement
    if (user.role === Role.SYSTEM_ADMIN) {  
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

export const createExternalSupplier = async (req: Request, res: Response) => {
  const { name, accountId, integrationType, shippingDeadline } = req.body;
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const account = await prisma.account.findUnique({
      where: { id: String(accountId) },
      include: { plan: true, suppliers: true }
    });
    if (!account) {
      res.status(400).json({ message: 'Conta inválida' });
      return;
    }

    const maxExternal = account.plan?.maxExternalSuppliers ?? null;
    const currentExternalCount = await prisma.supplier.count({
      where: { accountId: account.id, supplierType: 'EXTERNAL' }
    });
    if (maxExternal !== null && maxExternal !== undefined && maxExternal > 0 && currentExternalCount >= maxExternal) {
      res.status(403).json({ message: 'Limite de sellers externos do plano atingido' });
      return;
    }

    const supplier = await prisma.$transaction(async (tx) => {
      const created = await tx.supplier.create({
        data: {
          name,
          type: 'COMPANY',
          supplierType: 'EXTERNAL',
          integrationType: integrationType || 'MANUAL',
          shippingDeadline: shippingDeadline ? parseInt(shippingDeadline) : null,
          status: 'ACTIVE',
          active: false,
          accountId: account.id,
          isDefault: false,
          planId: account.planId,
          userId: authUser.userId,
          financialStatus: 'ACTIVE',
          verificationStatus: 'PENDING_APPROVAL'
        }
      });

      await tx.adminLog.create({
        data: {
          adminId: authUser.userId!,
          adminName: 'SellerOnboarding',
          action: 'EXTERNAL_SELLER_ONBOARDING_REQUEST',
          targetId: created.id,
          details: JSON.stringify({ accountId: account.id, name }),
          reason: 'Pending approval'
        }
      });

      return created;
    });

    res.status(201).json(supplier);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating external supplier', error: error.message });
  }
};

export const approveExternalSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Must be Account Admin or System Admin
    if (!['ACCOUNT_ADMIN', 'SYSTEM_ADMIN', 'ADMIN'].includes(String(authUser.role))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      res.status(404).json({ message: 'Supplier not found' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.supplier.update({
        where: { id },
        data: { verificationStatus: 'APPROVED', active: true }
      });

      await tx.adminLog.create({
        data: {
          adminId: authUser.userId!,
          adminName: 'AccountAdmin',
          action: 'EXTERNAL_SELLER_APPROVED',
          targetId: id,
          details: JSON.stringify({ supplierId: id, accountId: up.accountId })
        }
      });

      return up;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Error approving external supplier', error: error.message });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  const { name, integrationType, shippingDeadline, type, supplierType } = req.body;
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
    if (user.role !== Role.ACCOUNT_ADMIN && user.role !== Role.SYSTEM_ADMIN) {
         res.status(403).json({ message: 'Only Account Admins can create suppliers.' });
         return;
    }

    // 2. Check Plan Limits
    const desiredType: 'INTERNAL' | 'EXTERNAL' = (supplierType === 'EXTERNAL') ? 'EXTERNAL' : 'INTERNAL';
    const plan = user.account.plan;
    let maxForType: number | null = null;
    if (desiredType === 'INTERNAL') {
      maxForType = (plan?.maxInternalSuppliers ?? null);
    } else {
      maxForType = (plan?.maxExternalSuppliers ?? null);
    }

    if (maxForType !== null && maxForType !== undefined) {
      const currentTypeCount = await prisma.supplier.count({
        where: { accountId: user.account.id, supplierType: desiredType }
      });
      if (currentTypeCount >= maxForType) {
        res.status(403).json({ message: `Limite de fornecedores ${desiredType.toLowerCase()} do plano atingido` });
        return;
      }
    }

    const account = user.account;
    const totalSuppliersCount = await prisma.supplier.count({ where: { accountId: account.id } });

    // 3. Create Supplier
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          name,
          type: type || 'INDIVIDUAL', // Default to INDIVIDUAL if not specified
          supplierType: desiredType,
          integrationType: integrationType || 'MANUAL',
          status: 'ACTIVE',
          active: true,
          accountId: account.id,
          isDefault: false,
          planId: account.planId,
          userId: authUser.userId,
          shippingDeadline,
          financialStatus: 'ACTIVE',
          verificationStatus: desiredType === 'EXTERNAL' ? 'PENDING_APPROVAL' : 'VERIFIED',
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

      // Update Account Status if it's the first supplier (regardless of type)
      // This ensures any stuck user gets unblocked
      let updatedAccount: any = account;
      if (totalSuppliersCount === 0 || account.onboardingStatus !== 'COMPLETO') {
          updatedAccount = await tx.account.update({
              where: { id: account.id },
              data: { onboardingStatus: 'COMPLETO' }
          });
      }

      return { ...supplier, account: updatedAccount };
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error creating supplier', error });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const authUser = (req as any).user;
    if (!authUser?.userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    // 1. Check if Supplier exists and User has permission
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
        res.status(404).json({ message: 'Supplier not found' });
        return;
    }

    // Permission Check: Only Account Admin or System Admin can delete
    // AND if Account Admin, must own the supplier account
    if (authUser.role !== 'SYSTEM_ADMIN' && authUser.role !== 'ADMIN') {
        const user = await prisma.user.findUnique({ where: { id: authUser.userId } });
        if (!user || user.accountId !== supplier.accountId || user.role !== 'ACCOUNT_ADMIN') {
             res.status(403).json({ message: 'Forbidden' });
             return;
        }
    }

    // 2. Check for Active Orders (Integrity Check)
    const pendingOrders = await prisma.order.count({
        where: {
            supplierId: id,
            status: { notIn: ['DELIVERED', 'CANCELLED'] } // Only allow delete if all orders are closed
        }
    });

    if (pendingOrders > 0) {
        res.status(400).json({ message: 'Cannot delete supplier with pending orders. Finish or cancel them first.' });
        return;
    }

    // 3. Safe Delete
    await prisma.$transaction(async (tx) => {
        // Delete Product Relations first
        await tx.productSupplier.deleteMany({
            where: { supplierId: id }
        });
        
        // Delete Supplier
        await tx.supplier.delete({
            where: { id }
        });

        // Audit Log
        await tx.adminLog.create({
            data: {
                adminId: authUser.userId,
                adminName: 'User',
                action: 'DELETE_SUPPLIER',
                targetId: id,
                details: JSON.stringify({ name: supplier.name }),
                reason: 'User Request'
            }
        });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting supplier', error: error.message });
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

      if (user.role === Role.SELLER && existingSupplier.userId !== authUser.userId) {
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
