/**
 * Route Configuration
 * 
 * Sets up all API routes for the Digital Lending OS backend.
 */

import { Router, Application } from 'express';
import { authenticate } from '../middleware/auth';

// Import route modules
import { authRoutes } from './auth.routes';
import { tenantRoutes } from './tenant.routes';
import { customerRoutes } from './customer.routes';
import { loanRoutes } from './loan.routes';
import { applicationRoutes } from './application.routes';
import { paymentRoutes } from './payment.routes';
import { collectionRoutes } from './collection.routes';
import { financeRoutes } from './finance.routes';
import { reportRoutes } from './report.routes';
import { creditRoutes } from './credit.routes';
import { providerRoutes } from './provider.routes';
import { dashboardRoutes } from './dashboard.routes';
import { staffRoutes } from './staff.routes';
import { webhookRoutes } from './webhook.routes';

export function setupRoutes(app: Application): void {
  // API version prefix
  const apiVersion = `v${process.env.API_VERSION || '1'}`;
  const apiRouter = Router();

  // ===========================================================================
  // PUBLIC ROUTES (No authentication required)
  // ===========================================================================
  
  // Health check is already defined in main app
  // API docs endpoint is already defined in main app

  // Auth routes (login, refresh - public endpoints)
  apiRouter.use('/auth', authRoutes);

  // Webhook callbacks (public - verified via signature)
  apiRouter.use('/webhooks', webhookRoutes);

  // ===========================================================================
  // PROTECTED ROUTES (Authentication required)
  // ===========================================================================

  // Apply authentication to all protected routes
  apiRouter.use(authenticate);

  // Tenant management
  apiRouter.use('/tenants', tenantRoutes);

  // Customer management
  apiRouter.use('/customers', customerRoutes);

  // Loan management
  apiRouter.use('/loans', loanRoutes);

  // Application management
  apiRouter.use('/applications', applicationRoutes);

  // Payment processing
  apiRouter.use('/payments', paymentRoutes);

  // Collections
  apiRouter.use('/collections', collectionRoutes);

  // Finance & Accounting
  apiRouter.use('/finance', financeRoutes);

  // Reports & Analytics
  apiRouter.use('/reports', reportRoutes);

  // Credit & Risk
  apiRouter.use('/credit', creditRoutes);

  // Provider monitoring
  apiRouter.use('/providers', providerRoutes);

  // Dashboard & Stats
  apiRouter.use('/dashboard', dashboardRoutes);

  // Staff management
  apiRouter.use('/staff', staffRoutes);

  // Mount all API routes under versioned path
  app.use(`/api/${apiVersion}`, apiRouter);
}
