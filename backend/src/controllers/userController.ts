
import { Request, Response } from 'express';
import prisma from '../prisma';
import { supabase } from '../lib/supabase';
import { Role } from '@prisma/client';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.userId;
    const { email, password, name } = req.body;

    if (!currentUserId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // 1. Verify Current User Role
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { account: true }
    });

    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (currentUser.role !== Role.ACCOUNT_ADMIN) {
      res.status(403).json({ message: 'Forbidden: Only Account Admins can create users.' });
      return;
    }

    if (!currentUser.accountId) {
      res.status(400).json({ message: 'User not linked to an account.' });
      return;
    }

    // 2. Create User in Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: Role.SELLER // STRICTLY SELLER
        }
      }
    });

    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }

    if (!data.user) {
      res.status(400).json({ message: 'Failed to create user in Auth provider.' });
      return;
    }

    // 3. Create User in Database (Linked to same Account)
    const newUser = await prisma.user.create({
      data: {
        id: data.user.id,
        email: email,
        name: name,
        role: Role.SELLER, // STRICTLY SELLER
        accountId: currentUser.accountId,
        status: 'ACTIVE'
      }
    });

    res.status(201).json(newUser);

  } catch (error: any) {
    console.error('Create User Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
