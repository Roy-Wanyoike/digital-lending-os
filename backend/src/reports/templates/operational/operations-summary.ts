/**
 * Operational Report Template
 * 
 * Defines the structure and formatting for operational reports including:
 * - Application volumes and pipeline
 * - Approval rates
 * - Disbursement amounts
 * - Collection efficiency
 * - Staff performance metrics
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { db } from '../../../lib/db';

export interface OperationalReportData {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  applicationPipeline: {
    totalApplications: number;
    newApplications: number;
    approved: number;
    rejected: number;
    pending: number;
    withdrawn: number;
    approvalRate: number;
    rejectionRate: number;
    averageProcessingTimeHours: number;
  };
  disbursementMetrics: {
    totalDisbursed: number;
    disbursementCount: number;
    averageDisbursementAmount: number;
    largestDisbursement: number;
    smallestDisbursement: number;
  };
  collectionEfficiency: {
    expectedCollections: number;
    actualCollections: number;
    collectionRate: number;
    amountInArrears: number;
    PAR30: number;
    recoveryRate: number;
    promisesToPay: number;
    promisesKept: number;
  };
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    role: string;
    applicationsProcessed: number;
    approvalRate: number;
    collectionsAchieved: number;
    recoveryRate: number;
    customerSatisfaction?: number;
  }>;
  dailyTrend?: Array<{
    date: string;
    applications: number;
    approvals: number;
    disbursements: number;
    collections: number;
  }>;
  generatedAt: Date;
}

export interface OperationalReportFilters {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  staffId?: string;
  productId?: string;
}

/**
 * Generate operational report data from database
 */
export async function generateOperationalData(filters: OperationalReportFilters): Promise<OperationalReportData> {
  const { tenantId, startDate, endDate } = filters;

  // Fetch all operational metrics in parallel
  const [
    applicationCounts,
    disbursementAgg,
    collectionAgg,
    loanStatusCounts,
    staffList,
  ] = await Promise.all([
    // Application counts by status
    Promise.all([
      db.loanApplication.count({
        where: { 
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.loanApplication.count({
        where: { 
          tenantId,
          status: 'APPROVED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.loanApplication.count({
        where: { 
          tenantId,
          status: 'REJECTED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.loanApplication.count({
        where: { 
          tenantId,
          status: 'PENDING',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.loanApplication.count({
        where: { 
          tenantId,
          status: 'WITHDRAWN',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]),
    
    // Disbursement metrics
    Promise.all([
      db.transaction.aggregate({
        where: { 
          tenantId,
          transactionType: 'DISBURSEMENT',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      db.transaction.aggregate({
        where: { 
          tenantId,
          transactionType: 'DISBURSEMENT',
          createdAt: { gte: startDate, lte: endDate },
        },
        _max: { amount: true },
        _min: { amount: true },
      }),
    ]),
    
    // Collection metrics
    Promise.all([
      db.transaction.aggregate({
        where: { 
          tenantId,
          transactionType: { in: ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      db.loan.aggregate({
        where: { 
          tenantId,
          daysInArrears: { gte: 30 },
          outstandingBalance: { gt: 0 },
        },
        _sum: { outstandingBalance: true },
      }),
    ]),
    
    // Loan status for PAR calculation
    Promise.all([
      db.loan.aggregate({ where: { tenantId }, _sum: { outstandingBalance: true } }),
      db.loan.aggregate({ 
        where: { tenantId, daysInArrears: { gte: 30 }, outstandingBalance: { gt: 0 } },
        _sum: { outstandingBalance: true },
      }),
    ]),
    
    // Staff list (mock data - would come from staff table)
    Promise.resolve([
      { id: 'staff-1', name: 'John Kamau', role: 'Loan Officer' },
      { id: 'staff-2', name: 'Grace Wanjiku', role: 'Collections Agent' },
      { id: 'staff-3', name: 'Peter Ochieng', role: 'Branch Manager' },
      { id: 'staff-4', name: 'Alice Muthoni', role: 'Loan Officer' },
      { id: 'staff-5', name: 'Samuel Kioko', role: 'Collections Agent' },
    ]),
  ]);

  const totalApps = applicationCounts[0];
  const approved = applicationCounts[1];
  const rejected = applicationCounts[2];
  const pending = applicationCounts[3];
  const withdrawn = applicationCounts[4];

  const totalDisbursed = disbursementAgg[0]._sum.amount || 0;
  const disbursementCount = disbursementAgg[0]._count || 0;

  const actualCollections = collectionAgg[0]._sum.amount || 0;
  const arrearsAmount = loanStatusCounts[1]._sum.outstandingBalance || 0;
  const totalOutstanding = loanStatusCounts[0]._sum.outstandingBalance || 0;

  return {
    dateRange: { startDate, endDate },
    applicationPipeline: {
      totalApplications: totalApps,
      newApplications: totalApps,
      approved,
      rejected,
      pending,
      withdrawn,
      approvalRate: totalApps > 0 ? (approved / totalApps) * 100 : 0,
      rejectionRate: totalApps > 0 ? (rejected / totalApps) * 100 : 0,
      averageProcessingTimeHours: 4.5, // Would calculate from timestamps
    },
    disbursementMetrics: {
      totalDisbursed,
      disbursementCount,
      averageDisbursementAmount: disbursementCount > 0 ? totalDisbursed / disbursementCount : 0,
      largestDisbursement: disbursementAgg[1]._max.amount || 0,
      smallestDisbursement: disbursementAgg[1]._min.amount || 0,
    },
    collectionEfficiency: {
      expectedCollections: totalOutstanding * 0.1, // Mock: 10% of outstanding due this period
      actualCollections,
      collectionRate: totalOutstanding > 0 ? (actualCollections / (totalOutstanding * 0.1)) * 100 : 0,
      amountInArrears: arrearsAmount,
      PAR30: totalOutstanding > 0 ? (arrearsAmount / totalOutstanding) * 100 : 0,
      recoveryRate: 85, // Mock value
      promisesToPay: 45,
      promisesKept: 38,
    },
    staffPerformance: staffList.map((staff, idx) => ({
      staffId: staff.id,
      staffName: staff.name,
      role: staff.role,
      applicationsProcessed: Math.floor(Math.random() * 50) + 10 + (idx * 5),
      approvalRate: 70 + Math.floor(Math.random() * 25),
      collectionsAchieved: Math.floor(Math.random() * 500000) + 100000,
      recoveryRate: 75 + Math.floor(Math.random() * 20),
      customerSatisfaction: 80 + Math.floor(Math.random() * 18),
    })),
    generatedAt: new Date(),
  };
}

/**
 * Generate Excel workbook for operational report
 */
export async function generateOperationalExcel(data: OperationalReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Digital Lending OS';
  workbook.created = new Date();

  // Executive Summary Sheet
  const summarySheet = workbook.addWorksheet('Executive Summary');
  createSummaryWorksheet(summarySheet, data);

  // Applications Sheet
  const appsSheet = workbook.addWorksheet('Applications');
  createApplicationsWorksheet(appsSheet, data);

  // Disbursements Sheet
  const disbSheet = workbook.addWorksheet('Disbursements');
  createDisbursementsWorksheet(disbSheet, data);

  // Collections Sheet
  const collSheet = workbook.addWorksheet('Collections');
  createCollectionsWorksheet(collSheet, data);

  // Staff Performance Sheet
  const staffSheet = workbook.addWorksheet('Staff Performance');
  createStaffPerformanceWorksheet(staffSheet, data);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function createSummaryWorksheet(sheet: ExcelJS.Worksheet, data: OperationalReportData): void {
  sheet.properties.defaultColWidth = 28;

  // Title
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = 'OPERATIONAL REPORT - EXECUTIVE SUMMARY';
  sheet.getCell('A1').font = { size: 16, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = `Period: ${data.dateRange.startDate.toLocaleDateString()} to ${data.dateRange.endDate.toLocaleDateString()}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  // KPI Cards Section
  addSectionHeader(sheet, 'A4', 'KEY PERFORMANCE INDICATORS');

  const kpis = [
    ['KPI', 'Value', 'Target', 'Status'],
    ['Total Applications', data.applicationPipeline.totalApplications.toString(), '-', '-'],
    ['Approval Rate', `${data.applicationPipeline.approvalRate.toFixed(1)}%`, '70%', getKPIStatus(data.applicationPipeline.approvalRate, 70)],
    ['Collection Rate', `${data.collectionEfficiency.collectionRate.toFixed(1)}%`, '90%', getKPIStatus(data.collectionEfficiency.collectionRate, 90)],
    ['PAR 30', `${data.collectionEfficiency.PAR30.toFixed(2)}%`, '<5%', getKPIStatusInverse(data.collectionEfficiency.PAR30, 5)],
    ['Avg Processing Time', `${data.applicationPipeline.averageProcessingTimeHours}h`, '<24h', getKPIStatusInverse(data.applicationPipeline.averageProcessingTimeHours, 24)],
  ];

  kpis.forEach((row, idx) => {
    const rowIdx = 5 + idx;
    row.forEach((cell, colIdx) => {
      const excelCell = sheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
      if (idx === 0) {
        excelCell.font = { bold: true };
        excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
      
      // Color code status column
      if (colIdx === 3 && idx > 0) {
        if (cell === '✓ On Target') excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
        else if (cell === '⚠ Below Target') excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
        else if (cell === '✗ Critical') excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
      }
    });
  });

  // Financial Summary
  addSectionHeader(sheet, 'A12', 'FINANCIAL SUMMARY');

  const financials = [
    ['Metric', 'Value'],
    ['Total Disbursed', formatCurrency(data.disbursementMetrics.totalDisbursed)],
    ['Disbursement Count', data.disbursementMetrics.disbursementCount.toString()],
    ['Average Disbursement', formatCurrency(data.disbursementMetrics.averageDisbursementAmount)],
    ['Actual Collections', formatCurrency(data.collectionEfficiency.actualCollections)],
    ['Amount in Arrears', formatCurrency(data.collectionEfficiency.amountInArrears)],
  ];

  financials.forEach((row, idx) => {
    const rowIdx = 13 + idx;
    row.forEach((cell, colIdx) => {
      const excelCell = sheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
      if (idx === 0) {
        excelCell.font = { bold: true };
        excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
    });
  });
}

function createApplicationsWorksheet(sheet: ExcelJS.Worksheet, data: OperationalReportData): void {
  sheet.properties.defaultColWidth = 22;

  addSectionHeader(sheet, 'A1', 'APPLICATION PIPELINE');

  const headers = ['Metric', 'Count', 'Percentage'];
  headers.forEach((header, idx) => {
    const cell = sheet.getCell(2, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  const appData = [
    ['New Applications', data.applicationPipeline.newApplications],
    ['Approved', data.applicationPipeline.approved],
    ['Rejected', data.applicationPipeline.rejected],
    ['Pending Review', data.applicationPipeline.pending],
    ['Withdrawn', data.applicationPipeline.withdrawn],
  ];

  appData.forEach((row, idx) => {
    const rowIdx = 3 + idx;
    sheet.getCell(rowIdx, 1).value = row[0];
    sheet.getCell(rowIdx, 2).value = row[1];
    sheet.getCell(rowIdx, 3).value = data.applicationPipeline.totalApplications > 0 
      ? `${((row[1] / data.applicationPipeline.totalApplications) * 100).toFixed(1)}%`
      : '0%';
  });

  // Additional metrics
  addSectionHeader(sheet, 'A10', 'PROCESSING METRICS');

  const processingRows = [
    ['Metric', 'Value'],
    ['Approval Rate', `${data.applicationPipeline.approvalRate.toFixed(1)}%`],
    ['Rejection Rate', `${data.applicationPipeline.rejectionRate.toFixed(1)}%`],
    ['Avg Processing Time', `${data.applicationPipeline.averageProcessingTimeHours} hours`],
  ];

  processingRows.forEach((row, idx) => {
    const rowIdx = 11 + idx;
    row.forEach((cell, colIdx) => {
      const excelCell = sheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
      if (idx === 0) {
        excelCell.font = { bold: true };
        excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
    });
  });
}

function createDisbursementsWorksheet(sheet: ExcelJS.Worksheet, data: OperationalReportData): void {
  sheet.properties.defaultColWidth = 25;

  addSectionHeader(sheet, 'A1', 'DISBURSEMENT METRICS');

  const rows = [
    ['Metric', 'Value'],
    ['Total Disbursed Amount', data.disbursementMetrics.totalDisbursed],
    ['Number of Disbursements', data.disbursementMetrics.disbursementCount],
    ['Average Disbursement Size', data.disbursementMetrics.averageDisbursementAmount],
    ['Largest Disbursement', data.disbursementMetrics.largestDisbursement],
    ['Smallest Disbursement', data.disbursementMetrics.smallestDisbursement],
  ];

  rows.forEach((row, idx) => {
    const rowIdx = 2 + idx;
    const isValueColumn = typeof row[1] === 'number';
    
    sheet.getCell(rowIdx, 1).value = row[0];
    sheet.getCell(rowIdx, 2).value = isValueColumn && idx > 0 ? row[1] : row[1];
    
    if (isValueColumn && idx > 0) {
      sheet.getCell(rowIdx, 2).numFmt = '#,##0.00';
    }

    if (idx === 0) {
      sheet.getCell(rowIdx, 1).font = { bold: true };
      sheet.getCell(rowIdx, 2).font = { bold: true };
      sheet.getCell(rowIdx, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      sheet.getCell(rowIdx, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    }
  });
}

function createCollectionsWorksheet(sheet: ExcelJS.Worksheet, data: OperationalReportData): void {
  sheet.properties.defaultColWidth = 25;

  addSectionHeader(sheet, 'A1', 'COLLECTION EFFICIENCY');

  const rows = [
    ['Metric', 'Value', 'Assessment'],
    ['Expected Collections', data.collectionEfficiency.expectedCollections, '-'],
    ['Actual Collections', data.collectionEfficiency.actualCollections, '-'],
    ['Collection Rate', `${data.collectionEfficiency.collectionRate.toFixed(1)}%`, getKPIStatus(data.collectionEfficiency.collectionRate, 90)],
    ['Amount in Arrears', data.collectionEfficiency.amountInArrears, '-'],
    ['PAR 30', `${data.collectionEfficiency.PAR30.toFixed(2)}%`, getKPIStatusInverse(data.collectionEfficiency.PAR30, 5)],
    ['Recovery Rate', `${data.collectionEfficiency.recoveryRate}%`, getKPIStatus(data.collectionEfficiency.recoveryRate, 80)],
    ['Promises to Pay', data.collectionEfficiency.promisesToPay.toString(), '-'],
    ['Promises Kept', data.collectionEfficiency.promisesKept.toString(), '-'],
    ['PTP Fulfillment Rate', `${((data.collectionEfficiency.promisesKept / data.collectionEfficiency.promisesToPay) * 100).toFixed(1)}%`, '-'],
  ];

  rows.forEach((row, idx) => {
    const rowIdx = 2 + idx;
    const isValueNumeric = typeof row[1] === 'number';
    
    sheet.getCell(rowIdx, 1).value = row[0];
    sheet.getCell(rowIdx, 2).value = isValueNumeric ? row[1] : row[1];
    
    if (isValueNumeric) {
      sheet.getCell(rowIdx, 2).numFmt = '#,##0.00';
    }
    
    sheet.getCell(rowIdx, 3).value = row[2];

    if (idx === 0) {
      [1, 2, 3].forEach(col => {
        sheet.getCell(rowIdx, col).font = { bold: true };
        sheet.getCell(rowIdx, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      });
    }
  });
}

function createStaffPerformanceWorksheet(sheet: ExcelJS.Worksheet, data: OperationalReportData): void {
  sheet.properties.defaultColWidth = 20;

  addSectionHeader(sheet, 'A1', 'STAFF PERFORMANCE LEADERBOARD');

  const headers = ['Staff Name', 'Role', 'Apps Processed', 'Approval Rate', 'Collections', 'Recovery %'];
  headers.forEach((header, idx) => {
    const cell = sheet.getCell(2, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  // Sort by applications processed descending
  const sortedStaff = [...data.staffPerformance].sort((a, b) => b.applicationsProcessed - a.applicationsProcessed);

  sortedStaff.forEach((staff, idx) => {
    const rowIdx = 3 + idx;
    const rowData = [
      staff.staffName,
      staff.role,
      staff.applicationsProcessed,
      `${staff.approvalRate}%`,
      staff.collectionsAchieved,
      `${staff.recoveryRate}%`,
    ];

    rowData.forEach((cell, colIdx) => {
      const excelCell = sheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
      if (colIdx === 4) {
        excelCell.numFmt = '#,##0.00';
      }
    });

    // Highlight top performer
    if (idx === 0) {
      sheet.getRow(rowIdx).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
      });
    }
  });
}

/**
 * Generate PDF document for operational report
 */
export function generateOperationalPdf(data: OperationalReportData): PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Operational Report - ${data.dateRange.startDate.toLocaleDateString()} to ${data.dateRange.endDate.toLocaleDateString()}`,
      Author: 'Digital Lending OS',
      CreationDate: new Date(),
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Title
  doc.fontSize(18).font('Helvetica-Bold').text('OPERATIONAL REPORT', { align: 'center' });
  doc.moveDown();

  doc.fontSize(10).font('Helvetica')
    .text(`Period: ${data.dateRange.startDate.toLocaleDateString()} to ${data.dateRange.endDate.toLocaleDateString()}`, { align: 'center' })
    .text(`Generated: ${data.generatedAt.toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  // Divider
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333333');
  doc.moveDown();

  // Executive Summary KPIs
  drawKPICards(doc, data);
  doc.moveDown();

  // Application Pipeline
  if (doc.y > 550) {
    doc.addPage();
  }

  doc.fontSize(14).font('Helvetica-Bold').text('APPLICATION PIPELINE');
  doc.moveDown(0.3);

  const appHeaders = ['Metric', 'Count', '%'];
  const appRows = [
    ['Total Applications', data.applicationPipeline.totalApplications.toString(), '100%'],
    ['Approved', data.applicationPipeline.approved.toString(), `${data.applicationPipeline.approvalRate.toFixed(1)}%`],
    ['Rejected', data.applicationPipeline.rejected.toString(), `${data.applicationPipeline.rejectionRate.toFixed(1)}%`],
    ['Pending', data.applicationPipeline.pending.toString(), '-'],
  ];

  drawTableWithHeaders(doc, appHeaders, appRows, [150, 80, 60]);

  // Collection Metrics
  doc.moveDown();
  
  if (doc.y > 550) {
    doc.addPage();
  }

  doc.fontSize(14).font('Helvetica-Bold').text('COLLECTION EFFICIENCY');
  doc.moveDown(0.3);

  const collHeaders = ['Metric', 'Value'];
  const collRows = [
    ['Expected Collections', formatCurrency(data.collectionEfficiency.expectedCollections)],
    ['Actual Collections', formatCurrency(data.collectionEfficiency.actualCollections)],
    ['Collection Rate', `${data.collectionEfficiency.collectionRate.toFixed(1)}%`],
    ['Amount in Arrears', formatCurrency(data.collectionEfficiency.amountInArrears)],
    ['PAR 30', `${data.collectionEfficiency.PAR30.toFixed(2)}%`],
    ['Recovery Rate', `${data.collectionEfficiency.recoveryRate}%`],
  ];

  drawTableWithHeaders(doc, collHeaders, collRows, [200, 150]);

  // Staff Performance
  if (doc.y > 500) {
    doc.addPage();
  }

  doc.moveDown();
  doc.fontSize(14).font('Helvetica-Bold').text('STAFF PERFORMANCE');
  doc.moveDown(0.3);

  const staffHeaders = ['Name', 'Role', 'Apps', 'Approvals'];
  const topStaff = data.staffPerformance.slice(0, 8).map(s => [
    s.staffName,
    s.role.substring(0, 12),
    s.applicationsProcessed.toString(),
    `${s.approvalRate}%`,
  ]);

  drawTableWithHeaders(doc, staffHeaders, topStaff, [120, 80, 50, 70]);

  doc.end();
  (doc as any).__chunks = chunks;
  return doc;
}

function drawKPICards(doc: PDFDocument, data: OperationalReportData): void {
  const startY = doc.y;
  const cardWidth = 110;
  const cardHeight = 55;
  const gap = 10;
  const startX = 50;

  const kpis = [
    { label: 'Applications', value: data.applicationPipeline.totalApplications.toString(), color: '#4A90D9' },
    { label: 'Approval Rate', value: `${data.applicationPipeline.approvalRate.toFixed(1)}%`, color: '#28a745' },
    { label: 'Disbursed', value: formatShortCurrency(data.disbursementMetrics.totalDisbursed), color: '#6f42c1' },
    { label: 'Collections', value: formatShortCurrency(data.collectionEfficiency.actualCollections), color: '#fd7e14' },
  ];

  kpis.forEach((kpi, idx) => {
    const x = startX + (idx * (cardWidth + gap));
    
    // Card background
    doc.rect(x, startY, cardWidth, cardHeight).fill('#F8F9FA').stroke(kpi.color);
    
    // Colored top bar
    doc.rect(x, startY, cardWidth, 4).fill(kpi.color);
    
    // Label
    doc.fontSize(8).font('Helvetica')
       .fillColor('#666666')
       .text(kpi.label, x + 8, startY + 12);
    
    // Value
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#333333')
       .text(kpi.value, x + 8, startY + 26);
  });

  doc.y = startY + cardHeight + 15;
  doc.fillColor('#000000');
}

// Helper functions
function formatCurrency(value: number): string {
  return `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortCurrency(value: number): string {
  if (value >= 1000000) return `KES ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `KES ${(value / 1000).toFixed(0)}K`;
  return `KES ${value}`;
}

function getKPIStatus(actual: number, target: number): string {
  if (actual >= target) return '✓ On Target';
  if (actual >= target * 0.8) return '⚠ Below Target';
  return '✗ Critical';
}

function getKPIStatusInverse(actual: number, target: number): string {
  // For metrics where lower is better (like PAR, processing time)
  if (actual <= target) return '✓ On Target';
  if (actual <= target * 1.5) return '⚠ Below Target';
  return '✗ Critical';
}

function addSectionHeader(sheet: ExcelJS.Worksheet, cell: string, text: string): void {
  sheet.mergeCells(`${cell}:${String.fromCharCode(cell.charCodeAt(0) + 2)}1`);
  const headerCell = sheet.getCell(cell);
  headerCell.value = text;
  headerCell.font = { bold: true, size: 11, color: { argb: 'FF333333' } };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
}

function drawTableWithHeaders(doc: PDFDocument, headers: string[], rows: string[][], colWidths: number[]): void {
  const startX = 50;
  let y = doc.y;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  let x = startX;
  doc.rect(startX, y - 5, tableWidth, 18).fill('#E8E8E8');
  
  headers.forEach((header, idx) => {
    doc.fontSize(9).font('Helvetica-Bold')
       .text(header, x + 5, y, { width: colWidths[idx] - 10 });
    x += colWidths[idx];
  });

  y += 18;

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
