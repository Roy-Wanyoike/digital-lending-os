/**
 * CSV Export Utility for Digital Lending OS
 * Provides functionality to export data as downloadable CSV files
 */

export interface ExportHeader {
  key: string
  label: string
  transform?: (value: any) => string
}

interface ExportOptions {
  includeBOM?: boolean // Include UTF-8 BOM for Excel compatibility
  delimiter?: string
  includeHeaders?: boolean
}

/**
 * Convert data to CSV string
 */
function convertToCSV(
  data: any[],
  headers: ExportHeader[],
  options: ExportOptions = {}
): string {
  const {
    includeBOM = true,
    delimiter = ',',
    includeHeaders = true
  } = options

  const rows: string[] = []

  // Add BOM for Excel UTF-8 support
  if (includeBOM) {
    rows.push('\uFEFF')
  }

  // Add header row
  if (includeHeaders) {
    rows.push(headers.map(h => escapeCSVField(h.label)).join(delimiter))
  }

  // Add data rows
  for (const item of data) {
    const row = headers.map(header => {
      const value = getNestedValue(item, header.key)
      const transformedValue = header.transform ? header.transform(value) : value
      return escapeCSVField(transformedValue ?? '')
    })
    rows.push(row.join(delimiter))
  }

  return rows.join('\n')
}

/**
 * Escape a field value for CSV (handle commas, quotes, newlines)
 */
function escapeCSVField(value: any): string {
  const stringValue = String(value ?? '')
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Get nested object value using dot notation (e.g., "customer.name")
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

/**
 * Trigger download of a file
 */
function triggerDownload(content: string, filename: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export data to CSV file and trigger download
 * 
 * @param data - Array of objects to export
 * @param filename - Name of the downloaded file (will have .csv appended if not present)
 * @param headers - Array of header definitions with key and label
 * @param options - Optional export configuration
 * 
 * @example
 * ```typescript
 * exportToCSV(
 *   customers,
 *   'customers-export',
 *   [
 *     { key: 'name', label: 'Customer Name' },
 *     { key: 'phone', label: 'Phone Number' },
 *     { key: 'balance', label: 'Outstanding Balance', transform: (v) => `KSh ${v.toLocaleString()}` }
 *   ]
 * )
 * ```
 */
export function exportToCSV(
  data: any[],
  filename: string,
  headers: ExportHeader[],
  options?: ExportOptions
): void {
  // Ensure filename has .csv extension
  const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`
  
  const csvContent = convertToCSV(data, headers, options)
  triggerDownload(csvContent, finalFilename)
}

/**
 * Predefined export configurations for common Digital Lending OS entities
 */

// Customer export headers
export const customerExportHeaders: ExportHeader[] = [
  { key: 'id', label: 'Customer ID' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'email', label: 'Email' },
  { key: 'nationalId', label: 'National ID' },
  { key: 'county', label: 'County' },
  { key: 'employmentStatus', label: 'Employment Status' },
  { key: 'employerName', label: 'Employer' },
  { key: 'creditScore', label: 'Credit Score' },
  { key: 'crbStatus', label: 'CRB Status' },
  { key: 'riskLevel', label: 'Risk Level' },
  { key: 'status', label: 'Status' },
  { key: 'totalBorrowed', label: 'Total Borrowed', transform: (v) => v?.toLocaleString() || '0' },
  { key: 'totalRepaid', label: 'Total Repaid', transform: (v) => v?.toLocaleString() || '0' },
  { key: 'outstandingBalance', label: 'Outstanding Balance', transform: (v) => v?.toLocaleString() || '0' },
  { key: 'createdAt', label: 'Created Date', transform: (v) => v ? new Date(v).toLocaleDateString() : '' },
]

// Loan export headers
export const loanExportHeaders: ExportHeader[] = [
  { key: 'loanNumber', label: 'Loan Number' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'phone', label: 'Customer Phone' },
  { key: 'product', label: 'Product' },
  { key: 'principal', label: 'Principal Amount', transform: (v) => v?.toLocaleString() || '0' },
  { key: 'approvedAmount', label: 'Approved Amount', transform: (v) => v?.toLocaleString() || '0' },
  { key: 'interestRate', label: 'Interest Rate (%)', transform: (v) => `${v}%` },
  { key: 'totalRepayable', label: 'Total Repayable', transform: (v) => v?.toLocaleString() || '0' },
  { key: 'totalRepaid', label: 'Total Repaid', transform: (v) => v?.toLocaleString() || '0' },
  { key: 'outstandingBalance', label: 'Outstanding Balance', transform: (v) => v?.toLocaleString() || '0' },
  { key: 'termDays', label: 'Term (Days)' },
  { key: 'disbursementDate', label: 'Disbursement Date', transform: (v) => v ? new Date(v).toLocaleDateString() : '' },
  { key: 'maturityDate', label: 'Maturity Date', transform: (v) => v ? new Date(v).toLocaleDateString() : '' },
  { key: 'status', label: 'Status' },
  { key: 'arrearsStatus', label: 'Arrears Status' },
  { key: 'daysInArrears', label: 'Days in Arrears' },
]

// Application export headers
export const applicationExportHeaders: ExportHeader[] = [
  { key: 'id', label: 'Application ID' },
  { key: 'applicantName', label: 'Applicant Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'product', label: 'Product' },
  { key: 'requestedAmount', label: 'Requested Amount', transform: (v) => v?.toLocaleString() || '0' },
  { key: 'approvedAmount', label: 'Approved Amount', transform: (v) => v?.toLocaleString() || '-' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'status', label: 'Status' },
  { key: 'riskScore', label: 'Risk Score' },
  { key: 'submittedAt', label: 'Submitted At', transform: (v) => v ? new Date(v).toLocaleDateString() : '' },
  { key: 'createdAt', label: 'Created At', transform: (v) => v ? new Date(v).toLocaleDateString() : '' },
]

/**
 * Quick export functions for common use cases
 */

export function exportCustomers(customers: any[], filename: string = 'customers'): void {
  exportToCSV(customers, filename, customerExportHeaders)
}

export function exportLoans(loans: any[], filename: string = 'loans'): void {
  exportToCSV(loans, filename, loanExportHeaders)
}

export function exportApplications(applications: any[], filename: string = 'applications'): void {
  exportToCSV(applications, filename, applicationExportHeaders)
}
