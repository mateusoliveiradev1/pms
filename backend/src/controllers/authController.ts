import { Request, Response } from 'express';
import prisma from '../prisma';
import { supabase } from '../lib/supabase';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        account: true,
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let activeAccountId = user.accountId;
    let activeSupplierId = null;
    let onboardingStatus = 'PENDING';
    let accountStatus = user.account?.onboardingStatus;
    let accountType = user.account?.type;

    // Determine Context & ID based on Role
    if (user.role === 'SUPPLIER_ADMIN' || user.role === 'SUPPLIER_USER') {
       // Find the supplier linked to this user
       const supplier = await prisma.supplier.findFirst({
           where: { userId: user.id },
           include: { account: true }
       });
       
       if (supplier) {
           activeSupplierId = supplier.id;
           // If user has no explicit accountId, use the supplier's account
           if (!activeAccountId) {
               activeAccountId = supplier.accountId;
               if (supplier.account) {
                   accountStatus = supplier.account.onboardingStatus;
                   accountType = supplier.account.type;
               }
           }
       }
    }

    // Normalize Onboarding Status
    if (user.role === 'SYSTEM_ADMIN') {
        onboardingStatus = 'COMPLETED';
    } else if (accountStatus === 'COMPLETO') {
        onboardingStatus = 'COMPLETED';
    } else if (accountStatus === 'REQUIRES_SUPPLIER' && activeSupplierId) {
        // If waiting for supplier but we have one (maybe edge case), consider complete? 
        // Or keep pending? Let's stick to account status mapping.
        // Actually, if account says REQUIRES_SUPPLIER, it is PENDING.
        onboardingStatus = 'PENDING';
    }

    res.json({
       id: user.id,
       email: user.email,
       name: user.name,
       role: user.role,
       onboardingStatus,
       activeAccountId,
       activeSupplierId,
       accountType
     });

  } catch (error: any) {
    console.error('GetMe Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

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
          role: 'ACCOUNT_ADMIN', // CORRECT ROLE
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
            role: 'ACCOUNT_ADMIN', // CORRECT ROLE
            accountId: account.id,
          },
          create: {
            id: data.user!.id,
            email,
            name,
            role: 'ACCOUNT_ADMIN', // CORRECT ROLE
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

  console.log(`[Auth] Login attempt for: ${email}`);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.warn(`[Auth] Supabase Login Failed for ${email}: ${error.message}`);
        res.status(401).json({ message: error.message });
        return;
    }

    if (!data.user) {
        console.error(`[Auth] No user data returned for ${email}`);
        res.status(500).json({ message: 'Authentication failed internally' });
        return;
    }

    console.log(`[Auth] Supabase Login Success. User ID: ${data.user.id}. Checking Database...`);

    let dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      include: {
        account: true,
      }
    });

    // AUTO-SYNC LOGIC: If user exists in Auth but not in DB, create it.
    if (!dbUser) {
        console.log(`[Auth] User ${email} (ID: ${data.user.id}) not found in DB. Initiating Auto-Sync...`);
        
        try {
            dbUser = await prisma.$transaction(async (tx) => {
                const name = data.user!.user_metadata?.name || email.split('@')[0];
                const role = data.user!.user_metadata?.role || 'SUPPLIER_ADMIN'; // Default to Supplier Admin if undefined
                const accountType = 'INDIVIDUAL'; 
                const planId = 'basic';

                // Create Account
                const account = await tx.account.create({
                    data: {
                        name: name,
                        email: email,
                        type: accountType,
                        planId: planId,
                        onboardingStatus: 'COMPLETO' // Auto-synced users are assumed ready or will fix later
                    }
                });

                // Create User
                const newUser = await tx.user.create({
                    data: {
                        id: data.user!.id,
                        email: email,
                        name: name,
                        role: role,
                        status: 'ACTIVE',
                        accountId: account.id
                    },
                    include: { account: true }
                });

                // Create Default Supplier if needed
                if (role === 'SUPPLIER_ADMIN' || role === 'SUPPLIER_USER') {
                    await tx.supplier.create({
                        data: {
                            name: name,
                            type: 'INDIVIDUAL',
                            integrationType: 'MANUAL',
                            status: 'ACTIVE',
                            active: true,
                            financialStatus: 'ACTIVE',
                            verificationStatus: 'PENDING',
                            userId: newUser.id,
                            accountId: account.id,
                            isDefault: true,
                            planId: planId
                        }
                    });
                }

                return newUser;
            });
            console.log(`[Auth] Auto-Sync Completed for ${email}`);
        } catch (syncError: any) {
            console.error(`[Auth] Auto-Sync Failed: ${syncError.message}`);
            // Fallback: don't block login, but return limited data? 
            // Better to fail securely or let the partial login happen if logic allows.
            // But if we fail here, the frontend might crash expecting 'account'.
            throw new Error(`Database sync failed: ${syncError.message}`);
        }
    }

    // Refresh DB User (in case it was just created or we need fresh relations)
    // Actually dbUser is already populated or returned from transaction.
    
    // Fetch Supplier
    const supplier = dbUser.account?.id
        ? await prisma.supplier.findFirst({
            where: { accountId: dbUser.account.id, isDefault: true },
            select: { id: true, name: true, type: true, status: true },
          })
        : null;

    console.log(`[Auth] Login Successful for ${email}. Returning token.`);

    res.json({ 
        token: data.session?.access_token, 
        user: { 
            id: dbUser.id, 
            email: dbUser.email, 
            role: dbUser.role,
            name: dbUser.name
        },
        account: dbUser.account,
        supplier
    });
  } catch (error: any) {
    console.error(`[Auth] Login Exception: ${error.message}`);
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
