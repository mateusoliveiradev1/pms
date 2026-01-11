import { Request, Response } from 'express';
import { BiFinancialService } from '../services/biFinancialService';
// Logger manual since lib/logger only exports logFinancialEvent specific for audit
const logger = {
  error: (msg: string, meta?: any) => console.error(msg, meta)
};

export const BiFinancialController = {
  getOverview: async (req: Request, res: Response) => {
    try {
      const period = req.query.period as '7d' | '30d' | 'all' || '30d';
      const stats = await BiFinancialService.getGlobalKPIs(period);
      
      // Calculate totals for the cards
      const current = stats[0] || {};
      const totals = {
        gmv: stats.reduce((acc, curr) => acc + (Number(curr.total_gmv) || 0), 0),
        commission: stats.reduce((acc, curr) => acc + (Number(curr.total_commission) || 0), 0),
        netRevenue: stats.reduce((acc, curr) => acc + (Number(curr.total_net_revenue) || 0), 0),
        pendingBalance: Number(current.total_pending_balance) || 0, // Current snapshot
        availableBalance: Number(current.total_available_balance) || 0 // Current snapshot
      };

      res.json({ stats, totals });
    } catch (error) {
      logger.error('Error fetching BI Overview', { error });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getDailyRevenue: async (req: Request, res: Response) => {
    try {
      const period = req.query.period as '7d' | '30d' | '90d' || '30d';
      const data = await BiFinancialService.getDailyRevenue(period);
      res.json(data);
    } catch (error) {
      logger.error('Error fetching Daily Revenue', { error });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getSuppliersKPIs: async (req: Request, res: Response) => {
    try {
      const supplierId = req.query.supplierId as string;
      const data = await BiFinancialService.getSupplierKPIs(supplierId);
      res.json(data);
    } catch (error) {
      logger.error('Error fetching Suppliers KPIs', { error });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getAnomalies: async (req: Request, res: Response) => {
    try {
      const data = await BiFinancialService.getFinancialAnomalies();
      res.json(data);
    } catch (error) {
      logger.error('Error fetching Anomalies', { error });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
