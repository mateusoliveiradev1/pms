import { Request, Response } from 'express';
import prisma from '../prisma';
import { supabase } from '../lib/supabase';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, accountName, accountType } = req.body;

  try {
    // 1. Create User in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'OWNER',
        }
      }
    });

    if (error) {
       res.status(400).json({ message: error.message });
       return;
    }

    if (!data.user) {
        res.status(400).json({ message: 'Registration failed. Check email confirmation settings.' });
        return;
    }

    // 2. Transaction: Create Account, User e, se necessário, Supplier
    try {
      const accountTypeValue = accountType === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';

      const result = await prisma.$transaction(async (tx) => {
        const planId = 'basic';
        const finalAccountName = accountName || name || 'Minha Conta';

        const account = await tx.account.create({
          data: {
            name: finalAccountName,
            email: email,
            type: accountTypeValue,
            planId,
            onboardingStatus: accountTypeValue === 'INDIVIDUAL' ? 'COMPLETO' : 'REQUIRES_SUPPLIER',
          },
        });

        const user = await tx.user.upsert({
          where: { id: data.user!.id },
          update: {
            name,
            email,
            role: 'OWNER',
            accountId: account.id,
          },
          create: {
            id: data.user!.id,
            email,
            name,
            role: 'OWNER',
            status: 'ACTIVE',
            accountId: account.id,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        });

        let supplier = null;

        if (accountTypeValue === 'INDIVIDUAL') {
          supplier = await tx.supplier.create({
            data: {
              name: finalAccountName,
              type: 'INDIVIDUAL',
              integrationType: 'MANUAL',
              status: 'ACTIVE',
              active: true,
              financialStatus: 'ACTIVE',
              verificationStatus: 'PENDING',
              userId: data.user!.id,
              accountId: account.id,
              isDefault: true,
              planId,
            },
          });
        }

        return { account, user, supplier };
      });

      res.status(201).json({
        message: 'Account created successfully',
        token: data.session?.access_token,
        account: {
          id: result.account.id,
          name: result.account.name,
          type: result.account.type,
          planId: result.account.planId,
          onboardingStatus: result.account.onboardingStatus,
        },
        user: result.user,
        supplier: result.supplier,
      });
      return;
    } catch (dbError: any) {
      console.error('Failed to create account/user structure:', dbError);
      res.status(500).json({ message: 'Database creation failed', error: dbError.message });
      return;
    }

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        res.status(401).json({ message: error.message });
        return;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: data.user?.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            planId: true,
            onboardingStatus: true,
          },
        },
      },
    });

    const account = dbUser?.account ?? null;
    const supplier =
      account?.id
        ? await prisma.supplier.findFirst({
            where: { accountId: account.id, isDefault: true },
            select: { id: true, name: true, type: true, status: true },
          })
        : null;

    res.json({ 
        token: data.session?.access_token, 
        user: { 
            id: data.user?.id, 
            email: data.user?.email, 
            role: dbUser?.role || data.user?.user_metadata?.role,
            name: dbUser?.name || data.user?.user_metadata?.name || 'Usuário'
        },
        account,
        supplier
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
    const { name } = req.body;
    const userId = (req as any).user?.userId;
    const userEmail = (req as any).user?.email;

    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    try {
        // Upsert ensures that if the user is missing in DB (sync issue), we create it now.
        const updatedUser = await prisma.user.upsert({
            where: { id: userId },
            update: { name },
            create: {
                id: userId,
                email: userEmail || '', // Should come from token
                name: name,
                role: 'SUPPLIER', // Default fallback
                status: 'ACTIVE'
            },
            select: { id: true, name: true, email: true, role: true }
        });

        res.json(updatedUser);
    } catch (error: any) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile', error: error.message });
    }
};

export const updatePushToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { expoPushToken: token }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update push token:', error);
        res.status(500).json({ error: 'Failed to update token' });
    }
};
