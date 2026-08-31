/**
 * Controllers Index
 * 
 * Central export point for all controller singletons.
 */

export { authController } from './auth.controller';
export { tenantController } from './tenant.controller';
export { customerController } from './customer.controller';
export { loanController } from './loan.controller';
export { applicationController } from './application.controller';
export { paymentController } from './payment.controller';
export { collectionController } from './collection.controller';
export { financeController } from './finance.controller';
export { creditController } from './credit.controller';
export { providerController } from './provider.controller';
export { reportController } from './report.controller';
export { dashboardController } from './dashboard.controller';
export { staffController } from './staff.controller';
export { webhookController } from './webhook.controller';
export { notificationController } from './notification.controller';

// Re-export types
export type { AuthController } from './auth.controller';
export type { TenantController } from './tenant.controller';
export type { CustomerController } from './customer.controller';
export type { LoanController } from './loan.controller';
export type { ApplicationController } from './application.controller';
export type { PaymentController } from './payment.controller';
export type { CollectionController } from './collection.controller';
export type { FinanceController } from './finance.controller';
export type { CreditController } from './credit.controller';
export type { ProviderController } from './provider.controller';
export type { ReportController } from './report.controller';
export type { DashboardController } from './dashboard.controller';
export type { StaffController } from './staff.controller';
export type { WebhookController } from './webhook.controller';
export type { NotificationController } from './notification.controller';
