import { Request, Response } from 'express';
import prisma from '../prisma';
import { supabase } from '../lib/supabase';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, supplierName } = req.body;

  try {
    // 1. Create User in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: role || (supplierName ? 'SUPPLIER' : 'SUPPLIER'),
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

    // 2. Create/Sync User in Public Schema Immediately
    // We use upsert to avoid race conditions with Supabase triggers
    try {
        await prisma.user.upsert({
            where: { id: data.user.id },
            update: { 
                name,
                email,
                role: 'SUPPLIER'
            },
            create: {
                id: data.user.id,
                email,
                name,
                role: 'SUPPLIER',
                status: 'ACTIVE'
            }
        });
    } catch (dbError: any) {
        console.error('Failed to sync user to public DB:', dbError);
        // Continue? If user isn't in DB, supplier creation will fail.
        res.status(500).json({ message: 'Database sync failed', error: dbError.message });
        return;
    }

    // 3. Handle Supplier Creation
    if (supplierName) {
        try {
            const supplier = await prisma.supplier.create({
                data: {
                    name: supplierName,
                    integrationType: 'MANUAL',
                    status: 'ACTIVE',
                    financialStatus: 'ACTIVE',
                    verificationStatus: 'PENDING',
                    userId: data.user.id,
                },
            });

            // Assign Default 'Basic' Plan
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);
            
            await prisma.supplierSubscription.create({
                data: {
                    supplierId: supplier.id,
                    planId: 'basic',
                    status: 'ATIVA',
                    startDate: new Date(),
                    endDate: endDate
                }
            });
        } catch (supplierError: any) {
            console.error('Failed to create supplier:', supplierError);
            // We don't block registration success, but user will need to retry supplier creation
        }
    }

    res.status(201).json({ 
      message: 'User created successfully', 
      token: data.session?.access_token, 
      user: { 
          id: data.user.id, 
          email: data.user.email, 
          role: data.user.user_metadata?.role 
      } 
    });

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

    // Fetch full user details from Prisma (Source of Truth for app data like name)
    const dbUser = await prisma.user.findUnique({
        where: { id: data.user?.id },
        select: { id: true, name: true, email: true, role: true }
    });

    res.json({ 
        token: data.session?.access_token, 
        user: { 
            id: data.user?.id, 
            email: data.user?.email, 
            role: dbUser?.role || data.user?.user_metadata?.role,
            name: dbUser?.name || data.user?.user_metadata?.name || 'Usuário'
        } 
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
