/**
 * Portfolio Report Template
 * 
 * Defines the structure and formatting for portfolio quality reports
 * including PAR analysis, aging buckets, and loan book summary.
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { db } from '../../../lib/db';

export interface PortfolioReportData {
  summary: {
    totalLoans: number;
    activeLoans: number;
    totalDisbursed: number;
    totalOutstanding: number;
    averageLoanSize: number;
  };
  parAnalysis: {
    par1: number;
    par7?: number;
    par30: number;
    par90: number;
    par180?: number;
  };
  agingBuckets: Array<{
    bucket: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  loanStatusBreakdown: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  disbursementTrend?: Array<{
    period: string;
    count: number;
    amount: number;
  }>;
  period: string;
  generatedAt: Date;
}

export interface PortfolioReportFilters {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  productId?: string;
  officerId?: string;
}

/**
 * Generate portfolio report data from database
 */
export async function generatePortfolioData(filters: PortfolioReportFilters): Promise<PortfolioReportData> {
  const { tenantId, startDate, endDate } = filters;

  // Build date filter
  const dateFilter = startDate || endDate ? {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  } : undefined;

  // Fetch all metrics in parallel
  const [
    totalLoans,
    activeLoans,
    disbursedAgg,
    outstandingAgg,
    parMetrics,
    statusBreakdown,
  ] = await Promise.all([
    db.loan.count({ where: { tenantId } }),
    db.loan.count({ where: { tenantId, status: 'ACTIVE' } }),
    db.loan.aggregate({
      where: { tenantId },
      _sum: { principal: true },
      _count: true,
    }),
    db.loan.aggregate({
      where: { 
        tenantId,
        status: { in: ['ACTIVE', 'IN_ARREARS'] }
      },
      _sum: { outstandingBalance: true },
    }),
    // PAR calculations at different thresholds
    Promise.all([
      db.loan.aggregate({
        where: { tenantId, daysInArrears: { gte: 1 }, outstandingBalance: { gt: 0 } },
        _sum: { outstandingBalance: true },
        _count: true,
      }),
      db.loan.aggregate({
        where: { tenantId, daysInArrears: { gte: 7 }, outstandingBalance: { gt: 0 } },
        _sum: { outstandingBalance: true },
      }),
      db.loan.aggregate({
        where: { tenantId, daysInArrears: { gte: 30 }, outstandingBalance: { gt: 0 } },
        _sum: { outstandingBalance: true },
      }),
      db.loan.aggregate({
        where: { tenantId, daysInArrears: { gte: 90 }, outstandingBalance: { gt: 0 } },
        _sum: { outstandingBalance: true },
      }),
      db.loan.aggregate({
        where: { tenantId, daysInArrears: { gte: 180 }, outstandingBalance: { gt: 0 } },
        _sum: { outstandingBalance: true },
      }),
    ]),
    // Status breakdown
    Promise.all([
      db.loan.aggregate({ where: { tenantId, status: 'ACTIVE' }, _sum: { outstandingBalance: true }, _count: true }),
      db.loan.aggregate({ where: { tenantId, status: 'IN_ARREARS' }, _sum: { outstandingBalance: true }, _count: true }),
      db.loan.aggregate({ where: { tenantId, status: 'WRITTEN_OFF' }, _sum: { outstandingBalance: true }, _count: true }),
      db.loan.aggregate({ where: { tenantId, status: 'COMPLETED' }, _sum: { outstandingBalance: true }, _count: true }),
    ]),
  ]);

  const totalOutstanding = outstandingAgg._sum.outstandingBalance || 0;
  const totalDisbursed = disbursedAgg._sum.principal || 0;

  // Calculate aging buckets
  const agingBuckets = await calculateAgingBuckets(tenantId);

  return {
    summary: {
      totalLoans,
      activeLoans,
      totalDisbursed,
      totalOutstanding,
      averageLoanSize: activeLoans > 0 ? totalDisbursed / activeLoans : 0,
    },
    parAnalysis: {
      par1: totalOutstanding > 0 ? ((parMetrics[0]._sum.outstandingBalance || 0) / totalOutstanding) * 100 : 0,
      par7: totalOutstanding > 0 ? ((parMetrics[1]._sum.outstandingBalance || 0) / totalOutstanding) * 100 : undefined,
      par30: totalOutstanding > 0 ? ((parMetrics[2]._sum.outstandingBalance || 0) / totalOutstanding) * 100 : 0,
      par90: totalOutstanding > 0 ? ((parMetrics[3]._sum.outstandingBalance || 0) / totalOutstanding) * 100 : 0,
      par180: totalOutstanding > 0 ? ((parMetrics[4]._sum.outstandingBalance || 0) / totalOutstanding) * 100 : undefined,
    },
    agingBuckets,
    loanStatusBreakdown: [
      { status: 'Active', count: statusBreakdown[0]._count, amount: statusBreakdown[0]._sum.outstandingBalance || 0 },
      { status: 'In Arrears', count: statusBreakdown[1]._count, amount: statusBreakdown[1]._sum.outstandingBalance || 0 },
      { status: 'Written Off', count: statusBreakdown[2]._count, amount: statusBreakdown[2]._sum.outstandingBalance || 0 },
      { status: 'Completed', count: statusBreakdown[3]._count, amount: statusBreakdown[3]._sum.outstandingBalance || 0 },
    ],
    period: filters.startDate && filters.endDate 
      ? `${filters.startDate.toISOString().split('T')[0]} to ${filters.endDate.toISOString().split('T')[0]}`
      : 'All Time',
    generatedAt: new Date(),
  };
}

async function calculateAgingBuckets(tenantId: string): Promise<Array<{
  bucket: string;
  count: number;
  amount: number;
  percentage: number;
}>> {
  const buckets = [
    { name: 'Current (0 days)', minDays: 0, maxDays: 0 },
    { name: '1-29 days', minDays: 1, maxDays: 29 },
    { name: '30-59 days', minDays: 30, maxDays: 59 },
    { name: '60-89 days', minDays: 60, maxDays: 89 },
    { name: '90-179 days', minDays: 90, maxDays: 179 },
    { name: '180+ days', minDays: 180, maxDays: 99999 },
  ];

  const results = await Promise.all(
    buckets.map(async (bucket) => {
      const agg = await db.loan.aggregate({
        where: {
          tenantId,
          outstandingBalance: { gt: 0 },
          ...(bucket.minDays === 0 
            ? { daysInArrears: 0 }
            : { daysInArrears: { gte: bucket.minDays, lte: bucket.maxDays } }
          ),
        },
        _sum: { outstandingBalance: true },
        _count: true,
      });

      return {
        bucket: bucket.name,
        count: agg._count,
        amount: agg._sum.outstandingBalance || 0,
        percentage: 0, // Will be calculated after
      };
    })
  );

  // Calculate percentages
  const totalAmount = results.reduce((sum, r) => sum + r.amount, 0);
  return results.map(r => ({
    ...r,
    percentage: totalAmount > 0 ? (r.amount / totalAmount) * 100 : 0,
  }));
}

/**
 * Generate Excel workbook for portfolio report
 */
export async function generatePortfolioExcel(data: PortfolioReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Digital Lending OS';
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.properties.defaultColWidth = 20;

  // Title
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'PORTFOLIO QUALITY REPORT';
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  summarySheet.mergeCells('A2:D2');
  const dateCell = summarySheet.getCell('A2');
  dateCell.value = `Generated: ${data.generatedAt.toLocaleString()} | Period: ${data.period}`;
  dateCell.alignment = { horizontal: 'center' };

  // Summary Section
  addSectionHeader(summarySheet, 'A4', 'PORTFOLIO SUMMARY');
  
  const summaryRows = [
    ['Metric', 'Value'],
    ['Total Loans', data.summary.totalLoans],
    ['Active Loans', data.summary.activeLoans],
    ['Total Disbursed', formatCurrency(data.summary.totalDisbursed)],
    ['Total Outstanding', formatCurrency(data.summary.totalOutstanding)],
    ['Average Loan Size', formatCurrency(data.summary.averageLoanSize)],
  ];

  summaryRows.forEach((row, idx) => {
    const rowIdx = 5 + idx;
    row.forEach((cell, colIdx) => {
      const excelCell = summarySheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
      if (idx === 0) {
        excelCell.font = { bold: true };
        excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
    });
  });

  // PAR Analysis Section
  addSectionHeader(summarySheet, 'A12', 'PAR (PORTFOLIO AT RISK) ANALYSIS');
  
  const parRows = [
    ['PAR Metric', 'Percentage', 'Status'],
    ['PAR 1 (1+ days)', `${data.parAnalysis.par1.toFixed(2)}%`, getPARStatus(data.parAnalysis.par1)],
    ['PAR 7 (7+ days)', `${(data.parAnalysis.par7 ?? 0).toFixed(2)}%`, getPARStatus(data.parAnalysis.par7 ?? 0)],
    ['PAR 30 (30+ days)', `${data.parAnalysis.par30.toFixed(2)}%`, getPARStatus(data.parAnalysis.par30)],
    ['PAR 90 (90+ days)', `${data.parAnalysis.par90.toFixed(2)}%`, getPARStatus(data.parAnalysis.par90)],
    ['PAR 180 (180+ days)', `${(data.parAnalysis.par180 ?? 0).toFixed(2)}%`, getPARStatus(data.parAnalysis.par180 ?? 0)],
  ];

  parRows.forEach((row, idx) => {
    const rowIdx = 13 + idx;
    row.forEach((cell, colIdx) => {
      const excelCell = summarySheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
      if (idx === 0) {
        excelCell.font = { bold: true };
        excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
    });
  });

  // Aging Buckets Sheet
  const agingSheet = workbook.addWorksheet('Aging Buckets');
  agingSheet.properties.defaultColWidth = 20;

  addSectionHeader(agingSheet, 'A1', 'AGING BUCKET ANALYSIS');

  const agingHeaders = ['Bucket', 'Count', 'Amount (KES)', 'Percentage'];
  agingHeaders.forEach((header, idx) => {
    const cell = agingSheet.getCell(2, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  data.agingBuckets.forEach((bucket, idx) => {
    const rowIdx = 3 + idx;
    agingSheet.getCell(rowIdx, 1).value = bucket.bucket;
    agingSheet.getCell(rowIdx, 2).value = bucket.count;
    agingSheet.getCell(rowIdx, 3).value = bucket.amount;
    agingSheet.getCell(rowIdx, 3).numFmt = '#,##0.00';
    agingSheet.getCell(rowIdx, 4).value = `${bucket.percentage.toFixed(2)}%`;
  });

  // Loan Status Sheet
  const statusSheet = workbook.addWorksheet('Loan Status');
  statusSheet.properties.defaultColWidth = 20;

  addSectionHeader(statusSheet, 'A1', 'LOAN STATUS BREAKDOWN');

  const statusHeaders = ['Status', 'Count', 'Outstanding Amount'];
  statusHeaders.forEach((header, idx) => {
    const cell = statusSheet.getCell(2, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  data.loanStatusBreakdown.forEach((status, idx) => {
    const rowIdx = 3 + idx;
    statusSheet.getCell(rowIdx, 1).value = status.status;
    statusSheet.getCell(rowIdx, 2).value = status.count;
    statusSheet.getCell(rowIdx, 3).value = status.amount;
    statusSheet.getCell(rowIdx, 3).numFmt = '#,##0.00';
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate PDF document for portfolio report
 */
export function generatePortfolioPdf(data: PortfolioReportData): PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: 'Portfolio Quality Report',
      Author: 'Digital Lending OS',
      CreationDate: new Date(),
    },
  });

  // Helper to collect chunks
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Title
  doc.fontSize(20).font('Helvetica-Bold').text('PORTFOLIO QUALITY REPORT', { align: 'center' });
  doc.moveDown();

  // Subtitle with dates
  doc.fontSize(10).font('Helvetica')
    .text(`Generated: ${data.generatedAt.toLocaleString()}`, { align: 'center' })
    .text(`Period: ${data.period}`, { align: 'center' });
  doc.moveDown();

  // Divider
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333333');
  doc.moveDown();

  // Summary Section
  doc.fontSize(14).font('Helvetica-Bold').text('PORTFOLIO SUMMARY');
  doc.moveDown(0.5);

  const summaryTable = [
    ['Metric', 'Value'],
    ['Total Loans', data.summary.totalLoans.toString()],
    ['Active Loans', data.summary.activeLoans.toString()],
    ['Total Disbursed', formatCurrency(data.summary.totalDisbursed)],
    ['Total Outstanding', formatCurrency(data.summary.totalOutstanding)],
    ['Average Loan Size', formatCurrency(data.summary.averageLoanSize)],
  ];

  drawSimpleTable(doc, summaryTable, [200, 200]);
  doc.moveDown();

  // PAR Analysis Section
  doc.fontSize(14).font('Helvetica-Bold').text('PAR (PORTFOLIO AT RISK) ANALYSIS');
  doc.moveDown(0.5);

  const parTable = [
    ['PAR Metric', 'Percentage', 'Status'],
    [`PAR 1 (1+ days)`, `${data.parAnalysis.par1.toFixed(2)}%`, getPARStatus(data.parAnalysis.par1)],
    [`PAR 30 (30+ days)`, `${data.parAnalysis.par30.toFixed(2)}%`, getPARStatus(data.parAnalysis.par30)],
    [`PAR 90 (90+ days)`, `${data.parAnalysis.par90.toFixed(2)}%`, getPARStatus(data.parAnalysis.par90)],
  ];

  drawSimpleTable(doc, parTable, [150, 100, 150]);
  doc.moveDown();

  // Aging Buckets Section
  doc.fontSize(14).font('Helvetica-Bold').text('AGING BUCKET ANALYSIS');
  doc.moveDown(0.5);

  const agingHeaders = ['Bucket', 'Count', 'Amount', '%'];
  const agingRows = data.agingBuckets.map(b => [
    b.bucket,
    b.count.toString(),
    formatCurrency(b.amount),
    `${b.percentage.toFixed(2)}%`,
  ]);

  drawTableWithHeaders(doc, agingHeaders, agingRows, [120, 60, 130, 60]);

  // Finalize
  doc.end();

  // Return document and chunks collector
  (doc as any).__chunks = chunks;
  return doc;
}

// Helper functions
function formatCurrency(value: number): string {
  return `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getPARStatus(par: number): string {
  if (par <= 2) return 'Excellent';
  if (par <= 5) return 'Good';
  if (par <= 10) return 'Moderate';
  if (par <= 20) return 'High Risk';
  return 'Critical';
}

function addSectionHeader(sheet: ExcelJS.Worksheet, cell: string, text: string): void {
  sheet.mergeCells(`${cell}:${String.fromCharCode(cell.charCodeAt(0))}1`);
  const headerCell = sheet.getCell(cell);
  headerCell.value = text;
  headerCell.font = { bold: true, size: 12, color: { argb: 'FF333333' } };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
}

function drawSimpleTable(doc: PDFDocument, rows: string[][], colWidths: number[]): void {
  const startX = 50;
  let y = doc.y;

  rows.forEach((row, rowIdx) => {
    let x = startX;
    
    // Draw row background
    if (rowIdx === 0) {
      doc.rect(startX, y - 5, colWidths.reduce((a, b) => a + b, 0), 20)
         .fill('#E8E8E8');
    }

    row.forEach((cell, colIdx) => {
      doc.fontSize(rowIdx === 0 ? 10 : 9)
         .font(rowIdx === 0 ? 'Helvetica-Bold' : 'Helvetica')
         .text(cell, x, y, { width: colWidths[colIdx] - 10, align: colIdx === 1 ? 'right' : 'left' });
      x += colWidths[colIdx];
    });

    y += 20;
    doc.y = y;
  });
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
    
    // Check if we need a new page
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
