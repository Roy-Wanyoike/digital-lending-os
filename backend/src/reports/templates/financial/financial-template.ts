/**
 * Financial Report Template
 * 
 * Defines the structure and formatting for financial reports including:
 * - Income Statement (P&L)
 * - Balance Sheet Summary
 * - Cash Flow Summary
 * - Transaction Details
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { db } from '../../../lib/db';

export interface FinancialReportData {
  incomeStatement: {
    revenue: {
      interestIncome: number;
      feeIncome: number;
      penaltyIncome: number;
      otherIncome: number;
      totalRevenue: number;
    };
    expenses: {
      costOfFunds: number;
      operatingExpenses: number;
      loanLossProvisions: number;
      otherExpenses: number;
      totalExpenses: number;
    };
    netProfit: number;
    profitMargin: number;
  };
  balanceSheet: {
    assets: {
      cashAndEquivalents: number;
      loansReceivable: number;
      otherAssets: number;
      totalAssets: number;
    };
    liabilities: {
      deposits: number;
      borrowings: number;
      otherLiabilities: number;
      totalLiabilities: number;
    };
    equity: {
      shareCapital: number;
      retainedEarnings: number;
      totalEquity: number;
    };
  };
  keyRatios: {
    yieldOnPortfolio: string;
    costToIncome: string;
    netInterestMargin: string;
    returnOnAssets: string;
    returnOnEquity: string;
    capitalAdequacy: string;
  };
  transactions?: Array<{
    id: string;
    date: Date;
    type: string;
    description: string;
    amount: number;
    balance: number;
  }>;
  period: string;
  generatedAt: Date;
}

export interface FinancialReportFilters {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  periodType?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

/**
 * Generate financial report data from database
 */
export async function generateFinancialData(filters: FinancialReportFilters): Promise<FinancialReportData> {
  const { tenantId, startDate, endDate } = filters;

  // Build date filter for transactions
  const dateFilter = startDate || endDate ? {
    createdAt: {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    },
  } : {};

  // Fetch all financial metrics in parallel
  const [
    interestIncome,
    feeIncome,
    penaltyIncome,
    disbursements,
    collections,
    operatingTransactions,
    loanBalance,
    walletBalance,
  ] = await Promise.all([
    // Revenue sources
    db.transaction.aggregate({
      where: { tenantId, transactionType: 'REPAYMENT_INTEREST', ...dateFilter },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { tenantId, transactionType: 'FEE_COLLECTED', ...dateFilter },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { tenantId, transactionType: 'PENALTY_COLLECTED', ...dateFilter },
      _sum: { amount: true },
    }),
    // Disbursements (for COF calculation)
    db.transaction.aggregate({
      where: { tenantId, transactionType: 'DISBURSEMENT', ...dateFilter },
      _sum: { amount: true },
    }),
    // Collections (for yield calculation)
    db.transaction.aggregate({
      where: { 
        tenantId, 
        transactionType: { in: ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST'] },
        ...dateFilter,
      },
      _sum: { amount: true },
    }),
    // Operating expenses (mock - would come from expense table)
    Promise.resolve(456000),
    // Loan portfolio balance
    db.loan.aggregate({
      where: { tenantId, status: { in: ['ACTIVE', 'IN_ARREARS'] } },
      _sum: { outstandingBalance: true },
    }),
    // Wallet/cash balance (mock)
    Promise.resolve(2500000),
  ]);

  const totalRevenue = (interestIncome._sum.amount || 0) + 
                       (feeIncome._sum.amount || 0) + 
                       (penaltyIncome._sum.amount || 0);
  
  const costOfFunds = (disbursements._sum.amount || 0) * 0.08; // 8% COF rate
  const loanLossProvisions = totalRevenue * 0.02; // 2% provision rate
  const totalExpenses = costOfFunds + operatingTransactions + loanLossProvisions;
  const netProfit = totalRevenue - totalExpenses;

  const totalAssets = (loanBalance._sum.outstandingBalance || 0) + walletBalance;
  const totalEquity = totalAssets * 0.35; // Mock equity ratio

  return {
    incomeStatement: {
      revenue: {
        interestIncome: interestIncome._sum.amount || 0,
        feeIncome: feeIncome._sum.amount || 0,
        penaltyIncome: penaltyIncome._sum.amount || 0,
        otherIncome: 0,
        totalRevenue,
      },
      expenses: {
        costOfFunds,
        operatingExpenses: operatingTransactions,
        loanLossProvisions,
        otherExpenses: 0,
        totalExpenses,
      },
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    },
    balanceSheet: {
      assets: {
        cashAndEquivalents: walletBalance,
        loansReceivable: loanBalance._sum.outstandingBalance || 0,
        otherAssets: 500000,
        totalAssets,
      },
      liabilities: {
        deposits: totalAssets * 0.5,
        borrowings: totalAssets * 0.15,
        otherLiabilities: 0,
        totalLiabilities: totalAssets * 0.65,
      },
      equity: {
        shareCapital: 10000000,
        retainedEarnings: totalEquity - 10000000,
        totalEquity,
      },
    },
    keyRatios: {
      yieldOnPortfolio: collections._sum.amount && disbursements._sum.amount
        ? ((collections._sum.amount / disbursements._sum.amount) * 100).toFixed(2)
        : '0.00',
      costToIncome: totalRevenue > 0 ? ((operatingTransactions / totalRevenue) * 100).toFixed(2) : '0.00',
      netInterestMargin: '8.50',
      returnOnAssets: totalAssets > 0 ? ((netProfit / totalAssets) * 100).toFixed(2) : '0.00',
      returnOnEquity: totalEquity > 0 ? ((netProfit / totalEquity) * 100).toFixed(2) : '0.00',
      capitalAdequacy: ((totalEquity / (loanBalance._sum.outstandingBalance || 1)) * 100).toFixed(2),
    },
    period: filters.startDate && filters.endDate 
      ? `${filters.startDate.toISOString().split('T')[0]} to ${filters.endDate.toISOString().split('T')[0]}`
      : filters.periodType || 'Monthly',
    generatedAt: new Date(),
  };
}

/**
 * Generate Excel workbook for financial report
 */
export async function generateFinancialExcel(data: FinancialReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Digital Lending OS';
  workbook.created = new Date();

  // Income Statement Sheet
  const pnlSheet = workbook.addWorksheet('Income Statement');
  createPnLWorksheet(pnlSheet, data);

  // Balance Sheet Sheet
  const bsSheet = workbook.addWorksheet('Balance Sheet');
  createBalanceSheetWorksheet(bsSheet, data);

  // Key Ratios Sheet
  const ratiosSheet = workbook.addWorksheet('Key Ratios');
  createRatiosWorksheet(ratiosSheet, data);

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function createPnLWorksheet(sheet: ExcelJS.Worksheet, data: FinancialReportData): void {
  sheet.properties.defaultColWidth = 25;

  // Title
  sheet.mergeCells('A1:C1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'INCOME STATEMENT (PROFIT & LOSS)';
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:C2');
  sheet.getCell('A2').value = `Period: ${data.period} | Generated: ${data.generatedAt.toLocaleDateString()}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  // Revenue Section
  addSectionHeader(sheet, 'A4', 'REVENUE');
  
  const revenueRows = [
    ['Description', 'Amount (KES)'],
    ['Interest Income', data.incomeStatement.revenue.interestIncome],
    ['Fee Income', data.incomeStatement.revenue.feeIncome],
    ['Penalty Income', data.incomeStatement.revenue.penaltyIncome],
    ['Other Income', data.incomeStatement.revenue.otherIncome],
    ['TOTAL REVENUE', data.incomeStatement.revenue.totalRevenue],
  ];

  revenueRows.forEach((row, idx) => {
    const rowIdx = 5 + idx;
    const isTotal = idx === revenueRows.length - 1;
    
    sheet.getCell(rowIdx, 1).value = row[0];
    sheet.getCell(rowIdx, 2).value = row[1];
    sheet.getCell(rowIdx, 2).numFmt = '#,##0.00';
    
    if (idx === 0 || isTotal) {
      sheet.getCell(rowIdx, 1).font = { bold: true };
      sheet.getCell(rowIdx, 2).font = { bold: true };
      sheet.getCell(rowIdx, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isTotal ? 'FFD4EDDA' : 'FFE0E0E0' } };
    }
  });

  // Expenses Section
  addSectionHeader(sheet, 'A12', 'EXPENSES');
  
  const expenseRows = [
    ['Description', 'Amount (KES)'],
    ['Cost of Funds', data.incomeStatement.expenses.costOfFunds],
    ['Operating Expenses', data.incomeStatement.expenses.operatingExpenses],
    ['Loan Loss Provisions', data.incomeStatement.expenses.loanLossProvisions],
    ['Other Expenses', data.incomeStatement.expenses.otherExpenses],
    ['TOTAL EXPENSES', data.incomeStatement.expenses.totalExpenses],
  ];

  expenseRows.forEach((row, idx) => {
    const rowIdx = 13 + idx;
    const isTotal = idx === expenseRows.length - 1;
    
    sheet.getCell(rowIdx, 1).value = row[0];
    sheet.getCell(rowIdx, 2).value = row[1];
    sheet.getCell(rowIdx, 2).numFmt = '#,##0.00';
    
    if (idx === 0 || isTotal) {
      sheet.getCell(rowIdx, 1).font = { bold: true };
      sheet.getCell(rowIdx, 2).font = { bold: true };
      sheet.getCell(rowIdx, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isTotal ? 'FFF8D7DA' : 'FFE0E0E0' } };
    }
  });

  // Net Profit Section
  addSectionHeader(sheet, 'A20', 'PROFITABILITY');
  
  sheet.getCell('A21').value = 'NET PROFIT/(LOSS)';
  sheet.getCell('B21').value = data.incomeStatement.netProfit;
  sheet.getCell('B21').numFmt = '#,##0.00';
  sheet.getCell('A21').font = { bold: true, size: 12 };
  sheet.getCell('B21').font = { bold: true, size: 12 };
  sheet.getCell('B21').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: data.incomeStatement.netProfit >= 0 ? 'FFD4EDDA' : 'FFF8D7DA' } };

  sheet.getCell('A22').value = 'Profit Margin';
  sheet.getCell('B22').value = `${data.incomeStatement.profitMargin.toFixed(2)}%`;
  sheet.getCell('A22').font = { bold: true };
}

function createBalanceSheetWorksheet(sheet: ExcelJS.Worksheet, data: FinancialReportData): void {
  sheet.properties.defaultColWidth = 25;

  // Title
  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'BALANCE SHEET SUMMARY';
  sheet.getCell('A1').font = { size: 16, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  // Assets Section
  addSectionHeader(sheet, 'A3', 'ASSETS');
  
  const assetRows = [
    ['Asset Type', 'Amount (KES)'],
    ['Cash & Equivalents', data.balanceSheet.assets.cashAndEquivalents],
    ['Loans Receivable (Gross)', data.balanceSheet.assets.loansReceivable],
    ['Other Assets', data.balanceSheet.assets.otherAssets],
    ['TOTAL ASSETS', data.balanceSheet.assets.totalAssets],
  ];

  assetRows.forEach((row, idx) => {
    const rowIdx = 4 + idx;
    const isTotal = idx === assetRows.length - 1;
    
    sheet.getCell(rowIdx, 1).value = row[0];
    sheet.getCell(rowIdx, 2).value = row[1];
    sheet.getCell(rowIdx, 2).numFmt = '#,##0.00';
    
    if (idx === 0 || isTotal) {
      sheet.getCell(rowIdx, 1).font = { bold: true };
      sheet.getCell(rowIdx, 2).font = { bold: true };
      sheet.getCell(rowIdx, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    }
  });

  // Liabilities Section
  addSectionHeader(sheet, 'A10', 'LIABILITIES');
  
  const liabilityRows = [
    ['Liability Type', 'Amount (KES)'],
    ['Customer Deposits', data.balanceSheet.liabilities.deposits],
    ['Borrowings', data.balanceSheet.liabilities.borrowings],
    ['Other Liabilities', data.balanceSheet.liabilities.otherLiabilities],
    ['TOTAL LIABILITIES', data.balanceSheet.liabilities.totalLiabilities],
  ];

  liabilityRows.forEach((row, idx) => {
    const rowIdx = 11 + idx;
    const isTotal = idx === liabilityRows.length - 1;
    
    sheet.getCell(rowIdx, 1).value = row[0];
    sheet.getCell(rowIdx, 2).value = row[1];
    sheet.getCell(rowIdx, 2).numFmt = '#,##0.00';
    
    if (idx === 0 || isTotal) {
      sheet.getCell(rowIdx, 1).font = { bold: true };
      sheet.getCell(rowIdx, 2).font = { bold: true };
      sheet.getCell(rowIdx, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    }
  });

  // Equity Section
  addSectionHeader(sheet, 'A17', 'EQUITY');
  
  const equityRows = [
    ['Equity Component', 'Amount (KES)'],
    ['Share Capital', data.balanceSheet.equity.shareCapital],
    ['Retained Earnings', data.balanceSheet.equity.retainedEarnings],
    ['TOTAL EQUITY', data.balanceSheet.equity.totalEquity],
  ];

  equityRows.forEach((row, idx) => {
    const rowIdx = 18 + idx;
    const isTotal = idx === equityRows.length - 1;
    
    sheet.getCell(rowIdx, 1).value = row[0];
    sheet.getCell(rowIdx, 2).value = row[1];
    sheet.getCell(rowIdx, 2).numFmt = '#,##0.00';
    
    if (idx === 0 || isTotal) {
      sheet.getCell(rowIdx, 1).font = { bold: true };
      sheet.getCell(rowIdx, 2).font = { bold: true };
      sheet.getCell(rowIdx, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    }
  });
}

function createRatiosWorksheet(sheet: ExcelJS.Worksheet, data: FinancialReportData): void {
  sheet.properties.defaultColWidth = 25;

  // Title
  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'KEY FINANCIAL RATIOS';
  sheet.getCell('A1').font = { size: 16, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  // Headers
  const headers = ['Ratio', 'Value', 'Benchmark'];
  headers.forEach((header, idx) => {
    const cell = sheet.getCell(3, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  // Ratio data with benchmarks
  const ratios = [
    ['Yield on Portfolio (%)', data.keyRatios.yieldOnPortfolio, '> 15%'],
    ['Cost-to-Income Ratio (%)', data.keyRatios.costToIncome, '< 60%'],
    ['Net Interest Margin (%)', data.keyRatios.netInterestMargin, '> 8%'],
    ['Return on Assets (ROA) %', data.keyRatios.returnOnAssets, '> 2%'],
    ['Return on Equity (ROE) %', data.keyRatios.returnOnEquity, '> 15%'],
    ['Capital Adequacy Ratio (%)', data.keyRatios.capitalAdequacy, '> 15%'],
  ];

  ratios.forEach((row, idx) => {
    const rowIdx = 4 + idx;
    row.forEach((cell, colIdx) => {
      const excelCell = sheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
    });
  });
}

/**
 * Generate PDF document for financial report
 */
export function generateFinancialPdf(data: FinancialReportData): PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: 'Financial Report - Income Statement & Balance Sheet',
      Author: 'Digital Lending OS',
      CreationDate: new Date(),
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Title
  doc.fontSize(20).font('Helvetica-Bold').text('FINANCIAL REPORT', { align: 'center' });
  doc.moveDown();

  doc.fontSize(10).font('Helvetica')
    .text(`Period: ${data.period}`, { align: 'center' })
    .text(`Generated: ${data.generatedAt.toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  // Divider
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333333');
  doc.moveDown();

  // Income Statement Section
  doc.fontSize(14).font('Helvetica-Bold').text('INCOME STATEMENT');
  doc.moveDown(0.5);

  drawPnLSection(doc, data);
  doc.moveDown();

  // Key Ratios Section
  if (doc.y > 600) {
    doc.addPage();
  }

  doc.fontSize(14).font('Helvetica-Bold').text('KEY FINANCIAL RATIOS');
  doc.moveDown(0.5);

  const ratioHeaders = ['Ratio', 'Value', 'Benchmark'];
  const ratioRows = Object.entries(data.keyRatios).map(([key, value]) => {
    const benchmarks: Record<string, string> = {
      yieldOnPortfolio: '> 15%',
      costToIncome: '< 60%',
      netInterestMargin: '> 8%',
      returnOnAssets: '> 2%',
      returnOnEquity: '> 15%',
      capitalAdequacy: '> 15%',
    };
    const labels: Record<string, string> = {
      yieldOnPortfolio: 'Yield on Portfolio',
      costToIncome: 'Cost-to-Income',
      netInterestMargin: 'Net Interest Margin',
      returnOnAssets: 'Return on Assets',
      returnOnEquity: 'Return on Equity',
      capitalAdequacy: 'Capital Adequacy',
    };
    return [labels[key] || key, `${value}%`, benchmarks[key] || '-'];
  });

  drawTableWithHeaders(doc, ratioHeaders, ratioRows, [150, 80, 100]);

  doc.end();
  (doc as any).__chunks = chunks;
  return doc;
}

function drawPnLSection(doc: PDFDocument, data: FinancialReportData): void {
  const startY = doc.y;
  const colWidths = [200, 120];

  // Revenue
  doc.fontSize(11).font('Helvetica-Bold').text('REVENUE', 50, doc.y);
  doc.moveDown(0.3);

  const revenueItems = [
    ['Interest Income', formatCurrency(data.incomeStatement.revenue.interestIncome)],
    ['Fee Income', formatCurrency(data.incomeStatement.revenue.feeIncome)],
    ['Penalty Income', formatCurrency(data.incomeStatement.revenue.penaltyIncome)],
    ['Total Revenue', formatCurrency(data.incomeStatement.revenue.totalRevenue)],
  ];

  revenueItems.forEach((item, idx) => {
    const isLast = idx === revenueItems.length - 1;
    doc.font(isLast ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(isLast ? 10 : 9)
       .text(item[0], 60, doc.y, { continued: false })
       .text(item[1], 260, doc.y - (isLast ? 14 : 12), { width: 110, align: 'right' });
    doc.moveDown(0.2);
  });

  doc.moveDown(0.3);

  // Expenses
  doc.fontSize(11).font('Helvetica-Bold').text('EXPENSES');
  doc.moveDown(0.3);

  const expenseItems = [
    ['Cost of Funds', formatCurrency(data.incomeStatement.expenses.costOfFunds)],
    ['Operating Expenses', formatCurrency(data.incomeStatement.expenses.operatingExpenses)],
    ['Loan Loss Provisions', formatCurrency(data.incomeStatement.expenses.loanLossProvisions)],
    ['Total Expenses', formatCurrency(data.incomeStatement.expenses.totalExpenses)],
  ];

  expenseItems.forEach((item, idx) => {
    const isLast = idx === expenseItems.length - 1;
    doc.font(isLast ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(isLast ? 10 : 9)
       .text(item[0], 60, doc.y, { continued: false })
       .text(item[1], 260, doc.y - (isLast ? 14 : 12), { width: 110, align: 'right' });
    doc.moveDown(0.2);
  });

  doc.moveDown(0.5);

  // Net Profit box
  const profitColor = data.incomeStatement.netProfit >= 0 ? '#28a745' : '#dc3545';
  doc.rect(50, doc.y, 340, 30).fill('#f8f9fa').stroke(profitColor);
  doc.font('Helvetica-Bold').fontSize(12)
     .fillColor(profitColor)
     .text('NET PROFIT/(LOSS)', 60, doc.y + 8)
     .text(formatCurrency(data.incomeStatement.netProfit), 260, doc.y + 8, { width: 120, align: 'right' });
  doc.fillColor('#000000');
}

function drawTableWithHeaders(doc: PDFDocument, headers: string[], rows: string[][], colWidths: number[]): void {
  const startX = 50;
  let y = doc.y;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  // Draw headers
  let x = startX;
  doc.rect(startX, y - 5, tableWidth, 18).fill('#E8E8E8');
  
  headers.forEach((header, idx) => {
    doc.fontSize(9).font('Helvetica-Bold')
       .text(header, x + 5, y, { width: colWidths[idx] - 10 });
    x += colWidths[idx];
  });

  y += 18;

  // Draw rows
  rows.forEach((row) => {
    x = startX;
    
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    row.forEach((cell, idx) => {
      doc.fontSize(8).font('Helvetica')
         .text(cell, x + 5, y, { width: colWidths[idx] - 10 });
      x += colWidths[idx];
    });

    y += 16;
  });

  doc.y = y + 10;
}

function formatCurrency(value: number): string {
  return `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addSectionHeader(sheet: ExcelJS.Worksheet, cell: string, text: string): void {
  const endCol = String.fromCharCode(cell.charCodeAt(0) + 1);
  sheet.mergeCells(`${cell}:${endCol}1`);
  const headerCell = sheet.getCell(cell);
  headerCell.value = text;
  headerCell.font = { bold: true, size: 11, color: { argb: 'FF333333' } };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
}
