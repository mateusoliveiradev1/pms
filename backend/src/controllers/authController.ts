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

    // Auto-confirm email in development/production to avoid email verification block
    // This requires SUPABASE_SERVICE_KEY to be set in backend
    try {
        await supabase.auth.admin.updateUserById(
            data.user.id,
            { email_confirm: true }
        );
    } catch (confirmError) {
        console.warn('Failed to auto-confirm email (Service Key might be missing or insufficient permissions):', confirmError);
    }

    // 2. Handle Supplier Creation (if needed)
    if (supplierName) {
        // Wait for Trigger to sync User to public table
        // Simple retry mechanism
        let retries = 5;
        let userCreated = false;
        
        while (retries > 0) {
            const userExists = await prisma.user.findUnique({ where: { id: data.user.id } });
            if (userExists) {
                userCreated = true;
                break;
            }
            await new Promise(r => setTimeout(r, 500));
            retries--;
        }
        
        if (userCreated) {
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
        } else {
            console.warn(`User ${data.user.id} not found in public table after retries. Supplier creation skipped.`);
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

    res.json({ 
        token: data.session?.access_token, 
        user: { 
            id: data.user?.id, 
            email: data.user?.email, 
            role: data.user?.user_metadata?.role 
        } 
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Login failed', error: error.message });
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
