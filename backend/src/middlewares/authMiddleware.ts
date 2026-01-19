import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import prisma from '../prisma';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: Role;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null') {
    res.status(401).json({ message: 'Token não fornecido ou inválido' });
    return; 
  }

  try {
      // Validate token using Supabase Auth
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

      if (error || !supabaseUser) {
          res.status(403).json({ message: 'Sessão inválida ou expirada', error: error?.message });
          return;
      }

      // Fetch Role from Database (Source of Truth)
      const dbUser = await prisma.user.findUnique({
          where: { id: supabaseUser.id },
          select: { role: true, email: true }
      });

      // Strict Role Fallback
      const role = dbUser?.role || Role.SELLER;

      // Map Supabase User to App User Structure
      req.user = {
          userId: supabaseUser.id,
          email: supabaseUser.email || '',
          role: role 
      };

      next();
  } catch (error) {
      console.error('Auth Middleware Error:', error);
      res.status(500).json({ message: 'Erro interno de autenticação' });
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      console.log(`[RBAC] Denied: No User`);
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[RBAC] Endpoint=${req.path} Role=${req.user.role} -> DENIED`);
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    console.log(`[RBAC] Endpoint=${req.path} Role=${req.user.role} -> ALLOWED`);
    next();
  };
};

export const requireSystemAdmin = requireRole([Role.SYSTEM_ADMIN]);
export const requireAccountAdmin = requireRole([Role.SYSTEM_ADMIN, Role.ACCOUNT_ADMIN]);
export const requireSeller = requireRole([Role.SYSTEM_ADMIN, Role.ACCOUNT_ADMIN, Role.SELLER]);

