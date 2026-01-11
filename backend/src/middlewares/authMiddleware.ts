import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import prisma from '../prisma';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('Auth Error: No token provided');
    res.sendStatus(401);
    return; 
  }

  try {
      // Validate token using Supabase Auth
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

      if (error || !supabaseUser) {
          console.log('Auth Error:', error?.message);
          res.sendStatus(403);
          return;
      }

      // Fetch Role from Database (Source of Truth)
      const dbUser = await prisma.user.findUnique({
          where: { id: supabaseUser.id },
          select: { role: true, email: true }
      });

      // Map Supabase User to App User Structure
      req.user = {
          userId: supabaseUser.id,
          email: supabaseUser.email,
          role: dbUser?.role || 'SUPPLIER' // Fallback to SUPPLIER if DB user not found (shouldn't happen)
      };

      next();
  } catch (err) {
      console.log('Auth Unexpected Error:', err);
      res.sendStatus(403);
  }
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }
    if (req.user.role !== role) {
      res.sendStatus(403);
      return;
    }
    next();
  };
};
