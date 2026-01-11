import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import prisma from '../prisma';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null') {
    console.log('Auth Error: No token provided or invalid format');
    res.status(401).json({ message: 'Token não fornecido ou inválido' });
    return; 
  }

  try {
      // Validate token using Supabase Auth
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

      if (error || !supabaseUser) {
          console.error('Auth Token Validation Error:', error?.message);
          res.status(403).json({ message: 'Sessão inválida ou expirada', error: error?.message });
          return;
      }

      // Fetch Role from Database (Source of Truth)
      const dbUser = await prisma.user.findUnique({
          where: { id: supabaseUser.id },
          select: { role: true, email: true }
      });

      if (!dbUser) {
          // If user exists in Supabase but not in our DB, it might be a sync issue.
          // However, spamming logs for this is noisy if we are handling it by falling back.
          // Only log if strictly necessary or change level to warn/info if it's expected during dev.
          // For now, let's silence it or make it a warning unless we want to auto-create.
          console.warn(`[Auth Warning] User ${supabaseUser.id} authenticated via Supabase but not found in local DB. Falling back to SUPPLIER role.`);
      }

      // Map Supabase User to App User Structure
      req.user = {
          userId: supabaseUser.id,
          email: supabaseUser.email,
          role: dbUser?.role || 'SUPPLIER' 
      };

      next();
  } catch (err: any) {
      console.error('Auth Unexpected Error:', err);
      res.status(403).json({ message: 'Erro de autenticação', error: err.message });
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
