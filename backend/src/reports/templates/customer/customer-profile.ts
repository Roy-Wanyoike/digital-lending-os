/**
 * Customer Report Template
 * 
 * Defines the structure and formatting for customer reports including:
 * - Full customer profile
 * - Loan history
 * - Payment history
 * - Credit score changes
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { db } from '../../../lib/db';

export interface CustomerReportData {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth?: Date;
    nationalId?: string;
    county?: string;
    riskLevel: string;
    customerSince: Date;
    totalLoans: number;
    activeLoans: number;
  };
  loanHistory: Array<{
    id: string;
    productId: string;
    productName: string;
    principal: number;
    interestRate: number;
    termMonths: number;
    status: string;
    disbursementDate: Date;
    outstandingBalance: number;
    daysInArrears: number;
  }>;
  paymentHistory: Array<{
    id: string;
    loanId: string;
    amount: number;
    paymentDate: Date;
    paymentType: string;
    method: string;
  }>;
  creditScoreHistory: Array<{
    date: Date;
    score: number;
    rating: string;
    factors?: string[];
  }>;
  summary: {
    totalBorrowed: number;
    totalRepaid: number;
    currentOutstanding: number;
    onTimePaymentRate: number;
    averageLoanAmount: number;
  };
  generatedAt: Date;
}

export interface CustomerReportFilters {
  customerId: string;
  tenantId: string;
  includeTransactions?: boolean;
}

/**
 * Generate customer report data from database
 */
export async function generateCustomerData(filters: CustomerReportFilters): Promise<CustomerReportData> {
  const { customerId, tenantId } = filters;

  // Fetch all customer data in parallel
  const [
    customer,
    loans,
    payments,
    creditScores,
  ] = await Promise.all([
    db.customer.findUnique({
      where: { id: customerId },
      include: {
        _count: { select: { loans: true } },
      },
    }),
    db.loan.findMany({
      where: { customerId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.payment.findMany({
      where: { 
        loan: { customerId, tenantId }
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    }),
    // Credit score history (mock - would come from credit assessment table)
    Promise.resolve(generateMockCreditHistory()),
  ]);

  if (!customer) {
    throw new Error('Customer not found');
  }

  const activeLoans = loans.filter(l => l.status === 'ACTIVE').length;
  const totalBorrowed = loans.reduce((sum, l) => sum + (l.principal || 0), 0);
  const totalOutstanding = loans
    .filter(l => ['ACTIVE', 'IN_ARREARS'].includes(l.status))
    .reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);
  
  // Calculate on-time payment rate (simplified)
  const onTimePayments = payments.filter(p => !p.isLate).length;
  const onTimePaymentRate = payments.length > 0 ? (onTimePayments / payments.length) * 100 : 100;

  return {
    profile: {
      id: customer.id,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phoneNumber || '',
      dateOfBirth: customer.dateOfBirth || undefined,
      nationalId: customer.nationalId || undefined,
      county: (customer as any).county || undefined,
      riskLevel: customer.riskLevel || 'UNKNOWN',
      customerSince: customer.createdAt,
      totalLoans: loans.length,
      activeLoans,
    },
    loanHistory: loans.map(loan => ({
      id: loan.id,
      productId: loan.productId,
      productName: `Product ${loan.productId}`,
      principal: loan.principal || 0,
      interestRate: loan.interestRate || 0,
      termMonths: loan.termMonths || 0,
      status: loan.status,
      disbursementDate: loan.disbursementDate || loan.createdAt,
      outstandingBalance: loan.outstandingBalance || 0,
      daysInArrears: loan.daysInArrears || 0,
    })),
    paymentHistory: payments.map(payment => ({
      id: payment.id,
      loanId: payment.loanId,
      amount: payment.amount,
      paymentDate: payment.paymentDate || payment.createdAt,
      paymentType: payment.paymentType,
      method: payment.paymentMethod || 'M-PESA',
    })),
    creditScoreHistory: creditScores,
    summary: {
      totalBorrowed,
      totalRepaid: totalBorrowed - totalOutstanding,
      currentOutstanding: totalOutstanding,
      onTimePaymentRate,
      averageLoanAmount: loans.length > 0 ? totalBorrowed / loans.length : 0,
    },
    generatedAt: new Date(),
  };
}

function generateMockCreditHistory(): Array<{
  date: Date;
  score: number;
  rating: string;
  factors?: string[];
}> {
  const now = new Date();
  return [
    { date: now, score: 720, rating: 'Good', factors: ['Consistent repayments', 'Low utilization'] },
    { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), score: 705, rating: 'Good', factors: ['On-time payments'] },
    { date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), score: 690, rating: 'Fair', factors: ['Building history'] },
    { date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), score: 680, rating: 'Fair', factors: ['New customer'] },
    { date: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), score: 650, rating: 'Fair', factors: ['Initial assessment'] },
  ];
}

/**
 * Generate Excel workbook for customer report
 */
export async function generateCustomerExcel(data: CustomerReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Digital Lending OS';
  workbook.created = new Date();

  // Profile Sheet
  const profileSheet = workbook.addWorksheet('Profile');
  createProfileWorksheet(profileSheet, data);

  // Loan History Sheet
  const loansSheet = workbook.addWorksheet('Loan History');
  createLoanHistoryWorksheet(loansSheet, data);

  // Payment History Sheet
  const paymentsSheet = workbook.addWorksheet('Payment History');
  createPaymentHistoryWorksheet(paymentsSheet, data);

  // Credit Score Sheet
  const creditSheet = workbook.addWorksheet('Credit Score');
  createCreditScoreWorksheet(creditSheet, data);

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  createSummaryWorksheet(summarySheet, data);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function createProfileWorksheet(sheet: ExcelJS.Worksheet, data: CustomerReportData): void {
  sheet.properties.defaultColWidth = 25;

  // Title
  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'CUSTOMER PROFILE REPORT';
  sheet.getCell('A1').font = { size: 16, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:C2');
  sheet.getCell('A2').value = `Generated: ${data.generatedAt.toLocaleString()}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  // Personal Information Section
  addSectionHeader(sheet, 'A4', 'PERSONAL INFORMATION');

  const personalInfo = [
    ['Field', 'Value'],
    ['Full Name', `${data.profile.firstName} ${data.profile.lastName}`],
    ['Email', data.profile.email],
    ['Phone', data.profile.phone],
    ['National ID', data.profile.nationalId || '-'],
    ['Date of Birth', data.profile.dateOfBirth?.toLocaleDateString() || '-'],
    ['County', data.profile.county || '-'],
    ['Risk Level', data.profile.riskLevel],
    ['Customer Since', data.profile.customerSince.toLocaleDateString()],
  ];

  personalInfo.forEach((row, idx) => {
    const rowIdx = 5 + idx;
    row.forEach((cell, colIdx) => {
      const excelCell = sheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
      if (idx === 0) {
        excelCell.font = { bold: true };
        excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
    });
  });

  // Account Summary Section
  addSectionHeader(sheet, 'A16', 'ACCOUNT SUMMARY');

  const accountInfo = [
    ['Metric', 'Value'],
    ['Total Loans', data.profile.totalLoans],
    ['Active Loans', data.profile.activeLoans],
    ['Total Borrowed', formatCurrency(data.summary.totalBorrowed)],
    ['Current Outstanding', formatCurrency(data.summary.currentOutstanding)],
    ['On-Time Payment Rate', `${data.summary.onTimePaymentRate.toFixed(1)}%`],
  ];

  accountInfo.forEach((row, idx) => {
    const rowIdx = 17 + idx;
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

function createLoanHistoryWorksheet(sheet: ExcelJS.Worksheet, data: CustomerReportData): void {
  sheet.properties.defaultColWidth = 18;

  addSectionHeader(sheet, 'A1', 'LOAN HISTORY');

  const headers = ['Loan ID', 'Product', 'Principal', 'Interest %', 'Term', 'Status', 'Disbursed', 'Outstanding', 'Days Arrears'];
  headers.forEach((header, idx) => {
    const cell = sheet.getCell(2, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  data.loanHistory.forEach((loan, idx) => {
    const rowIdx = 3 + idx;
    const rowData = [
      loan.id.substring(0, 8) + '...',
      loan.productName,
      loan.principal,
      `${loan.interestRate}%`,
      `${loan.termMonths}mo`,
      loan.status,
      loan.disbursementDate.toLocaleDateString(),
      loan.outstandingBalance,
      loan.daysInArrears,
    ];

    rowData.forEach((cell, colIdx) => {
      const excelCell = sheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
      if ([2, 7].includes(colIdx)) {
        excelCell.numFmt = '#,##0.00';
      }
      
      // Color code by status
      if (colIdx === 5) {
        if (cell === 'ACTIVE') excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
        else if (cell === 'IN_ARREARS') excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
        else if (cell === 'COMPLETED') excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1E7DD' } };
      }
    });
  });
}

function createPaymentHistoryWorksheet(sheet: ExcelJS.Worksheet, data: CustomerReportData): void {
  sheet.properties.defaultColWidth = 20;

  addSectionHeader(sheet, 'A1', 'PAYMENT HISTORY');

  const headers = ['Payment ID', 'Loan ID', 'Amount', 'Date', 'Type', 'Method'];
  headers.forEach((header, idx) => {
    const cell = sheet.getCell(2, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  data.paymentHistory.slice(0, 50).forEach((payment, idx) => {
    const rowIdx = 3 + idx;
    const rowData = [
      payment.id.substring(0, 8) + '...',
      payment.loanId.substring(0, 8) + '...',
      payment.amount,
      payment.paymentDate.toLocaleDateString(),
      payment.paymentType,
      payment.method,
    ];

    rowData.forEach((cell, colIdx) => {
      const excelCell = sheet.getCell(rowIdx, colIdx + 1);
      excelCell.value = cell;
      if (colIdx === 2) {
        excelCell.numFmt = '#,##0.00';
      }
    });
  });
}

function createCreditScoreWorksheet(sheet: ExcelJS.Worksheet, data: CustomerReportData): void {
  sheet.properties.defaultColWidth = 22;

  addSectionHeader(sheet, 'A1', 'CREDIT SCORE HISTORY');

  const headers = ['Date', 'Score', 'Rating', 'Key Factors'];
  headers.forEach((header, idx) => {
    const cell = sheet.getCell(2, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  data.creditScoreHistory.forEach((entry, idx) => {
    const rowIdx = 3 + idx;
    sheet.getCell(rowIdx, 1).value = entry.date.toLocaleDateString();
    sheet.getCell(rowIdx, 2).value = entry.score;
    
    // Color code by score
    const scoreCell = sheet.getCell(rowIdx, 2);
    if (entry.score >= 750) scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
    else if (entry.score >= 650) scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
    else scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
    
    sheet.getCell(rowIdx, 3).value = entry.rating;
    sheet.getCell(rowIdx, 4).value = entry.factors?.join(', ') || '-';
  });
}

function createSummaryWorksheet(sheet: ExcelJS.Worksheet, data: CustomerReportData): void {
  sheet.properties.defaultColWidth = 25;

  addSectionHeader(sheet, 'A1', 'CUSTOMER SUMMARY');

  const summaryRows = [
    ['Metric', 'Value'],
    ['Total Amount Borrowed', formatCurrency(data.summary.totalBorrowed)],
    ['Total Amount Repaid', formatCurrency(data.summary.totalRepaid)],
    ['Current Outstanding Balance', formatCurrency(data.summary.currentOutstanding)],
    ['Average Loan Amount', formatCurrency(data.summary.averageLoanAmount)],
    ['On-Time Payment Rate', `${data.summary.onTimePaymentRate.toFixed(1)}%`],
    ['Number of Loans', data.profile.totalLoans.toString()],
    ['Active Loans', data.profile.activeLoans.toString()],
    ['Risk Level', data.profile.riskLevel],
  ];

  summaryRows.forEach((row, idx) => {
    const rowIdx = 2 + idx;
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

/**
 * Generate PDF document for customer report
 */
export function generateCustomerPdf(data: CustomerReportData): PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Customer Report - ${data.profile.firstName} ${data.profile.lastName}`,
      Author: 'Digital Lending OS',
      CreationDate: new Date(),
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Title
  doc.fontSize(18).font('Helvetica-Bold').text('CUSTOMER PROFILE REPORT', { align: 'center' });
  doc.moveDown();

  doc.fontSize(11).font('Helvetica')
    .text(`Generated: ${data.generatedAt.toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  // Divider
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333333');
  doc.moveDown();

  // Customer Name Header
  doc.fontSize(14).font('Helvetica-Bold')
    .text(`${data.profile.firstName} ${data.profile.lastName}`, { align: 'center' })
    .fontSize(10).font('Helvetica')
    .text(`ID: ${data.profile.id}`, { align: 'center' })
    .fillColor(getRiskColor(data.profile.riskLevel))
    .text(`Risk Level: ${data.profile.riskLevel}`, { align: 'center' });
  doc.fillColor('#000000');
  doc.moveDown();

  // Profile Information
  doc.fontSize(12).font('Helvetica-Bold').text('PERSONAL INFORMATION');
  doc.moveDown(0.3);

  const profileFields = [
    ['Email', data.profile.email],
    ['Phone', data.profile.phone],
    ['National ID', data.profile.nationalId || '-'],
    ['County', data.profile.county || '-'],
    ['Customer Since', data.profile.customerSince.toLocaleDateString()],
  ];

  profileFields.forEach(([label, value]) => {
    doc.fontSize(9).font('Helvetica-Bold').text(`${label}:`, 60, doc.y, { continued: true })
       .font('Helvetica').text(` ${value}`);
    doc.moveDown(0.2);
  });

  doc.moveDown();

  // Account Summary Box
  drawSummaryBox(doc, data);

  // New page for loan history
  doc.addPage();
  doc.fontSize(12).font('Helvetica-Bold').text('LOAN HISTORY');
  doc.moveDown(0.3);

  const loanHeaders = ['Principal', 'Status', 'Disbursed', 'Outstanding'];
  const loanRows = data.loanHistory.slice(0, 15).map(loan => [
    formatCurrency(loan.principal),
    loan.status,
    loan.disbursementDate.toLocaleDateString(),
    formatCurrency(loan.outstandingBalance),
  ]);

  drawTableWithHeaders(doc, loanHeaders, loanRows, [100, 80, 100, 100]);

  // Credit Score section
  if (doc.y > 600) {
    doc.addPage();
  }

  doc.moveDown();
  doc.fontSize(12).font('Helvetica-Bold').text('CREDIT SCORE HISTORY');
  doc.moveDown(0.3);

  const creditHeaders = ['Date', 'Score', 'Rating'];
  const creditRows = data.creditScoreHistory.map(entry => [
    entry.date.toLocaleDateString(),
    entry.score.toString(),
    entry.rating,
  ]);

  drawTableWithHeaders(doc, creditHeaders, creditRows, [100, 60, 80]);

  doc.end();
  (doc as any).__chunks = chunks;
  return doc;
}

function drawSummaryBox(doc: PDFDocument, data: CustomerReportData): void {
  const startY = doc.y;
  
  doc.rect(50, startY, 495, 90).fill('#F8F9FA').stroke('#DEE2E6');
  
  let y = startY + 10;
  const colWidth = 120;
  const startX = 65;

  const metrics = [
    ['Total Borrowed', formatCurrency(data.summary.totalBorrowed)],
    ['Current Outstanding', formatCurrency(data.summary.currentOutstanding)],
    ['On-Time Payment', `${data.summary.onTimePaymentRate.toFixed(1)}%`],
    ['Avg Loan Amount', formatCurrency(data.summary.averageLoanAmount)],
    ['Total Loans', data.profile.totalLoans.toString()],
    ['Active Loans', data.profile.activeLoans.toString()],
  ];

  metrics.forEach(([label, value], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = startX + (col * (colWidth + 30));
    y = startY + 10 + (row * 26);

    doc.fontSize(8).font('Helvetica-Bold')
       .text(label, x, y)
       .fontSize(11).font('Helvetica')
       .text(value, x, y + 12);
  });

  doc.y = startY + 100;
}

function getRiskColor(riskLevel: string): string {
  switch (riskLevel.toUpperCase()) {
    case 'LOW': return '#28a745';
    case 'MEDIUM': return '#ffc107';
    case 'HIGH': return '#fd7e14';
    case 'VERY_HIGH':
    case 'CRITICAL': return '#dc3545';
    default: return '#6c757d';
  }
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
