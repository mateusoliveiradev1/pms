import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, supplierName } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || (supplierName ? 'SUPPLIER' : 'OPERATOR'),
        },
      });

      if (supplierName) {
        await prisma.supplier.create({
          data: {
            name: supplierName,
            integrationType: 'MANUAL',
            status: 'ACTIVE',
            financialStatus: 'ACTIVE',
            verificationStatus: 'PENDING',
            userId: user.id,
          },
        });
      }

      return user;
    });

    // Auto-login after registration
    const token = jwt.sign(
      { userId: result.id, email: result.email, role: result.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    res.status(201).json({ 
      message: 'User created successfully', 
      token, 
      user: { id: result.id, name: result.name, email: result.email, role: result.role } 
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error });
  }
};

export const updatePushToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    if (!token) {
        res.status(400).json({ message: 'Token is required' });
        return;
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { expoPushToken: token }
        });
        res.json({ message: 'Push token updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating push token', error });
    }
};
