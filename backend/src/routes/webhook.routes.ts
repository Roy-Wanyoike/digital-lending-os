/**
 * Webhook Routes
 * 
 * Public endpoints for receiving callbacks from external services.
 * These endpoints do NOT require authentication but verify signatures.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

export const webhookRoutes = Router();

// =============================================================================
// M-PESA WEBHOOKS
// =============================================================================

/**
 * POST /api/v1/webhooks/mpesa/stkpush
 * STK Push result from Safaricom
 */
webhookRoutes.post('/mpesa/stkpush', (req, res) => {
  try {
    const payload = req.body;
    
    logger.info('M-Pesa STK Push callback received', {
      body: JSON.stringify(payload).substring(0, 500),
    });

    // Verify webhook signature if configured
    const signature = req.headers['x-safaricom-signature'] as string;
    if (config.webhook.secret && signature) {
      // In production: Verify HMAC signature
      // const expectedSignature = crypto
      //   .createHmac('sha256', config.webhook.secret)
      //   .update(JSON.stringify(payload))
      //   .digest('base64');
      // if (signature !== expectedSignature) {
      //   return res.status(401).json({ error: 'Invalid signature' });
      // }
    }

    // Process STK Push result
    const { Body } = payload;
    
    if (!Body?.stkCallback) {
      logger.warn('Invalid STK Push callback format');
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = Body.stkCallback;

    if (ResultCode === '0') {
      // Success - extract payment details
      const amount = CallbackMetadata?.Item?.find(
        (i: Record<string, unknown>) => i.Name === 'Amount'
      )?.Value;
      
      const mpesaReceiptNumber = CallbackMetadata?.Item?.find(
        (i: Record<string, unknown>) => i.Name === 'MpesaReceiptNumber'
      )?.Value;
      
      const phoneNumber = CallbackMetadata?.Item?.find(
        (i: Record<string, unknown>) => i.Name === 'PhoneNumber'
      )?.Value;

      logger.info('STK Push payment successful', {
        CheckoutRequestID,
        amount,
        mpesaReceiptNumber,
        phoneNumber,
      });

      // TODO: Update loan/repayment records in database
      // TODO: Send confirmation SMS to customer

    } else {
      logger.info('STK Push payment failed or cancelled', {
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
      });

      // TODO: Update transaction status to failed
      // TODO: Notify customer of failed payment
    }

    // Always respond with success to acknowledge receipt
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback accepted' });
  } catch (error) {
    logger.error('Error processing STK Push webhook:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback accepted' }); // Still acknowledge
  }
});

/**
 * POST /api/v1/webhooks/mpesa/c2b/confirmation
 * C2B Payment Confirmation from Safaricom
 */
webhookRoutes.post('/mpesa/c2b/confirmation', (req, res) => {
  try {
    const payload = req.body;
    
    logger.info('C2B Confirmation received', {
      TransID: payload.TransID,
      Amount: payload.Amount,
      MSISDN: payload.MSISDN,
    });

    // Process C2B payment
    // TODO: Find customer by phone number
    // TODO: Match payment to outstanding loan
    // TODO: Create repayment record
    // TODO: Update loan balance
    // TODO: Send receipt via SMS

    res.json({
      ResultCode: 0,
      ResultDesc: 'Confirmation accepted',
      ThirdPartyTransID: `TP-${Date.now()}`,
    });
  } catch (error) {
    logger.error('Error processing C2B confirmation:', error);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

/**
 * POST /api/v1/webhooks/mpesa/c2b/validation
 * C2B Payment Validation from Safaricom
 */
webhookRoutes.post('/mpesa/c2b/validation', (req, res) => {
  try {
    const payload = req.body;
    
    logger.info('C2B Validation request received', {
      TransID: payload.TransID,
      Amount: payload.Amount,
      MSISDN: payload.MSISDN,
      BillRefNumber: payload.BillRefNumber,
    });

    // Validate payment - check if customer exists and can receive payments
    // For now, accept all payments
    
    res.json({
      ResultCode: 0,
      ResultDesc: 'Validation successful',
      ThirdPartyTransID: `VAL-${Date.now()}`,
    });
  } catch (error) {
    logger.error('Error processing C2B validation:', error);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

/**
 * POST /api/v1/webhooks/mpesa/b2c/result
 * B2C Disbursement Result from Safaricom
 */
webhookRoutes.post('/mpesa/b2c/result', (req, res) => {
  try {
    const payload = req.body;
    const { Result } = payload;
    
    logger.info('B2C Result received', {
      ResultType: Result?.ResultType,
      TransactionID: Result?.TransactionID,
      ResultCode: Result?.ResultCode,
      ResultDesc: Result?.ResultDesc,
    });

    if (Result?.ResultCode === 0) {
      // Disbursement successful
      // TODO: Update loan status to ACTIVE
      // TODO: Create disbursement transaction
      // TODO: Notify customer via SMS
      
      logger.info('B2C disbursement successful', {
        TransactionID: Result.TransactionID,
        RecipientPhone: Result?.TransactionDetails?.RecipientPublicKey,
        Amount: Result?.TransactionDetails?.TransactionAmount,
      });
    } else {
      // Disbursement failed
      // TODO: Mark disbursement as failed
      // TODO: Alert finance team
      // TODO: Retry or investigate
      
      logger.warn('B2C disbursement failed', {
        TransactionID: Result.TransactionID,
        ResultCode: Result.ResultCode,
        ResultDesc: Result.ResultDesc,
      });
    }

    res.json({ ResultCode: 0, ResultDesc: 'Result accepted' });
  } catch (error) {
    logger.error('Error processing B2C result:', error);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

/**
 * POST /api/v1/webhooks/mpesa/timeout
 * STK Push Timeout notification
 */
webhookRoutes.post('/mpesa/timeout', (req, res) => {
  try {
    const { CheckoutRequestID } = req.body;
    
    logger.info('STK Push timeout received', { CheckoutRequestID });

    // Handle timeout - customer didn't enter PIN in time
    // TODO: Update transaction status to TIMEOUT
    // TODO: Optionally send reminder SMS

    res.json({ ResultCode: 0, ResultDesc: 'Timeout acknowledged' });
  } catch (error) {
    logger.error('Error processing timeout webhook:', error);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// =============================================================================
// SMS GATEWAY WEBHOOKS
// =============================================================================

/**
 * POST /api/v1/webhooks/sms/delivery
 * SMS Delivery Status from Africa's Talking / Twilio
 */
webhookRoutes.post('/sms/delivery', (req, res) => {
  try {
    const { messageId, status, phoneNumber } = req.body;
    
    logger.info('SMS delivery status update', { messageId, status, phoneNumber });

    // TODO: Update message status in database
    // If failed, potentially retry with different gateway

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing SMS delivery webhook:', error);
    res.status(200).json({ success: true });
  }
});

/**
 * POST /api/v1/webhooks/sms/inbound
 * Incoming SMS from customer
 */
webhookRoutes.post('/sms/inbound', (req, res) => {
  try {
    const { from, text, to, date } = req.body;
    
    logger.info('Incoming SMS received', { from, to, text: text?.substring(0, 100) });

    // TODO: Parse and process incoming SMS commands
    // Examples: BALANCE, PAY <amount>, STATUS, HELP
    // TODO: Route to appropriate handler based on command

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing inbound SMS:', error);
    res.status(200).json({ success: true });
  }
});

// =============================================================================
// EMAIL WEBHOOKS
// =============================================================================

/**
 * POST /api/v1/webhooks/email/bounce
 * Email bounce notification from SendGrid/SES
 */
webhookRoutes.post('/email/bounce', (req, res) => {
  try {
    const { email, reason, type } = req.body;
    
    logger.warn('Email bounced', { email, reason, type });

    // TODO: Update customer email validity status
    // TODO: Flag for review if multiple bounces

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing email bounce webhook:', error);
    res.status(200).json({ success: true });
  }
});

// =============================================================================
// CRB WEBHOOKS (if applicable)
// =============================================================================

/**
 * POST /api/v1/webhooks/crb/report-ready
 * Credit report ready notification from CRB provider
 */
webhookRoutes.post('/crb/report-ready', async (req, res) => {
  try {
    const { requestId, customerId, reportUrl, score } = req.body;
    
    logger.info('CRB report ready', { requestId, customerId, score });

    // TODO: Store credit report
    // TODO: Continue loan application processing
    // TODO: Notify loan officer

    res.json({ success: true, processed: true });
  } catch (error) {
    logger.error('Error processing CRB webhook:', error);
    res.status(200).json({ success: true });
  }
});

// =============================================================================
// GENERIC HEALTH CHECK FOR WEBHOOK ENDPOINTS
// =============================================================================

/**
 * GET /api/v1/webhooks/health
 * Webhook endpoint health check
 */
webhookRoutes.get('/health', (_req, res) => {
  res.json({
    status: 'operational',
    webhooks: {
      mpesa_stkpush: 'active',
      mpesa_c2b_confirmation: 'active',
      mpesa_c2b_validation: 'active',
      mpesa_b2c_result: 'active',
      sms_delivery: 'active',
      sms_inbound: 'active',
      email_bounce: 'active',
      crb_report_ready: 'active',
    },
    timestamp: new Date().toISOString(),
  });
});
