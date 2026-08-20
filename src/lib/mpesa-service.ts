/**
 * M-Pesa Integration Service (Stub/Simulation)
 * Digital Lending OS - Kenyan DCP Payment Gateway
 * 
 * This module simulates Safaricom Daraja API for:
 * - STK Push (Customer to Business payments)
 * - B2C (Business to Customer - Disbursements)
 * - B2B (Business to Business)
 * - Account Balance Query
 * - Transaction Status Query
 * 
 * In production, replace HTTP calls with actual Daraja API endpoints.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortCode: string;         // Business till number / Paybill
  initiatorPassword: string;
  securityCredential: string;
  environment: 'sandbox' | 'production';
  callbackBaseUrl: string;   // Base URL for callbacks
}

export interface StkPushRequest {
  phone: string;             // Format: 2547XXXXXXXX
  amount: number;
  accountReference: string;  // Loan number or payment ref
  transactionDesc: string;
  callbackUrl?: string;
}

export interface StkPushResponse {
  success: boolean;
  checkoutRequestID?: string;
  merchantRequestID?: string;
  responseCode?: string;
  responseDescription?: string;
  customerMessage?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface B2CRequest {
  phone: string;             // Format: 2547XXXXXXXX
  amount: number;
  occasion: string;          // Loan disbursement, refund, etc.
  remarks: string;
  commandID?: 'SalaryPayment' | 'BusinessPayment' | 'PromotionPayment';
}

export interface B2CResponse {
  success: boolean;
  conversationID?: string;
  originatorConversationID?: string;
  responseCode?: string;
  responseDescription?: string;
  transactionID?: string;    // For receipt
  errorMessage?: string;
}

export interface B2BRequest {
  initiator: string;
  commandID: 'BusinessPayBill' | 'BusinessBuyGoods' | 'DisburseFundsToBusiness' | 'BusinessToBusinessTransfer';
  senderIdentifierType: number;
  receiverIdentifierType: number;
  amount: number;
  partyA: string;            // Shortcode
  partyB: string;            // Shortcode
  accountReference: string;
  remarks: string;
  queueTimeOutURL: string;
  resultURL: string;
}

export interface B2BResponse {
  success: boolean;
  conversationID?: string;
  originatorConversationID?: string;
  responseCode?: string;
  responseDescription?: string;
  transactionID?: string;
}

export interface C2BRequest {
  ShortCode: string;
  CommandType: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
  Amount: number;
  Msisdn: string;            // Phone number
  BillRefNumber: string;
}

export interface C2BRegisterRequest {
  ValidationURL: string;
  ConfirmationURL: string;
  ResponseType: 'Completed' | 'Cancelled';
  ShortCode: string;
}

export interface BalanceQueryResponse {
  success: boolean;
  conversationID?: string;
  originatorConversationID?: string;
  responseCode?: string;
  responseDescription?: string;
  accountBalance?: AccountBalance[];
  resultType?: string;
}

export interface AccountBalance {
  accountName: string;
  balance: number;
}

export interface TransactionStatusRequest {
  transactionID: string;     // M-Pesa transaction ID to query
  partyA: string;            // Shortcode/MSISDN initiating the transaction
  identifierType: number;    // 1-MSISDN, 2-Till Number, 3-Shortcode
  occasion?: string;
  remarks?: string;
}

export interface TransactionStatusResponse {
  success: boolean;
  conversationID?: string;
  originatorConversationID?: string;
  responseCode?: string;
  responseDescription?: string;
  resultCode?: string;
  resultDesc?: string;
  transactionDetails?: TransactionDetail;
}

export interface TransactionDetail {
  ReceiptNumber?: string;
  Amount?: number;
  TransactionDate?: string;
  PhoneNumber?: string;
  DebitPartyCharges?: number;
  CreditPartyCharges?: number;
  DebitAccountBalance?: number;
  CreditAccountBalance?: number;
}

// STK Push Callback Types
export interface StkCallbackMetadataItem {
  Name: string;
  Value: string | number;
}

export interface StkCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;        // 0 = success
  ResultDesc: string;
  CallbackMetadata?: {
    Item: StkCallbackMetadataItem[];
  };
}

export interface StkPushCallbackBody {
  Body: {
    stkCallback: StkCallback;
  };
}

// B2C Result Types
export interface B2CResultItem {
  Name: string;
  Value: string | number;
}

export interface B2CResult {
  ConversationID: string;
  OriginatorConversationID: string;
  ResultCode: number;
  ResultDesc: string;
  ResultParameters?: {
    ResultItem: B2CResultItem[];
  };
}

export interface B2CCallbackBody {
  Body: {
    Result: B2CResult;
  };
}

// Payment Record for History
export interface PaymentRecord {
  id: string;
  transactionId: string;
  referenceNumber: string;
  type: 'STK_PUSH' | 'B2C' | 'B2B' | 'C2B' | 'REVERSAL';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  phone: string;
  amount: number;
  currency: string;
  description: string;
  mpesaReceiptNumber?: string;
  loanId?: string;
  customerId?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

// Simulation Types
export type SimulatedOutcome = 
  | 'success'
  | 'insufficient_funds'
  | 'cancelled'
  | 'timeout'
  | 'wrong_pin'
  | 'invalid_phone'
  | 'duplicate_transaction';

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_MPESA_CONFIG: MpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || 'test_consumer_key',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'test_consumer_secret',
  passkey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
  shortCode: process.env.MPESA_SHORT_CODE || '174379',
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD || 'Safaricom123!',
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL || 'test_security_credential',
  environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  callbackBaseUrl: process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/payments',
};

// ============================================
// IN-MEMORY STORAGE FOR SIMULATION
// ============================================

const pendingStkPushes = new Map<string, {
  request: StkPushRequest;
  initiatedAt: Date;
  status: 'pending' | 'completed' | 'failed' | 'timeout';
  callbackData?: StkCallback;
}>();

const pendingB2CTransactions = new Map<string, {
  request: B2CRequest;
  initiatedAt: Date;
  status: 'pending' | 'completed' | 'failed';
  callbackData?: B2CResult;
}>();

const paymentHistory: PaymentRecord[] = [
  {
    id: 'pay_001',
    transactionId: 'QIK3ABC123',
    referenceNumber: 'TXN-2026-0820-00123',
    type: 'STK_PUSH',
    status: 'COMPLETED',
    phone: '254712345678',
    amount: 4200,
    currency: 'KES',
    description: 'Loan repayment - LN-2026-00042',
    mpesaReceiptNumber: 'QIK3ABC123',
    loanId: 'loan_001',
    customerId: 'cust_001',
    createdAt: '2026-08-20T10:30:00Z',
    completedAt: '2026-08-20T10:32:15Z',
  },
  {
    id: 'pay_002',
    transactionId: 'OEI4DEF456',
    referenceNumber: 'TXN-2026-0820-00124',
    type: 'B2C',
    status: 'COMPLETED',
    phone: '254798765432',
    amount: 50000,
    currency: 'KES',
    description: 'Loan disbursement - LN-2026-00043',
    mpesaReceiptNumber: 'OEI4DEF456',
    loanId: 'loan_002',
    customerId: 'cust_002',
    createdAt: '2026-08-20T09:15:00Z',
    completedAt: '2026-08-20T09:16:42Z',
  },
  {
    id: 'pay_003',
    transactionId: '',
    referenceNumber: 'TXN-2026-0820-00125',
    type: 'STK_PUSH',
    status: 'FAILED',
    phone: '254711122233',
    amount: 1500,
    currency: 'KES',
    description: 'Loan repayment - LN-2026-00044',
    loanId: 'loan_003',
    customerId: 'cust_003',
    createdAt: '2026-08-20T14:00:00Z',
    failureReason: 'User cancelled the transaction',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique ID for M-Pesa transactions
 */
function generateCheckoutRequestID(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 12);
  return `ws_CO_${timestamp}${random}`;
}

function generateMerchantRequestID(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

function generateConversationID(): string {
  return `AG_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function generateOriginatorConversationID(): string {
  return `OG_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateMpesaReceiptNumber(): string {
  const prefixes = ['QIK', 'OEI', 'RGJ', 'MDR', 'LNP'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${suffix}`;
}

/**
 * Validate Kenyan phone number format
 */
export function validateMpesaPhone(phone: string): { valid: boolean; formatted?: string; error?: string } {
  // Remove spaces and dashes
  let cleaned = phone.replace(/[\s\-]/g, '');
  
  // Handle various formats
  if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1); // Remove +
  } else if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    // Already in correct format
  } else {
    return { valid: false, error: 'Invalid phone format. Use +2547XXXXXXXX or 07XXXXXXXX format' };
  }
  
  // Validate length and pattern
  if (!/^2547\d{8}$/.test(cleaned)) {
    return { valid: false, error: 'Invalid M-Pesa phone number. Must be 254 followed by 9 digits starting with 7 or 1' };
  }
  
  return { valid: true, formatted: cleaned };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generate timestamp in M-Pesa format (YYYYMMDDHHmmss)
 */
function generateMpesaTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Simulate network delay
 */
async function simulateDelay(minMs: number = 500, maxMs: number = 2000): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// ============================================
// AUTH TOKEN MANAGEMENT (Simulated)
// ============================================

let authToken: string | null = null;
let tokenExpiry: Date | null = null;

/**
 * Get OAuth access token (simulated)
 * In production, this calls Safaricom's OAuth endpoint
 */
export async function getAccessToken(config?: MpesaConfig): Promise<string> {
  const cfg = config || DEFAULT_MPESA_CONFIG;
  
  // Check if token is still valid (with buffer)
  if (authToken && tokenExpiry && tokenExpiry > new Date(Date.now() + 60000)) {
    return authToken;
  }
  
  await simulateDelay(100, 500);
  
  // Simulate token generation
  authToken = `SimulatedToken_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  tokenExpiry = new Date(Date.now() + 3600000); // 1 hour
  
  return authToken;
}

// ============================================
// STK PUSH SERVICE
// ============================================

/**
 * Initiate STK Push payment request
 * This sends a prompt to customer's phone to enter M-Pesa PIN
 */
export async function initiateStkPush(
  request: StkPushRequest,
  config?: MpesaConfig
): Promise<StkPushResponse> {
  const cfg = config || DEFAULT_MPESA_CONFIG;
  
  // Validate phone number
  const phoneValidation = validateMpesaPhone(request.phone);
  if (!phoneValidation.valid) {
    return {
      success: false,
      responseCode: '400',
      responseDescription: phoneValidation.error,
      customerMessage: 'Invalid phone number. Please check and try again.',
      errorCode: 'INVALID_PHONE_NUMBER',
      errorMessage: phoneValidation.error,
    };
  }
  
  // Validate amount
  if (request.amount <= 0) {
    return {
      success: false,
      responseCode: '400',
      responseDescription: 'Invalid amount',
      customerMessage: 'Amount must be greater than zero.',
      errorCode: 'INVALID_AMOUNT',
      errorMessage: 'Amount must be greater than zero.',
    };
  }
  
  if (request.amount < 10) {
    return {
      success: false,
      responseCode: '400',
      responseDescription: 'Amount too low',
      customerMessage: 'Minimum payment amount is KSh 10.',
      errorCode: 'AMOUNT_TOO_LOW',
      errorMessage: 'Amount must be at least KSh 10.',
    };
  }
  
  if (request.amount > 150000) {
    return {
      success: false,
      responseCode: '400',
      responseDescription: 'Amount exceeds limit',
      customerMessage: 'Maximum STK Push amount is KSh 150,000.',
      errorCode: 'AMOUNT_TOO_HIGH',
      errorMessage: 'Amount exceeds maximum limit of KSh 150,000.',
    };
  }
  
  // Get auth token
  await getAccessToken(cfg);
  
  // Simulate API call delay
  await simulateDelay(800, 2000);
  
  // Generate IDs
  const checkoutRequestID = generateCheckoutRequestID();
  const merchantRequestID = generateMerchantRequestID();
  
  // Store pending request
  pendingStkPushes.set(checkoutRequestID, {
    request: { ...request, phone: phoneValidation.formatted! },
    initiatedAt: new Date(),
    status: 'pending',
  });
  
  // Add to payment history
  const paymentRecord: PaymentRecord = {
    id: `pay_${Date.now()}`,
    transactionId: '',
    referenceNumber: checkoutRequestID,
    type: 'STK_PUSH',
    status: 'PENDING',
    phone: phoneValidation.formatted!,
    amount: request.amount,
    currency: 'KES',
    description: request.transactionDesc || `Payment - ${request.accountReference}`,
    loanId: request.accountReference?.startsWith('LN') ? request.accountReference : undefined,
    createdAt: new Date().toISOString(),
    metadata: {
      checkoutRequestID,
      merchantRequestID,
      callbackUrl: request.callbackUrl,
    },
  };
  paymentHistory.unshift(paymentRecord);
  
  // Return success response (simulating successful initiation)
  return {
    success: true,
    checkoutRequestID,
    merchantRequestID,
    responseCode: '0',
    responseDescription: 'Success. Request accepted for processing',
    customerMessage: 'Please enter your M-Pesa PIN on your phone to complete the payment.',
  };
}

/**
 * Process STK Push callback (called by M-Pesa)
 * In simulation, this can be triggered by the simulator component
 */
export async function processStkCallback(
  checkoutRequestID: string,
  outcome: SimulatedOutcome = 'success'
): Promise<StkCallback> {
  const pending = pendingStkPushes.get(checkoutRequestID);
  
  if (!pending) {
    throw new Error(`No pending STK Push found with CheckoutRequestID: ${checkoutRequestID}`);
  }
  
  await simulateDelay(300, 1000);
  
  let resultCode: number;
  let resultDesc: string;
  let callbackMetadata: StkCallback['CallbackMetadata'] | undefined;
  
  switch (outcome) {
    case 'success':
      resultCode = 0;
      resultDesc = 'The service request is processed successfully.';
      callbackMetadata = {
        Item: [
          { Name: 'Amount', Value: pending.request.amount },
          { Name: 'MpesaReceiptNumber', Value: generateMpesaReceiptNumber() },
          { Name: 'TransactionDate', Value: generateMpesaTimestamp() },
          { Name: 'PhoneNumber', Value: pending.request.phone },
        ],
      };
      
      // Update payment history
      const historyIndex = paymentHistory.findIndex(p => p.referenceNumber === checkoutRequestID);
      if (historyIndex !== -1) {
        paymentHistory[historyIndex].status = 'COMPLETED';
        paymentHistory[historyIndex].mpesaReceiptNumber = callbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber')?.Value as string;
        paymentHistory[historyIndex].completedAt = new Date().toISOString();
        paymentHistory[historyIndex].transactionId = paymentHistory[historyIndex].mpesaReceiptNumber;
      }
      break;
      
    case 'insufficient_funds':
      resultCode = 1;
      resultDesc = 'The balance is insufficient for the transaction.';
      break;
      
    case 'cancelled':
      resultCode = 1032;
      resultDesc = 'Cancelled by user.';
      break;
      
    case 'timeout':
      resultCode = 1017;
      resultDesc = 'Request cancelled by user (timed out).';
      break;
      
    case 'wrong_pin':
      resultCode = 1036;
      resultDesc: 'Wrong PIN entered. Please retry.';
      break;
      
    case 'invalid_phone':
      resultCode = 1024;
      resultDesc: 'Invalid phone number / MSISDN.';
      break;
      
    case 'duplicate_transaction':
      resultCode = 1045;
      resultDesc: 'Duplicate transaction detected.';
      break;
      
    default:
      resultCode = 1;
      resultDesc: 'Transaction failed.';
  }
  
  const callbackData: StkCallback = {
    MerchantRequestID: generateMerchantRequestID(),
    CheckoutRequestID: checkoutRequestID,
    ResultCode: resultCode,
    ResultDesc: resultDesc,
    CallbackMetadata: callbackMetadata,
  };
  
  // Update pending status
  pending.status = resultCode === 0 ? 'completed' : 'failed';
  pending.callbackData = callbackData;
  
  // Update payment history for failures
  if (resultCode !== 0) {
    const idx = paymentHistory.findIndex(p => p.referenceNumber === checkoutRequestID);
    if (idx !== -1) {
      paymentHistory[idx].status = resultCode === 1032 ? 'CANCELLED' : 'FAILED';
      paymentHistory[idx].failureReason = resultDesc;
    }
  }
  
  return callbackData;
}

/**
 * Get STK Push status
 */
export function getStkPushStatus(checkoutRequestID: string): {
  exists: boolean;
  status: 'pending' | 'completed' | 'failed' | 'timeout' | 'not_found';
  data?: typeof pendingStkPushes extends Map<string, infer T> ? T : never;
} {
  const pending = pendingStkPushes.get(checkoutRequestID);
  
  if (!pending) {
    return { exists: false, status: 'not_found' };
  }
  
  // Check for timeout (30 minutes)
  const elapsed = Date.now() - pending.initiatedAt.getTime();
  if (elapsed > 30 * 60 * 1000 && pending.status === 'pending') {
    pending.status = 'timeout';
  }
  
  return { exists: true, status: pending.status, data: pending };
}

// ============================================
// B2C SERVICE (DISBURSEMENTS)
// ============================================

/**
 * Initiate B2C payment (Business to Customer)
 * Used for loan disbursements, refunds, salary payments
 */
export async function initiateB2C(
  request: B2CRequest,
  config?: MpesaConfig
): Promise<B2CResponse> {
  const cfg = config || DEFAULT_MPESA_CONFIG;
  
  // Validate phone number
  const phoneValidation = validateMpesaPhone(request.phone);
  if (!phoneValidation.valid) {
    return {
      success: false,
      responseCode: '400',
      responseDescription: phoneValidation.error,
      errorMessage: phoneValidation.error,
    };
  }
  
  // Validate amount
  if (request.amount <= 0) {
    return {
      success: false,
      responseCode: '400',
      responseDescription: 'Invalid amount',
      errorMessage: 'Amount must be greater than zero.',
    };
  }
  
  if (request.amount < 50) {
    return {
      success: false,
      responseCode: '400',
      responseDescription: 'Amount below minimum',
      errorMessage: 'Minimum B2C amount is KSh 50.',
    };
  }
  
  if (request.amount > 300000) {
    return {
      success: false,
      responseCode: '400',
      responseDescription: 'Amount exceeds limit',
      errorMessage: 'Maximum B2C amount is KSh 300,000 per transaction.',
    };
  }
  
  // Get auth token
  await getAccessToken(cfg);
  
  // Simulate API call delay
  await simulateDelay(1000, 2500);
  
  // Generate IDs
  const conversationID = generateConversationID();
  const originatorConversationID = generateOriginatorConversationID();
  
  // Store pending transaction
  pendingB2CTransactions.set(originatorConversationID, {
    request: { ...request, phone: phoneValidation.formatted! },
    initiatedAt: new Date(),
    status: 'pending',
  });
  
  // Add to payment history
  const paymentRecord: PaymentRecord = {
    id: `pay_b2c_${Date.now()}`,
    transactionId: '',
    referenceNumber: originatorConversationID,
    type: 'B2C',
    status: 'PENDING',
    phone: phoneValidation.formatted!,
    amount: request.amount,
    currency: 'KES',
    description: `${request.commandID || 'SalaryPayment'} - ${request.remarks}`,
    createdAt: new Date().toISOString(),
    metadata: {
      conversationID,
      commandID: request.commandID || 'SalaryPayment',
      occasion: request.occasion,
    },
  };
  paymentHistory.unshift(paymentRecord);
  
  return {
    success: true,
    conversationID,
    originatorConversationID,
    responseCode: '0',
    responseDescription: 'Acceptance for success',
    message: 'Disbursement initiated successfully',
  };
}

/**
 * Process B2C result callback
 */
export async function processB2CCallback(
  originatorConversationID: string,
  outcome: SimulatedOutcome = 'success'
): Promise<B2CResult> {
  const pending = pendingB2CTransactions.get(originatorConversationID);
  
  if (!pending) {
    throw new Error(`No pending B2C transaction found with OriginatorConversationID: ${originatorConversationID}`);
  }
  
  await simulateDelay(500, 2000);
  
  let resultCode: number;
  let resultDesc: string;
  let resultItems: B2CResultItem[] | undefined;
  
  switch (outcome) {
    case 'success':
      resultCode = 0;
      resultDesc = 'Service request accepted successfully';
      resultItems = [
        { Name: 'TransactionAmount', Value: pending.request.amount },
        { Name: 'TransactionReceipt', Value: generateMpesaReceiptNumber() },
        { Name: 'ReceiverPartyPublicName', Value: `+${pending.request.phone.substring(0, 4)}***${pending.request.phone.slice(-4)}` },
        { Name: 'TransactionCompletedDateTime', Value: generateMpesaTimestamp() },
        { Name: 'ChargesPaidAccountAvailableFunds', Value: 450000 },
        { Name: 'ReceiverAccountAvailableFunds', Value: Math.round(pending.request.amount + Math.random() * 50000) },
        { Name: 'DebitAccountAvailableFunds', Value: 444900 },
        { Name: 'DebitAccountCurrentBalance', Value: 445000 },
        { Name: 'TransferredAmount', Value: pending.request.amount },
        { Name: 'WorkingAccountAvailableFunds', Value: -1 },
        { Name: 'UtilityAccountAvailableFunds', Value: -1 },
        { Name: 'ExceptionAuditType', Value: '' },
        { Name: 'Amount', Value: pending.request.amount },
      ];
      
      // Update payment history
      const historyIndex = paymentHistory.findIndex(p => p.referenceNumber === originatorConversationID);
      if (historyIndex !== -1) {
        paymentHistory[historyIndex].status = 'COMPLETED';
        paymentHistory[historyIndex].mpesaReceiptNumber = resultItems.find(i => i.Name === 'TransactionReceipt')?.Value as string;
        paymentHistory[historyIndex].transactionId = paymentHistory[historyIndex].mpesaReceiptNumber;
        paymentHistory[historyIndex].completedAt = new Date().toISOString();
      }
      break;
      
    case 'insufficient_funds':
      resultCode = 4;
      resultDesc: 'Balance insufficient for the transaction.';
      break;
      
    case 'cancelled':
      resultCode = 10;
      resultDesc: 'Request cancelled.';
      break;
      
    default:
      resultCode = 1;
      resultDesc: 'Transaction failed.';
  }
  
  const resultData: B2CResult = {
    ConversationID: generateConversationID(),
    OriginatorConversationID: originatorConversationID,
    ResultCode: resultCode,
    ResultDesc: resultDesc,
    ResultParameters: resultItems ? { ResultItem: resultItems } : undefined,
  };
  
  // Update pending status
  pending.status = resultCode === 0 ? 'completed' : 'failed';
  pending.callbackData = resultData;
  
  // Update payment history for failures
  if (resultCode !== 0) {
    const idx = paymentHistory.findIndex(p => p.referenceNumber === originatorConversationID);
    if (idx !== -1) {
      paymentHistory[idx].status = 'FAILED';
      paymentHistory[idx].failureReason = resultDesc;
    }
  }
  
  return resultData;
}

/**
 * Get B2C transaction status
 */
export function getB2CStatus(originatorConversationID: string): {
  exists: boolean;
  status: 'pending' | 'completed' | 'failed' | 'not_found';
  data?: typeof pendingB2CTransactions extends Map<string, infer T> ? T : never;
} {
  const pending = pendingB2CTransactions.get(originatorConversationID);
  
  if (!pending) {
    return { exists: false, status: 'not_found' };
  }
  
  return { exists: true, status: pending.status, data: pending };
}

// ============================================
// ACCOUNT BALANCE QUERY
// ============================================

/**
 * Query M-Pesa working account balance
 */
export async function queryBalance(
  config?: MpesaConfig
): Promise<BalanceQueryResponse> {
  const cfg = config || DEFAULT_MPESA_CONFIG;
  
  await getAccessToken(cfg);
  await simulateDelay(800, 1800);
  
  // Simulate random balance between 100K and 5M
  const balance = Math.round(100000 + Math.random() * 4900000);
  
  return {
    success: true,
    conversationID: generateConversationID(),
    originatorConversationID: generateOriginatorConversationID(),
    responseCode: '0',
    responseDescription: 'Success',
    accountBalance: [
      {
        accountName: 'Working Account',
        balance,
      },
    ],
    resultType: 'Balance Query',
  };
}

// ============================================
// TRANSACTION STATUS QUERY
// ============================================

/**
 * Query status of an M-Pesa transaction
 */
export async function queryTransactionStatus(
  request: TransactionStatusRequest,
  config?: MpesaConfig
): Promise<TransactionStatusResponse> {
  const cfg = config || DEFAULT_MPESA_CONFIG;
  
  await getAccessToken(cfg);
  await simulateDelay(600, 1500);
  
  // Try to find in our records first
  const paymentRecord = paymentHistory.find(p => 
    p.transactionId === request.transactionID || 
    p.mpesaReceiptNumber === request.transactionID ||
    p.referenceNumber === request.transactionID
  );
  
  if (paymentRecord) {
    return {
      success: true,
      conversationID: generateConversationID(),
      originatorConversationID: generateOriginatorConversationID(),
      responseCode: '0',
      responseDescription: 'Success',
      resultCode: paymentRecord.status === 'COMPLETED' ? '0' : '1',
      resultDesc: getStatusDescription(paymentRecord.status),
      transactionDetails: {
        ReceiptNumber: paymentRecord.mpesaReceiptNumber,
        Amount: paymentRecord.amount,
        TransactionDate: paymentRecord.completedAt || paymentRecord.createdAt,
        PhoneNumber: paymentRecord.phone,
      },
    };
  }
  
  // Simulate not found
  return {
    success: false,
    conversationID: generateConversationID(),
    originatorConversationID: generateOriginatorConversationID(),
    responseCode: '404',
    responseDescription: 'Transaction not found',
    resultCode: 'NOTFOUND',
    resultDesc: 'The specified transaction could not be found.',
  };
}

function getStatusDescription(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'Transaction completed successfully';
    case 'PENDING': return 'Transaction is being processed';
    case 'FAILED': return 'Transaction failed';
    case 'CANCELLED': return 'Transaction was cancelled';
    case 'TIMEOUT': return 'Transaction timed out';
    default: return 'Unknown status';
  }
}

// ============================================
// PAYMENT HISTORY
// ============================================

/**
 * Get payment history with optional filters
 */
export function getPaymentHistory(filters?: {
  loanId?: string;
  customerId?: string;
  type?: PaymentRecord['type'];
  status?: PaymentRecord['status'];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): { records: PaymentRecord[]; total: number } {
  let filtered = [...paymentHistory];
  
  if (filters) {
    if (filters.loanId) {
      filtered = filtered.filter(p => p.loanId === filters.loanId);
    }
    if (filters.customerId) {
      filtered = filtered.filter(p => p.customerId === filters.customerId);
    }
    if (filters.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(p => p.createdAt >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(p => p.createdAt <= filters.dateTo!);
    }
  }
  
  const total = filtered.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 20;
  
  return {
    records: filtered.slice(offset, offset + limit),
    total,
  };
}

/**
 * Add a payment record manually (for external integrations)
 */
export function addPaymentRecord(record: Omit<PaymentRecord, 'id' | 'createdAt'>): PaymentRecord {
  const newRecord: PaymentRecord = {
    ...record,
    id: `pay_manual_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  paymentHistory.unshift(newRecord);
  return newRecord;
}

// ============================================
// SIMULATION HELPERS
// ============================================

/**
 * Get all pending STK Push transactions (for simulator UI)
 */
export function getPendingStkPushes(): Array<{
  checkoutRequestID: string;
  phone: string;
  amount: number;
  initiatedAt: Date;
  status: string;
}> {
  const entries: typeof getPendingStkPushes extends () => infer T ? T : never = [];
  
  pendingStkPushes.forEach((value, key) => {
    entries.push({
      checkoutRequestID: key,
      phone: value.request.phone,
      amount: value.request.amount,
      initiatedAt: value.initiatedAt,
      status: value.status,
    });
  });
  
  return entries;
}

/**
 * Get all pending B2C transactions (for simulator UI)
 */
export function getPendingB2CTransactions(): Array<{
  originatorConversationID: string;
  phone: string;
  amount: number;
  initiatedAt: Date;
  status: string;
}> {
  const entries: typeof getPendingB2CTransactions extends () => infer T ? T : never = [];
  
  pendingB2CTransactions.forEach((value, key) => {
    entries.push({
      originatorConversationID: key,
      phone: value.request.phone,
      amount: value.request.amount,
      initiatedAt: value.initiatedAt,
      status: value.status,
    });
  });
  
  return entries;
}

/**
 * Clear all pending transactions (for testing reset)
 */
export function clearPendingTransactions(): void {
  pendingStkPushes.clear();
  pendingB2CTransactions.clear();
}

// Export types for use in other modules
export type {
  MpesaConfig,
  StkPushRequest,
  StkPushResponse,
  B2CRequest,
  B2CResponse,
  B2BRequest,
  B2BResponse,
  C2BRequest,
  C2BRegisterRequest,
  BalanceQueryResponse,
  AccountBalance,
  TransactionStatusRequest,
  TransactionStatusResponse,
  TransactionDetail,
  StkCallbackMetadataItem,
  StkCallback,
  StkPushCallbackBody,
  B2CResultItem,
  B2CResult,
  B2CCallbackBody,
  PaymentRecord,
  SimulatedOutcome,
};
