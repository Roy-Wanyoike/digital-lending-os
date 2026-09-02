/**
 * Notification templates for key business events.
 * Each function returns a structured object with title, body, and category
 * ready to pass into `deliverNotification`.
 */

export interface NotificationTemplateResult {
  title: string;
  body: string;
  category: string;
}

export function paymentReceived(params: {
  amount: string | number;
  currency?: string;
}): NotificationTemplateResult {
  const currency = params.currency ?? 'USD';
  return {
    title: 'Payment Received',
    body: `Payment of ${params.amount} ${currency} received`,
    category: 'payment_received',
  };
}

export function escrowReleased(params: {
  amount: string | number;
  currency?: string;
}): NotificationTemplateResult {
  const currency = params.currency ?? 'USD';
  return {
    title: 'Escrow Released',
    body: `Escrow funds of ${params.amount} ${currency} released`,
    category: 'escrow_released',
  };
}

export function fraudAlert(params: {
  description: string;
}): NotificationTemplateResult {
  return {
    title: 'Fraud Alert',
    body: `Fraud alert: ${params.description}`,
    category: 'fraud_alert',
  };
}

export function invoiceOverdue(params: {
  ref: string;
  days: number;
}): NotificationTemplateResult {
  return {
    title: 'Invoice Overdue',
    body: `Invoice ${params.ref} is ${params.days} days overdue`,
    category: 'invoice_overdue',
  };
}

export function subscriptionRenewal(params: {
  plan: string;
}): NotificationTemplateResult {
  return {
    title: 'Subscription Renewed',
    body: `Your ${params.plan} subscription has been renewed`,
    category: 'subscription_renewal',
  };
}
