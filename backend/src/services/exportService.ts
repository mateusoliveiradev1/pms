import prisma from '../prisma';
import * as XLSX from 'xlsx';

export class ExportService {
  static async generateAccountingExport(startDate: Date, endDate: Date, format: 'csv' | 'xlsx' = 'csv') {
    // Query Ledger
    const entries = await prisma.financialLedger.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      },
      include: {
        supplier: {
          select: { name: true, billingDoc: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Transform Data
    const data = entries.map(entry => ({
      Data: entry.createdAt.toISOString().split('T')[0],
      Fornecedor: entry.supplier.name,
      Documento: entry.supplier.billingDoc || 'N/A',
      Tipo: entry.type,
      Descricao: entry.description || '',
      Valor: entry.amount,
    }));

    // Let's create a Summary as well.
    const summary = await this.generateSummary(startDate, endDate);

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Detailed Ledger
      const wsLedger = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, wsLedger, "Extrato Detalhado");

      // Sheet 2: Summary
      const wsSummary = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo Contabil");

      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } else {
      // CSV - Only Detailed Ledger
      if (data.length === 0) return '';
      const header = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','));
      return [header, ...rows].join('\n');
    }
  }

  private static async generateSummary(startDate: Date, endDate: Date) {
    // Aggregations
    const aggregations = await prisma.financialLedger.groupBy({
      by: ['type'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    const supplierBalances = await prisma.supplier.findMany({
      select: { name: true, walletBalance: true }
    });

    return [
      ...aggregations.map(agg => ({ Categoria: agg.type, Total: agg._sum.amount })),
      { Categoria: '---', Total: 0 },
      ...supplierBalances.map(s => ({ Categoria: `Saldo: ${s.name}`, Total: s.walletBalance }))
    ];
  }
}
