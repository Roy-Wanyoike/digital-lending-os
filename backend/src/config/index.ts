/**
 * Application Configuration
 * 
 * Centralized configuration management with environment variable support.
 * All sensitive values should be loaded from environment variables.
 */

export const config = {
  // ===========================================================================
  // SERVER CONFIGURATION
  // ===========================================================================
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '4000', 10),
    apiVersion: process.env.API_VERSION || '1',
    baseUrl: process.env.BASE_URL || 'http://localhost:4000',
  },

  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  apiVersion: process.env.API_VERSION || '1',

  // ===========================================================================
  // DATABASE CONFIGURATION (Prisma/PostgreSQL)
  // ===========================================================================
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  },

  // ===========================================================================
  // AUTHENTICATION & JWT CONFIGURATION
  // ===========================================================================
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-change-in-production',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MS || '900000', 10), // 15 minutes
  },

  // ===========================================================================
  // COOKIE CONFIGURATION
  // ===========================================================================
  cookie: {
    secret: process.env.COOKIE_SECRET || 'cookie-secret-change-in-production',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // ===========================================================================
  // CORS CONFIGURATION
  // ===========================================================================
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:4000').split(','),
  },

  // ===========================================================================
  // RATE LIMITING CONFIGURATION
  // ===========================================================================
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // ===========================================================================
  // M-PESA DARAJA API CONFIGURATION
  // ===========================================================================
  mpesa: {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    passkey: process.env.MPESA_PASSKEY || '',
    shortcode: process.env.MPESA_SHORTCODE || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/payments/stkpush/callback',
    confirmationUrl: process.env.MPESA_CONFIRMATION_URL || 'https://your-domain.com/api/payments/c2b/confirmation',
    validationUrl: process.env.MPESA_VALIDATION_URL || 'https://your-domain.com/api/payments/c2b/validation',
    b2cShortcode: process.env.MPESA_B2C_SHORTCODE || '',
    b2cSecurityCredential: process.env.MPESA_B2C_SECURITY_CREDENTIAL || '',
    timeoutUrl: process.env.MPESA_TIMEOUT_URL || 'https://your-domain.com/api/payments/stkpush/timeout',
    resultUrl: process.env.MPESA_RESULT_URL || 'https://your-domain.com/api/payments/stkpush/result',
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox', // sandbox or production
    apiUrl: process.env.MPESA_API_URL || 'https://sandbox.safaricom.co.ke',
  },

  // ===========================================================================
  // CRB (CREDIT REFERENCE BUREAU) CONFIGURATION
  // ===========================================================================
  crb: {
    metropol: {
      apiKey: process.env.CRB_METROPOL_API_KEY || '',
      username: process.env.CRB_METROPOL_USERNAME || '',
      password: process.env.CRB_METROPOL_PASSWORD || '',
      url: process.env.CRB_METROPOL_URL || 'https://api.metropolcorp.com/v2',
    },
    transUnion: {
      apiKey: process.env.CRB_TRANSUNION_API_KEY || '',
      url: process.env.CRB_TRANSUNION_URL || 'https://api.transunion.co.ke',
    },
    creditInfo: {
      apiKey: process.env.CRB_CREDITINFO_API_KEY || '',
      url: process.env.CRB_CREDITINFO_URL || 'https://www.creditinfo.co.ke/api',
    },
  },

  // ===========================================================================
  // SMS GATEWAY CONFIGURATION
  // ===========================================================================
  sms: {
    provider: process.env.SMS_PROVIDER || 'africastalking', // africastalking, twilio, infobip
    apiKey: process.env.SMS_API_KEY || '',
    username: process.env.SMS_USERNAME || '',
    from: process.env.SMS_FROM_NAME || 'DLOS',
    africaTalking: {
      apiKey: process.env.AT_API_KEY || '',
      username: process.env.AT_USERNAME || '',
      shortCode: process.env.AT_SHORT_CODE || '',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    },
  },

  // ===========================================================================
  // EMAIL CONFIGURATION
  // ===========================================================================
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp', // smtp, sendgrid, ses
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.EMAIL_FROM || 'noreply@digitallendingos.com',
      fromName: process.env.EMAIL_FROM_NAME || 'Digital Lending OS',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
    },
    ses: {
      region: process.env.SES_REGION || 'us-east-1',
      accessKeyId: process.env.SES_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.SES_SECRET_ACCESS_KEY || '',
    },
  },

  // ===========================================================================
  // FILE UPLOAD CONFIGURATION
  // ===========================================================================
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10), // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    directory: process.env.UPLOAD_DIR || './uploads',
  },

  // ===========================================================================
  // LOGGING CONFIGURATION
  // ===========================================================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json', // json or simple
    file: process.env.LOG_FILE || 'logs/app.log',
  },

  // ===========================================================================
  // TENANT CONFIGURATION
  // ===========================================================================
  tenant: {
    defaultPlan: 'STARTER',
    plans: {
      STARTER: { monthlyFee: 5000, transactionRate: 1.5, maxUsers: 5, maxCustomers: 1000 },
      PROFESSIONAL: { monthlyFee: 15000, transactionRate: 1.0, maxUsers: 25, maxCustomers: 10000 },
      ENTERPRISE: { monthlyFee: 50000, transactionRate: 0.5, maxUsers: -1, maxCustomers: -1 }, // unlimited
      CUSTOM: { monthlyFee: 0, transactionRate: 0, maxUsers: -1, maxCustomers: -1 },
    },
  },

  // ===========================================================================
  // LOAN CONFIGURATION
  // ===========================================================================
  loans: {
    minAmount: parseInt(process.env.LOAN_MIN_AMOUNT || '500', 10),
    maxAmount: parseInt(process.env.LOAN_MAX_AMOUNT || '150000', 10),
    minTermDays: parseInt(process.env.LOAN_MIN_TERM_DAYS || '7', 10),
    maxTermDays: parseInt(process.env.LOAN_MAX_TERM_DAYS || '180', 10),
    defaultInterestRate: parseFloat(process.env.LOAN_DEFAULT_INTEREST_RATE || '15'),
    maxInterestRate: parseFloat(process.env.LOAN_MAX_INTEREST_RATE || '30'),
    gracePeriodDays: parseInt(process.env.LOAN_GRACE_PERIOD_DAYS || '3', 10),
    lateFeePercentage: parseFloat(process.env.LATE_FEE_PERCENTAGE || '5'),
    penaltyRateDaily: parseFloat(process.env.PENALTY_RATE_DAILY || '1'),
  },

  // ===========================================================================
  // AUDIT LOGGING CONFIGURATION
  // ===========================================================================
  audit: {
    enabled: process.env.AUDIT_ENABLED !== 'false',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
    logSuccessfulAuth: process.env.AUDIT_LOG_SUCCESSFUL_AUTH === 'true',
    logFailedAuth: process.env.AUDIT_LOG_FAILED_AUTH !== 'false',
  },

  // ===========================================================================
  // WEBHOOK CONFIGURATION
  // ===========================================================================
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'webhook-secret-change-in-production',
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '30000', 10),
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3', 10),
  },
} as const;

// Type exports
export type Config = typeof config;
