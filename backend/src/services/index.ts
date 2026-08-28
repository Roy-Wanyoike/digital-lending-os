/**
 * Services Index
 * 
 * Central export point for all service singletons.
 */

export { authService } from './auth.service';
export { tenantService } from './tenant.service';
export { customerService } from './customer.service';
export { loanService } from './loan.service';
export { applicationService } from './application.service';
export { paymentService } from './payment.service';
export { collectionService } from './collection.service';
export { financeService } from './finance.service';
export { creditService } from './credit.service';
export { providerService } from './provider.service';
export { reportService } from './report.service';
export { notificationService } from './notification.service';

// Re-export types
export type { AuthService } from './auth.service';
export type { TenantService } from './tenant.service';
export type { CustomerService } from './customer.service';
export type { LoanService } from './loan.service';
export type { ApplicationService } from './application.service';
export type { PaymentService } from './payment.service';
export type { CollectionService } from './collection.service';
export type { FinanceService } from './finance.service';
export type { CreditService } from './credit.service';
export type { ProviderService } from './provider.service';
export type { ReportService } from './report.service';
export type { NotificationService } from './notification.service';
