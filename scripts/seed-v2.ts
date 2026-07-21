import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const db = new PrismaClient()

// ============================================================
// DATA DEFINITIONS
// ============================================================

const BUSINESSES = [
  { name: 'Shanghai TechExim Co.', country: 'CN', legalName: 'Shanghai Technology Import & Export Co., Ltd', registrationNo: 'CN-310115-2020-001', taxId: '91310000MA1FLXXX', city: 'Shanghai', industry: 'Electronics', employeeCount: 150, annualRevenue: 12000000, description: 'Leading electronics importer/exporter in East China with 15 years of cross-border trade experience.' },
  { name: 'Berlin Trade Haus GmbH', country: 'DE', legalName: 'Berlin Trade Haus Gesellschaft mit beschränkter Haftung', registrationNo: 'DE-HRB-123456', taxId: 'DE123456789', city: 'Berlin', industry: 'Manufacturing', employeeCount: 85, annualRevenue: 8500000, description: 'German manufacturing intermediary specializing in precision engineering components.' },
  { name: 'Lagos Mercantile Ltd', country: 'NG', legalName: 'Lagos Mercantile Nigeria Limited', registrationNo: 'NG-RC-1234567', taxId: 'NG-TIN-98765432', city: 'Lagos', industry: 'Agriculture', employeeCount: 200, annualRevenue: 5200000, description: 'West Africa\'s leading agricultural commodity trading company.' },
  { name: 'São Paulo Industrial SA', country: 'BR', legalName: 'São Paulo Industrial Sociedade Anônima', registrationNo: 'BR-CNPJ-12.345.678/0001-90', taxId: 'BR-CNPJ-12.345.678/0001-90', city: 'São Paulo', industry: 'Automotive', employeeCount: 350, annualRevenue: 25000000, description: 'Major Brazilian automotive parts manufacturer serving global OEMs.' },
  { name: 'Singapore Global Trade Pte', country: 'SG', legalName: 'Singapore Global Trade Private Limited', registrationNo: 'SG-201812345Z', taxId: 'SG-UEN-201812345Z', city: 'Singapore', industry: 'Logistics', employeeCount: 120, annualRevenue: 18000000, description: 'Pan-Asian logistics and freight forwarding with operations in 12 countries.' },
  { name: 'Dubai GoldStar Trading LLC', country: 'AE', legalName: 'Dubai GoldStar Trading LLC', registrationNo: 'AE-DED-123456', taxId: 'AE-TRN-100123456700003', city: 'Dubai', industry: 'Commodities', employeeCount: 60, annualRevenue: 32000000, description: 'UAE-based precious metals and commodities trading house.' },
  { name: 'Mumbai FinTech Solutions Pvt', country: 'IN', legalName: 'Mumbai FinTech Solutions Private Limited', registrationNo: 'IN-CIN-U72200MH2019PTC123456', taxId: 'IN-GST-27AABCM1234A1Z5', city: 'Mumbai', industry: 'Technology', employeeCount: 95, annualRevenue: 6800000, description: 'Indian fintech company providing payment solutions for SME cross-border trade.' },
  { name: 'Tokyo Precision Works Co.', country: 'JP', legalName: 'Tokyo Precision Works Kabushiki Kaisha', registrationNo: 'JP-601-000123456', taxId: 'JP-1234567890', city: 'Tokyo', industry: 'Manufacturing', employeeCount: 280, annualRevenue: 42000000, description: 'Japanese precision manufacturing specializing in semiconductor equipment components.' },
  { name: 'London Bridge Capital Ltd', country: 'GB', legalName: 'London Bridge Capital Limited', registrationNo: 'GB-12345678', taxId: 'GB-VAT-GB123456789', city: 'London', industry: 'Financial Services', employeeCount: 45, annualRevenue: 15000000, description: 'UK-based trade finance provider specializing in emerging market corridors.' },
  { name: 'Nairobi Green Export Ltd', country: 'KE', legalName: 'Nairobi Green Export Limited', registrationNo: 'KE-CPR/2019/123456', taxId: 'KE-PIN-A00XYZ123Z', city: 'Nairobi', industry: 'Agriculture', employeeCount: 175, annualRevenue: 3800000, description: 'Kenyan specialty tea and coffee exporter serving European and Asian markets.' },
  { name: 'Seoul Digital Commerce Inc', country: 'KR', legalName: 'Seoul Digital Commerce Incorporated', registrationNo: 'KR-123-45-67890', taxId: 'KR-123-45-67890', city: 'Seoul', industry: 'Technology', employeeCount: 210, annualRevenue: 22000000, description: 'Korean e-commerce platform operator facilitating cross-border B2B transactions.' },
  { name: 'Mexico Industrial SA de CV', country: 'MX', legalName: 'Mexico Industrial Sociedad Anónima de Capital Variable', registrationNo: 'MX-MX-123456-7', taxId: 'MX-RFC-MIC123456AB8', city: 'Mexico City', industry: 'Manufacturing', employeeCount: 420, annualRevenue: 35000000, description: 'Mexican nearshoring manufacturer serving North American supply chains.' },
]

const RELATIONSHIPS = [
  { from: 0, to: 1, type: 'supplier' },
  { from: 1, to: 0, type: 'buyer' },
  { from: 0, to: 4, type: 'logistics' },
  { from: 2, to: 9, type: 'partner' },
  { from: 3, to: 7, type: 'supplier' },
  { from: 5, to: 8, type: 'financial' },
  { from: 6, to: 10, type: 'partner' },
  { from: 4, to: 11, type: 'supplier' },
  { from: 7, to: 1, type: 'supplier' },
  { from: 9, to: 2, type: 'buyer' },
  { from: 8, to: 5, type: 'financial' },
  { from: 11, to: 3, type: 'buyer' },
  { from: 10, to: 6, type: 'partner' },
  { from: 3, to: 11, type: 'supplier' },
  { from: 0, to: 6, type: 'buyer' },
]

const STATUSES = ['created', 'funded', 'in_escrow', 'completed', 'completed', 'completed', 'disputed', 'completed', 'in_escrow', 'funded', 'completed', 'completed']

const USERS = [
  { email: 'admin@youngsend.com', name: 'Sarah Chen', role: 'admin', businessId: null },
  { email: 'ops@youngsend.com', name: 'Marcus Okonkwo', role: 'admin', businessId: null },
  { email: 'zhang.wei@shanghaitechexim.com', name: 'Zhang Wei', role: 'seller', businessIdx: 0 },
  { email: 'hans.mueller@berlintradehaus.de', name: 'Hans Müller', role: 'seller', businessIdx: 1 },
  { email: 'chidi.eze@lagosmercantile.ng', name: 'Chidi Eze', role: 'seller', businessIdx: 2 },
  { email: 'rafael.silva@spindustrial.br', name: 'Rafael Silva', role: 'buyer', businessIdx: 3 },
  { email: 'lee.wee@sglobaltrade.sg', name: 'Lee Wee Cheng', role: 'buyer', businessIdx: 4 },
  { email: 'ahmed.khalidi@goldstar.ae', name: 'Ahmed Al Khalidi', role: 'buyer', businessIdx: 5 },
  { email: 'audit@youngsend.com', name: 'Priya Sharma', role: 'auditor', businessId: null },
  { email: 'viewer@youngsend.com', name: 'James Wilson', role: 'viewer', businessId: null },
]

const GLOBAL_PAYMENT_METHODS = [
  // Mobile Money (Africa)
  { methodCode: 'mpesa_ke', methodName: 'M-Pesa Kenya', provider: 'safaricom', type: 'mobile_money', countries: ['KE'], currencies: ['KES'], minAmount: 10, maxAmount: 300000, feePercent: 1.5, fixedFee: 0, settlementTime: 5, icon: '📱' },
  { methodCode: 'mpesa_tz', methodName: 'M-Pesa Tanzania', provider: 'vodacom_tz', type: 'mobile_money', countries: ['TZ'], currencies: ['TZS'], minAmount: 1000, maxAmount: 1000000, feePercent: 1.5, fixedFee: 0, settlementTime: 5, icon: '📱' },
  { methodCode: 'mpesa_ug', methodName: 'M-Pesa Uganda', provider: 'safaricom_ug', type: 'mobile_money', countries: ['UG'], currencies: ['UGX'], minAmount: 1000, maxAmount: 5000000, feePercent: 1.5, fixedFee: 0, settlementTime: 5, icon: '📱' },
  { methodCode: 'airtel_money_ug', methodName: 'Airtel Money Uganda', provider: 'airtel_ug', type: 'mobile_money', countries: ['UG'], currencies: ['UGX'], minAmount: 1000, maxAmount: 4000000, feePercent: 1.5, fixedFee: 0, settlementTime: 10, icon: '📱' },
  { methodCode: 'airtel_money_ke', methodName: 'Airtel Money Kenya', provider: 'airtel_ke', type: 'mobile_money', countries: ['KE'], currencies: ['KES'], minAmount: 50, maxAmount: 300000, feePercent: 1.5, fixedFee: 0, settlementTime: 10, icon: '📱' },
  { methodCode: 'mtn_momo_ug', methodName: 'MTN Mobile Money Uganda', provider: 'mtn_ug', type: 'mobile_money', countries: ['UG'], currencies: ['UGX'], minAmount: 500, maxAmount: 5000000, feePercent: 1.0, fixedFee: 0, settlementTime: 5, icon: '📱' },
  { methodCode: 'mtn_momo_cm', methodName: 'MTN Mobile Money Cameroon', provider: 'mtn_cm', type: 'mobile_money', countries: ['CM'], currencies: ['XAF'], minAmount: 100, maxAmount: 2000000, feePercent: 1.0, fixedFee: 0, settlementTime: 10, icon: '📱' },
  { methodCode: 'mtn_momo_ng', methodName: 'MTN Mobile Money Nigeria', provider: 'mtn_ng', type: 'mobile_money', countries: ['NG'], currencies: ['NGN'], minAmount: 100, maxAmount: 1000000, feePercent: 1.5, fixedFee: 0.1, settlementTime: 10, icon: '📱' },
  { methodCode: 'vodafone_cash_gh', methodName: 'Vodafone Cash Ghana', provider: 'vodafone_gh', type: 'mobile_money', countries: ['GH'], currencies: ['GHS'], minAmount: 1, maxAmount: 50000, feePercent: 1.0, fixedFee: 0, settlementTime: 5, icon: '📱' },
  { methodCode: 'orange_money_sn', methodName: 'Orange Money Senegal', provider: 'orange_sn', type: 'mobile_money', countries: ['SN'], currencies: ['XOF'], minAmount: 100, maxAmount: 2000000, feePercent: 1.0, fixedFee: 0, settlementTime: 10, icon: '📱' },
  { methodCode: 'orange_money_ci', methodName: 'Orange Money Côte d\'Ivoire', provider: 'orange_ci', type: 'mobile_money', countries: ['CI'], currencies: ['XOF'], minAmount: 100, maxAmount: 2000000, feePercent: 1.0, fixedFee: 0, settlementTime: 10, icon: '📱' },
  { methodCode: 'orange_money_ml', methodName: 'Orange Money Mali', provider: 'orange_ml', type: 'mobile_money', countries: ['ML'], currencies: ['XOF'], minAmount: 100, maxAmount: 1500000, feePercent: 1.0, fixedFee: 0, settlementTime: 10, icon: '📱' },
  // Digital Wallets (Asia)
  { methodCode: 'alipay', methodName: 'Alipay', provider: 'ant_group', type: 'digital_wallet', countries: ['CN'], currencies: ['CNY'], minAmount: 0.01, maxAmount: 500000, feePercent: 0.6, fixedFee: 0, settlementTime: 0, icon: '🔵' },
  { methodCode: 'wechat_pay', methodName: 'WeChat Pay', provider: 'tencent', type: 'digital_wallet', countries: ['CN'], currencies: ['CNY'], minAmount: 0.01, maxAmount: 500000, feePercent: 0.6, fixedFee: 0, settlementTime: 0, icon: '💚' },
  { methodCode: 'gcash', methodName: 'GCash', provider: 'globe_telecom', type: 'digital_wallet', countries: ['PH'], currencies: ['PHP'], minAmount: 1, maxAmount: 1000000, feePercent: 2.0, fixedFee: 0, settlementTime: 0, icon: '🟢' },
  { methodCode: 'grabpay_sg', methodName: 'GrabPay Singapore', provider: 'grab', type: 'digital_wallet', countries: ['SG'], currencies: ['SGD'], minAmount: 1, maxAmount: 50000, feePercent: 1.5, fixedFee: 0, settlementTime: 0, icon: '🟡' },
  { methodCode: 'grabpay_th', methodName: 'GrabPay Thailand', provider: 'grab', type: 'digital_wallet', countries: ['TH'], currencies: ['THB'], minAmount: 10, maxAmount: 150000, feePercent: 1.5, fixedFee: 0, settlementTime: 0, icon: '🟡' },
  { methodCode: 'grabpay_ph', methodName: 'GrabPay Philippines', provider: 'grab', type: 'digital_wallet', countries: ['PH'], currencies: ['PHP'], minAmount: 1, maxAmount: 500000, feePercent: 1.5, fixedFee: 0, settlementTime: 0, icon: '🟡' },
  { methodCode: 'grabpay_id', methodName: 'GrabPay Indonesia', provider: 'grab', type: 'digital_wallet', countries: ['ID'], currencies: ['IDR'], minAmount: 1000, maxAmount: 10000000, feePercent: 1.5, fixedFee: 0, settlementTime: 0, icon: '🟡' },
  { methodCode: 'grabpay_my', methodName: 'GrabPay Malaysia', provider: 'grab', type: 'digital_wallet', countries: ['MY'], currencies: ['MYR'], minAmount: 1, maxAmount: 50000, feePercent: 1.5, fixedFee: 0, settlementTime: 0, icon: '🟡' },
  { methodCode: 'ovo', methodName: 'OVO', provider: 'grab', type: 'digital_wallet', countries: ['ID'], currencies: ['IDR'], minAmount: 1000, maxAmount: 10000000, feePercent: 1.5, fixedFee: 0, settlementTime: 0, icon: '🟣' },
  { methodCode: 'dana', methodName: 'DANA', provider: 'dana_id', type: 'digital_wallet', countries: ['ID'], currencies: ['IDR'], minAmount: 1000, maxAmount: 10000000, feePercent: 2.0, fixedFee: 0, settlementTime: 0, icon: '🔵' },
  { methodCode: 'kakaopay', methodName: 'KakaoPay', provider: 'kakao', type: 'digital_wallet', countries: ['KR'], currencies: ['KRW'], minAmount: 1, maxAmount: 50000000, feePercent: 1.0, fixedFee: 0, settlementTime: 0, icon: '🟤' },
  { methodCode: 'paytm', methodName: 'Paytm', provider: 'one97_communications', type: 'digital_wallet', countries: ['IN'], currencies: ['INR'], minAmount: 1, maxAmount: 100000, feePercent: 2.0, fixedFee: 0, settlementTime: 0, icon: '🔷' },
  // Real-Time Payments
  { methodCode: 'upi', methodName: 'UPI (Unified Payments Interface)', provider: 'npci', type: 'real_time_payment', countries: ['IN'], currencies: ['INR'], minAmount: 1, maxAmount: 200000, feePercent: 0, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'pix', methodName: 'PIX', provider: 'bcb', type: 'real_time_payment', countries: ['BR'], currencies: ['BRL'], minAmount: 0.01, maxAmount: 1000000, feePercent: 0, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'promptpay', methodName: 'PromptPay', provider: 'bank_of_thailand', type: 'real_time_payment', countries: ['TH'], currencies: ['THB'], minAmount: 1, maxAmount: 500000, feePercent: 0, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'fps', methodName: 'FPS (Faster Payment System)', provider: 'hkma', type: 'real_time_payment', countries: ['HK'], currencies: ['HKD'], minAmount: 1, maxAmount: 1000000, feePercent: 0.5, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'npp', methodName: 'NPP (New Payments Platform)', provider: 'npp_australia', type: 'real_time_payment', countries: ['AU'], currencies: ['AUD'], minAmount: 0.01, maxAmount: 10000000, feePercent: 0.5, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'fednow', methodName: 'FedNow', provider: 'federal_reserve', type: 'real_time_payment', countries: ['US'], currencies: ['USD'], minAmount: 0.01, maxAmount: 500000, feePercent: 0.5, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'sepa_instant', methodName: 'SEPA Instant Credit Transfer', provider: 'european_payments_council', type: 'real_time_payment', countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'GR', 'FI'], currencies: ['EUR'], minAmount: 0.01, maxAmount: 100000, feePercent: 0.1, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'ideal', methodName: 'iDEAL', provider: 'currence', type: 'real_time_payment', countries: ['NL'], currencies: ['EUR'], minAmount: 0.01, maxAmount: 100000, feePercent: 0.5, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'swish', methodName: 'Swish', provider: 'getswish', type: 'real_time_payment', countries: ['SE'], currencies: ['SEK'], minAmount: 1, maxAmount: 200000, feePercent: 0, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'vipps', methodName: 'Vipps', provider: 'vipps_as', type: 'real_time_payment', countries: ['NO'], currencies: ['NOK'], minAmount: 1, maxAmount: 1000000, feePercent: 0.5, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  { methodCode: 'mobilepay', methodName: 'MobilePay', provider: 'mobilepay_dk', type: 'real_time_payment', countries: ['DK'], currencies: ['DKK'], minAmount: 1, maxAmount: 500000, feePercent: 0.5, fixedFee: 0, settlementTime: 0, icon: '⚡' },
  // Bank Transfers
  { methodCode: 'swift', methodName: 'SWIFT International Transfer', provider: 'swift', type: 'bank_transfer', countries: ['US', 'GB', 'DE', 'FR', 'JP', 'CN', 'SG', 'AE', 'BR', 'IN', 'KR', 'MX', 'NG', 'KE', 'AU', 'HK'], currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'AED', 'BRL', 'INR', 'KRW', 'MXN', 'NGN', 'KES', 'AUD', 'HKD'], minAmount: 10, maxAmount: 50000000, feePercent: 0.1, fixedFee: 25, settlementTime: 1440, icon: '🏦' },
  { methodCode: 'sepa', methodName: 'SEPA Credit Transfer', provider: 'european_payments_council', type: 'bank_transfer', countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'GR', 'FI', 'IE', 'LU'], currencies: ['EUR'], minAmount: 0.01, maxAmount: 10000000, feePercent: 0.1, fixedFee: 0.5, settlementTime: 60, icon: '🏦' },
  { methodCode: 'ach', methodName: 'ACH (Automated Clearing House)', provider: 'nacha', type: 'bank_transfer', countries: ['US'], currencies: ['USD'], minAmount: 0.01, maxAmount: 10000000, feePercent: 0.1, fixedFee: 0.3, settlementTime: 1440, icon: '🏦' },
  { methodCode: 'faster_payments', methodName: 'Faster Payments Service', provider: 'pay_uk', type: 'bank_transfer', countries: ['GB'], currencies: ['GBP'], minAmount: 0.01, maxAmount: 1000000, feePercent: 0.1, fixedFee: 0.2, settlementTime: 0, icon: '🏦' },
  { methodCode: 'becs', methodName: 'BECS (Bulk Electronic Clearing System)', provider: 'auspaynet', type: 'bank_transfer', countries: ['AU'], currencies: ['AUD'], minAmount: 0.01, maxAmount: 10000000, feePercent: 0.1, fixedFee: 0.5, settlementTime: 1440, icon: '🏦' },
  // Cards
  { methodCode: 'visa', methodName: 'Visa', provider: 'visa_inc', type: 'card', countries: ['US', 'GB', 'DE', 'FR', 'JP', 'CN', 'SG', 'AE', 'BR', 'IN', 'KR', 'MX', 'NG', 'KE', 'AU', 'HK', 'TH', 'PH', 'ID', 'MY', 'NO', 'SE', 'DK', 'NL'], currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'AED', 'BRL', 'INR', 'KRW', 'MXN', 'NGN', 'KES', 'AUD', 'HKD', 'THB', 'PHP', 'IDR', 'MYR', 'NOK', 'SEK', 'DKK'], minAmount: 0.5, maxAmount: 500000, feePercent: 2.9, fixedFee: 0.3, settlementTime: 0, icon: '💳' },
  { methodCode: 'mastercard', methodName: 'Mastercard', provider: 'mastercard_inc', type: 'card', countries: ['US', 'GB', 'DE', 'FR', 'JP', 'CN', 'SG', 'AE', 'BR', 'IN', 'KR', 'MX', 'NG', 'KE', 'AU', 'HK', 'TH', 'PH', 'ID', 'MY', 'NO', 'SE', 'DK', 'NL'], currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'AED', 'BRL', 'INR', 'KRW', 'MXN', 'NGN', 'KES', 'AUD', 'HKD', 'THB', 'PHP', 'IDR', 'MYR', 'NOK', 'SEK', 'DKK'], minAmount: 0.5, maxAmount: 500000, feePercent: 2.9, fixedFee: 0.3, settlementTime: 0, icon: '💳' },
  { methodCode: 'unionpay', methodName: 'UnionPay', provider: 'china_unionpay', type: 'card', countries: ['CN', 'SG', 'JP', 'KR', 'AU', 'HK', 'TH', 'MY', 'US', 'GB'], currencies: ['CNY', 'USD', 'EUR', 'SGD', 'JPY', 'KRW', 'AUD', 'HKD', 'THB', 'MYR'], minAmount: 1, maxAmount: 500000, feePercent: 2.5, fixedFee: 0.3, settlementTime: 0, icon: '💳' },
  { methodCode: 'jcb', methodName: 'JCB', provider: 'jcb_co', type: 'card', countries: ['JP', 'TH', 'KR', 'SG', 'MY', 'PH', 'TW', 'HK', 'US', 'AU'], currencies: ['JPY', 'USD', 'THB', 'KRW', 'SGD', 'MYR', 'PHP', 'TWD', 'HKD', 'AUD'], minAmount: 1, maxAmount: 300000, feePercent: 3.0, fixedFee: 0.3, settlementTime: 0, icon: '💳' },
  { methodCode: 'amex', methodName: 'American Express', provider: 'american_express', type: 'card', countries: ['US', 'GB', 'DE', 'FR', 'JP', 'SG', 'AU', 'HK', 'CA', 'MX', 'BR', 'IN'], currencies: ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'HKD', 'CAD', 'MXN', 'BRL', 'INR'], minAmount: 1, maxAmount: 500000, feePercent: 3.5, fixedFee: 0.3, settlementTime: 0, icon: '💳' },
  // Crypto
  { methodCode: 'bitcoin', methodName: 'Bitcoin', provider: 'bitcoin_network', type: 'crypto', countries: ['US', 'GB', 'DE', 'FR', 'JP', 'SG', 'AE', 'BR', 'IN', 'KR', 'MX', 'NG', 'KE', 'AU', 'HK'], currencies: ['BTC'], minAmount: 0.0001, maxAmount: 100, feePercent: 1.0, fixedFee: 1.0, settlementTime: 60, icon: '₿' },
  { methodCode: 'ethereum', methodName: 'Ethereum', provider: 'ethereum_network', type: 'crypto', countries: ['US', 'GB', 'DE', 'FR', 'JP', 'SG', 'AE', 'BR', 'IN', 'KR', 'MX', 'NG', 'KE', 'AU', 'HK'], currencies: ['ETH'], minAmount: 0.001, maxAmount: 1000, feePercent: 1.0, fixedFee: 1.0, settlementTime: 15, icon: '⟠' },
  { methodCode: 'usdc', methodName: 'USDC', provider: 'circle', type: 'crypto', countries: ['US', 'GB', 'DE', 'FR', 'JP', 'SG', 'AE', 'BR', 'IN', 'KR', 'MX', 'NG', 'KE', 'AU', 'HK'], currencies: ['USDC'], minAmount: 1, maxAmount: 10000000, feePercent: 0.5, fixedFee: 0.5, settlementTime: 5, icon: '💰' },
]

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function randomFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRef(prefix: string) {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(randomInt(10000, 99999))
  return `${prefix}-${y}${m}${d}-${rand}`
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

// ============================================================
// SEED FUNCTION
// ============================================================

async function seed() {
  console.log('🌱 Seeding Youngsend database (v2 - expanded)...\n')

  // ==========================================================
  // 1. BUSINESSES (12)
  // ==========================================================
  const businessIds: string[] = []
  for (const biz of BUSINESSES) {
    const id = crypto.randomUUID()
    businessIds.push(id)
    const overallScore = randomFloat(35, 98)
    const business = await db.business.create({
      data: {
        id,
        name: biz.name,
        legalName: biz.legalName,
        registrationNo: biz.registrationNo,
        taxId: biz.taxId,
        country: biz.country,
        city: biz.city,
        industry: biz.industry,
        employeeCount: biz.employeeCount,
        annualRevenue: biz.annualRevenue,
        description: biz.description,
        website: `https://${biz.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        status: Math.random() > 0.2 ? 'verified' : 'pending',
        verifiedAt: Math.random() > 0.2 ? new Date() : null,
        passport: {
          create: {
            passportHash: createHash('sha256').update(id + 'youngsend').digest('hex'),
            credentialLevel: ['basic', 'standard', 'enhanced', 'premium'][randomInt(0, 3)],
            kycStatus: Math.random() > 0.3 ? 'verified' : 'in_progress',
            kycVerifiedAt: Math.random() > 0.3 ? new Date() : null,
            amlStatus: Math.random() > 0.2 ? 'cleared' : 'flagged',
            amlCheckedAt: Math.random() > 0.2 ? new Date() : null,
            riskRating: ['low', 'medium', 'high'][randomInt(0, 2)],
          },
        },
        trustScore: {
          create: {
            overallScore,
            paymentScore: randomFloat(30, 99),
            deliveryScore: randomFloat(30, 99),
            qualityScore: randomFloat(30, 99),
            communicationScore: randomFloat(30, 99),
            complianceScore: randomFloat(30, 99),
            totalReviews: randomInt(5, 120),
            totalTransactions: randomInt(10, 500),
          },
        },
      },
    })
    console.log(`  ✓ Business: ${business.name} (${business.country})`)
  }
  console.log(`  ── 12 businesses created\n`)

  // ==========================================================
  // 2. USERS (10)
  // ==========================================================
  const userIds: string[] = []
  for (const user of USERS) {
    const id = crypto.randomUUID()
    userIds.push(id)
    const u = await db.user.create({
      data: {
        id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId ? businessIds[user.businessId] : null,
        isActive: true,
        lastLoginAt: Math.random() > 0.3 ? new Date(Date.now() - randomInt(0, 72) * 3600000) : null,
      },
    })
    console.log(`  ✓ User: ${u.email} (${u.role})`)
  }
  console.log(`  ── 10 users created\n`)

  // ==========================================================
  // 3. GLOBAL PAYMENT METHODS (40+)
  // ==========================================================
  for (const gpm of GLOBAL_PAYMENT_METHODS) {
    await db.globalPaymentMethod.create({
      data: {
        methodCode: gpm.methodCode,
        methodName: gpm.methodName,
        provider: gpm.provider,
        type: gpm.type,
        countries: JSON.stringify(gpm.countries),
        currencies: JSON.stringify(gpm.currencies),
        minAmount: gpm.minAmount,
        maxAmount: gpm.maxAmount,
        feePercent: gpm.feePercent,
        fixedFee: gpm.fixedFee,
        settlementTime: gpm.settlementTime,
        icon: gpm.icon,
        isActive: true,
      },
    })
  }
  console.log(`  ✓ ${GLOBAL_PAYMENT_METHODS.length} global payment methods created\n`)

  // ==========================================================
  // 4. RELATIONSHIPS (15)
  // ==========================================================
  for (const rel of RELATIONSHIPS) {
    await db.businessRelationship.create({
      data: {
        fromBusinessId: businessIds[rel.from],
        toBusinessId: businessIds[rel.to],
        type: rel.type,
        status: 'active',
        trustLevel: randomFloat(30, 95),
        totalTxVolume: randomFloat(50000, 5000000),
        totalTxCount: randomInt(5, 200),
        firstTxDate: new Date(Date.now() - randomInt(30, 730) * 86400000),
        lastTxDate: new Date(Date.now() - randomInt(0, 30) * 86400000),
      },
    })
  }
  console.log(`  ✓ ${RELATIONSHIPS.length} relationships created\n`)

  // ==========================================================
  // 5. REVIEWS (15)
  // ==========================================================
  const reviewPairs = [
    [0, 1], [1, 0], [2, 9], [3, 7], [5, 8], [6, 10], [4, 11], [7, 1], [9, 2], [10, 6],
    [0, 6], [3, 11], [8, 5], [11, 3], [4, 0],
  ]
  for (const [from, to] of reviewPairs) {
    await db.review.create({
      data: {
        fromBusinessId: businessIds[from],
        toBusinessId: businessIds[to],
        rating: randomFloat(2.5, 5.0),
        paymentRating: randomFloat(3, 5),
        deliveryRating: randomFloat(3, 5),
        qualityRating: randomFloat(3, 5),
        communicationRating: randomFloat(3, 5),
        comment: [
          'Excellent partner. Always delivers on time and maintains high quality standards.',
          'Reliable supplier with consistent product quality. Recommended for long-term contracts.',
          'Good communication throughout the transaction. Minor delays but overall satisfactory.',
          'Outstanding service. The team was responsive and professional from start to finish.',
          'Average experience. Product quality was acceptable but payment processing was slow.',
          'Highly professional operation. Will definitely continue doing business with them.',
          'Fair pricing and good delivery times. Some room for improvement in documentation.',
        ][randomInt(0, 6)],
        status: 'published',
      },
    })
  }
  console.log(`  ✓ ${reviewPairs.length} reviews created\n`)

  // ==========================================================
  // 6. ESCROW TRANSACTIONS (12)
  // ==========================================================
  const escrowIds: string[] = []
  for (let i = 0; i < 12; i++) {
    const buyerIdx = i % businessIds.length
    let sellerIdx = (i + 1 + randomInt(0, 3)) % businessIds.length
    if (sellerIdx === buyerIdx) sellerIdx = (sellerIdx + 1) % businessIds.length

    const amount = randomFloat(5000, 500000)
    const currency = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'SGD'][randomInt(0, 5)]
    const status = STATUSES[i]
    const txRef = generateRef('ESC')
    const id = crypto.randomUUID()
    escrowIds.push(id)

    const isMilestoneBased = Math.random() > 0.5
    const milestoneCount = isMilestoneBased ? randomInt(2, 4) : 1
    const milestoneAmounts = isMilestoneBased
      ? Array.from({ length: milestoneCount }, (_, j) =>
          j === milestoneCount - 1
            ? amount - (amount / milestoneCount) * (milestoneCount - 1)
            : amount / milestoneCount
        )
      : [amount]

    await db.escrowTransaction.create({
      data: {
        id,
        txRef,
        buyerId: businessIds[buyerIdx],
        sellerId: businessIds[sellerIdx],
        amount,
        currency,
        description: [
          'Bulk order of electronic components',
          'Manufacturing equipment procurement',
          'Agricultural commodity shipment',
          'Automotive parts delivery',
          'Freight forwarding services',
          'Precious metals trade settlement',
          'Software license and services',
          'Semiconductor equipment order',
          'Trade finance facility',
          'Specialty tea export shipment',
        ][i % 10],
        status,
        currentMilestone: status === 'completed' ? milestoneCount : status === 'in_escrow' || status === 'disputed' ? randomInt(1, milestoneCount - 1) : 0,
        totalMilestones: milestoneCount,
        fundedAmount: ['funded', 'in_escrow', 'partial_release', 'completed', 'disputed'].includes(status) ? amount : 0,
        releasedAmount: status === 'completed' ? amount : status === 'partial_release' ? amount * 0.6 : 0,
        refundedAmount: status === 'refunded' ? amount : 0,
        feeAmount: amount * 0.015,
        feeCurrency: currency,
        aiRiskScore: randomFloat(5, 85),
        aiRiskLevel: randomFloat(5, 85) < 30 ? 'low' : randomFloat(5, 85) < 70 ? 'medium' : 'high',
        expiresAt: new Date(Date.now() + 30 * 86400000),
        completedAt: status === 'completed' ? new Date(Date.now() - randomInt(1, 60) * 86400000) : null,
        milestones: {
          create: milestoneAmounts.map((ma, j) => ({
            sequence: j + 1,
            title: isMilestoneBased
              ? ['Deposit', 'Production milestone', 'Quality inspection', 'Final delivery'][j] || `Milestone ${j + 1}`
              : 'Full payment',
            amount: ma,
            status: status === 'completed'
              ? 'released'
              : status === 'in_escrow' && j < randomInt(1, milestoneCount)
                ? 'released'
                : 'pending',
            releasedAt: status === 'completed' ? new Date() : null,
          })),
        },
        auditLog: {
          create: {
            action: 'transaction_created',
            actor: businessIds[buyerIdx],
            details: `Escrow transaction ${txRef} created`,
          },
        },
      },
    })
    console.log(`  ✓ Escrow: ${txRef} (${status})`)
  }

  // Dispute for the disputed escrow
  const disputedEscrow = escrowIds[6]
  if (disputedEscrow) {
    await db.dispute.create({
      data: {
        escrowId: disputedEscrow,
        raisedBy: 'buyer',
        reason: 'Product quality does not match agreed specifications',
        description: 'The delivered goods show significant deviation from the quality samples provided during negotiation. 15% of the batch fails QC inspection.',
        status: 'under_review',
        aiRecommendation: 'Based on historical transaction patterns and evidence analysis, recommend partial refund of 15% with seller providing replacement for defective units. Confidence: 78%.',
      },
    })
  }
  console.log(`  ── 12 escrow transactions + 1 dispute created\n`)

  // ==========================================================
  // 7. PAYMENT INTENTS (10)
  // ==========================================================
  const paymentProviders = ['wise', 'stripe', 'paypal', 'local_bank']
  const paymentMethods = ['bank_transfer', 'card', 'crypto', 'mobile_money', 'digital_wallet']
  for (let i = 0; i < 10; i++) {
    const fromIdx = i % businessIds.length
    let toIdx = (i + 3) % businessIds.length
    if (toIdx === fromIdx) toIdx = (toIdx + 1) % businessIds.length

    const sourceCurrency = ['USD', 'EUR', 'CNY', 'GBP', 'JPY'][randomInt(0, 4)]
    const targetCurrency = ['USD', 'EUR', 'CNY', 'GBP', 'JPY'][randomInt(0, 4)]
    const sourceAmount = randomFloat(1000, 200000)
    const rate = randomFloat(0.7, 1.5)

    await db.paymentIntent.create({
      data: {
        intentRef: generateRef('PAY'),
        escrowId: i < escrowIds.length ? escrowIds[i] : null,
        fromBusinessId: businessIds[fromIdx],
        toBusinessId: businessIds[toIdx],
        sourceAmount,
        sourceCurrency,
        targetAmount: sourceAmount * rate,
        targetCurrency,
        exchangeRate: rate,
        status: ['completed', 'completed', 'completed', 'processing', 'failed'][randomInt(0, 4)],
        paymentMethod: paymentMethods[randomInt(0, 4)],
        routingProvider: paymentProviders[randomInt(0, 3)],
        routingScore: randomFloat(0.7, 0.99),
        estimatedFee: sourceAmount * 0.015,
        actualFee: Math.random() > 0.3 ? sourceAmount * randomFloat(0.01, 0.02) : null,
        estimatedTime: randomInt(5, 120),
        completedAt: Math.random() > 0.4 ? new Date(Date.now() - randomInt(1, 30) * 86400000) : null,
      },
    })
  }
  console.log(`  ✓ 10 payment intents created\n`)

  // ==========================================================
  // 8. PAYMENT METHODS (8)
  // ==========================================================
  for (let i = 0; i < 8; i++) {
    await db.paymentMethod.create({
      data: {
        businessId: businessIds[i],
        type: ['bank_account', 'card', 'bank_account', 'digital_wallet'][i % 4],
        provider: ['wise', 'stripe', 'paypal', 'local_bank'][i % 4],
        label: [
          'Primary Business Account',
          'Corporate Visa Card',
          'USD Settlement Account',
          'Digital Wallet - Main',
          'EUR Bank Account',
          'CNY Settlement',
          'PayPal Business',
          'Local Bank Transfer',
        ][i],
        identifier: `****${randomInt(1000, 9999)}`,
        currency: ['USD', 'EUR', 'CNY', 'SGD', 'GBP', 'JPY', 'USD', 'MXN'][i],
        country: BUSINESSES[i].country,
        isDefault: i % 4 === 0,
      },
    })
  }
  console.log(`  ✓ 8 payment methods created\n`)

  // ==========================================================
  // 9. INVOICES (8)
  // ==========================================================
  const invoiceIds: string[] = []
  for (let i = 0; i < 8; i++) {
    const senderIdx = i % businessIds.length
    const receiverIdx = (i + 2) % businessIds.length
    const amount = randomFloat(2000, 150000)
    const statuses = ['paid', 'paid', 'sent', 'overdue', 'draft', 'paid', 'sent', 'partially_paid']
    const status = statuses[i]
    const id = crypto.randomUUID()
    invoiceIds.push(id)

    await db.invoice.create({
      data: {
        id,
        invoiceRef: generateRef('INV'),
        senderId: businessIds[senderIdx],
        receiverId: businessIds[receiverIdx],
        amount,
        currency: ['USD', 'EUR', 'CNY', 'GBP'][randomInt(0, 3)],
        status,
        dueDate: new Date(Date.now() + randomInt(-10, 60) * 86400000),
        paidAmount: ['paid'].includes(status) ? amount : status === 'partially_paid' ? amount * 0.5 : 0,
        items: JSON.stringify([
          { description: 'Product shipment - Order #' + randomInt(10000, 99999), quantity: randomInt(10, 500), unitPrice: randomFloat(10, 500) },
          { description: 'Insurance and handling', quantity: 1, unitPrice: randomFloat(100, 2000) },
        ]),
        notes: 'Payment terms: Net 30. Please reference invoice number in remittance.',
        paidAt: ['paid'].includes(status) ? new Date() : null,
      },
    })
  }
  console.log(`  ✓ 8 invoices created\n`)

  // ==========================================================
  // 10. FINANCIAL DIGITAL TWINS (8)
  // ==========================================================
  for (let i = 0; i < 8; i++) {
    const healthScore = randomFloat(30, 95)
    const twin = await db.financialDigitalTwin.create({
      data: {
        businessId: businessIds[i],
        healthScore,
        cashFlowHealth: randomFloat(25, 95),
        riskAppetite: ['conservative', 'moderate', 'aggressive'][randomInt(0, 2)],
        creditWorthiness: randomFloat(30, 95),
        liquidityScore: randomFloat(25, 95),
        growthTrajectory: ['declining', 'stable', 'growing', 'rapid_growth'][randomInt(0, 3)],
        aiModelVersion: 'v1.0',
        metrics: {
          create: Array.from({ length: 6 }, (_, m) => {
            const date = new Date()
            date.setMonth(date.getMonth() - (5 - m))
            const revenue = randomFloat(100000, 5000000)
            const expenses = revenue * randomFloat(0.6, 0.9)
            return {
              period: 'monthly',
              periodDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
              revenue,
              expenses,
              netIncome: revenue - expenses,
              cashBalance: randomFloat(50000, 2000000),
              transactionCount: randomInt(20, 300),
              averageTransactionValue: randomFloat(2000, 50000),
              paymentSuccessRate: randomFloat(0.85, 0.99),
              disputeRate: randomFloat(0, 0.08),
              customerCount: randomInt(5, 50),
              supplierCount: randomInt(3, 30),
            }
          }),
        },
        predictions: {
          create: [
            { predictionType: 'revenue', timeframe: '30d', predictedValue: randomFloat(200000, 6000000), confidence: randomFloat(0.65, 0.95), lowerBound: randomFloat(150000, 4000000), upperBound: randomFloat(300000, 8000000), model: 'ensemble_v2' },
            { predictionType: 'revenue', timeframe: '90d', predictedValue: randomFloat(600000, 18000000), confidence: randomFloat(0.55, 0.85), lowerBound: randomFloat(400000, 12000000), upperBound: randomFloat(800000, 24000000), model: 'ensemble_v2' },
            { predictionType: 'cash_flow', timeframe: '30d', predictedValue: randomFloat(100000, 3000000), confidence: randomFloat(0.7, 0.92), lowerBound: randomFloat(50000, 2000000), upperBound: randomFloat(150000, 4000000), model: 'ensemble_v2' },
            { predictionType: 'risk', timeframe: '30d', predictedValue: randomFloat(0.02, 0.25), confidence: randomFloat(0.6, 0.9), lowerBound: 0, upperBound: randomFloat(0.1, 0.4), model: 'ensemble_v2' },
            { predictionType: 'growth_rate', timeframe: '6m', predictedValue: randomFloat(-5, 25), confidence: randomFloat(0.6, 0.88), lowerBound: randomFloat(-15, 10), upperBound: randomFloat(5, 35), model: 'ensemble_v2' },
          ],
        },
        snapshots: {
          create: {
            snapshotType: 'daily',
            healthScore,
            cashFlowHealth: randomFloat(25, 95),
            creditWorthiness: randomFloat(30, 95),
            liquidityScore: randomFloat(25, 95),
            topRiskFactors: JSON.stringify([
              'High accounts receivable aging (45+ days)',
              'Currency exposure in 3 markets',
              'Concentration risk: Top 3 clients = 65% revenue',
            ]),
            topOpportunities: JSON.stringify([
              'Expand to 2 new markets (Vietnam, Colombia)',
              'Negotiate 10% better payment terms with suppliers',
              'AI-driven demand forecasting could reduce inventory costs by 12%',
            ]),
            aiSummary: `Financial health is ${healthScore > 70 ? 'strong' : healthScore > 50 ? 'moderate' : 'needs attention'} with ${healthScore > 70 ? 'healthy' : 'tight'} cash flow. Revenue trend shows ${healthScore > 60 ? 'positive' : 'flat'} momentum. Key risk areas include receivables management and currency exposure.`,
          },
        },
      },
    })
    console.log(`  ✓ Digital Twin: ${BUSINESSES[i].name} (health: ${healthScore})`)
  }
  console.log(`  ── 8 digital twins created\n`)

  // ==========================================================
  // 11. COMPLIANCE DOCUMENTS (18)
  // ==========================================================
  for (let i = 0; i < 6; i++) {
    const passport = await db.commercePassport.findFirst({
      where: { businessId: businessIds[i] },
    })
    if (passport) {
      const docTypes = ['certificate_of_incorporation', 'tax_registration', 'bank_statement', 'proof_of_address', 'license']
      for (let j = 0; j < 3; j++) {
        await db.complianceDocument.create({
          data: {
            passportId: passport.id,
            docType: docTypes[(i + j) % docTypes.length],
            docName: `${docTypes[(i + j) % docTypes.length].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${BUSINESSES[i].name}`,
            status: Math.random() > 0.3 ? 'approved' : 'pending',
            expiresAt: new Date(Date.now() + randomInt(180, 730) * 86400000),
          },
        })
      }
    }
  }
  console.log(`  ✓ 18 compliance documents created\n`)

  // ==========================================================
  // 12. VERIFICATIONS (40)
  // ==========================================================
  for (let i = 0; i < 8; i++) {
    const types = ['identity', 'business_registration', 'tax', 'bank_account', 'address']
    for (const type of types) {
      await db.verification.create({
        data: {
          businessId: businessIds[i],
          type,
          method: ['document', 'api', 'manual', 'third_party'][randomInt(0, 3)],
          status: Math.random() > 0.3 ? 'approved' : Math.random() > 0.5 ? 'in_progress' : 'pending',
          verifiedAt: Math.random() > 0.3 ? new Date(Date.now() - randomInt(1, 90) * 86400000) : null,
        },
      })
    }
  }
  console.log(`  ✓ 40 verifications created\n`)

  // ==========================================================
  // 13. CURRENCY RATES (10)
  // ==========================================================
  const rates = [
    { from: 'USD', to: 'EUR', rate: 0.92 },
    { from: 'USD', to: 'GBP', rate: 0.79 },
    { from: 'USD', to: 'CNY', rate: 7.24 },
    { from: 'USD', to: 'JPY', rate: 157.5 },
    { from: 'EUR', to: 'GBP', rate: 0.86 },
    { from: 'USD', to: 'SGD', rate: 1.35 },
    { from: 'USD', to: 'INR', rate: 83.5 },
    { from: 'USD', to: 'BRL', rate: 4.97 },
    { from: 'USD', to: 'KRW', rate: 1375.0 },
    { from: 'USD', to: 'MXN', rate: 17.15 },
  ]
  for (const r of rates) {
    await db.currencyRate.create({
      data: {
        fromCurrency: r.from,
        toCurrency: r.to,
        rate: r.rate + randomFloat(-0.01, 0.01),
        provider: 'youngsend_ai',
        source: 'composite_market_feed',
        expiresAt: new Date(Date.now() + 3600000),
      },
    })
  }
  console.log(`  ✓ 10 currency rates created\n`)

  // ==========================================================
  // 14. PAYMENT LINKS (8) + payments per link
  // ==========================================================
  console.log('── NEW DATA ──\n')
  const paymentLinkConfigs = [
    { bizIdx: 0, title: 'Electronics Component Payment', amount: 25000, currency: 'CNY', expired: false, maxPayments: 5 },
    { bizIdx: 1, title: 'Manufacturing Equipment Invoice', amount: 85000, currency: 'EUR', expired: false, maxPayments: 1 },
    { bizIdx: 2, title: 'Agricultural Commodity Order', amount: 0, currency: 'USD', expired: false, maxPayments: 10 },
    { bizIdx: 3, title: 'Automotive Parts Payment', amount: 150000, currency: 'BRL', expired: true, maxPayments: 3 },
    { bizIdx: 4, title: 'Logistics Services Invoice', amount: 12000, currency: 'SGD', expired: false, maxPayments: 4 },
  { bizIdx: 0, title: 'Shanghai TechExim - Open Payment', amount: 0, currency: 'USD', expired: false, maxPayments: 0 },
    { bizIdx: 1, title: 'Berlin Trade Haus - GBP Invoice', amount: 42000, currency: 'GBP', expired: false, maxPayments: 2 },
    { bizIdx: 2, title: 'Lagos Mercantile - JPY Settlement', amount: 5000000, currency: 'JPY', expired: true, maxPayments: 1 },
  ]

  for (const cfg of paymentLinkConfigs) {
    const linkId = crypto.randomUUID()
    const isActive = !cfg.expired
    const status = cfg.expired ? 'expired' : 'active'
    const paymentCount = cfg.expired ? 0 : randomInt(2, cfg.maxPayments === 0 ? 5 : Math.min(5, cfg.maxPayments))
    const payMethods = ['bank_transfer', 'card', 'mobile_money', 'digital_wallet']
    const payerNames = ['Carlos Mendez', 'Aiko Tanaka', 'Fatima Al-Rashid', 'Lars Eriksson', 'Priya Nair', 'James O\'Brien', 'Yuki Sato', 'Oluwaseun Adeyemi']
    const payerCountries = ['BR', 'JP', 'AE', 'SE', 'IN', 'GB', 'JP', 'NG']

    await db.paymentLink.create({
      data: {
        id: linkId,
        linkRef: generateRef('PLK'),
        businessId: businessIds[cfg.bizIdx],
        title: cfg.title,
        description: `Payment link for ${cfg.title}. ${cfg.amount === 0 ? 'Payer specifies amount.' : `Fixed amount: ${cfg.currency} ${cfg.amount.toLocaleString()}`}`,
        amount: cfg.amount,
        currency: cfg.currency,
        allowedMethods: JSON.stringify(payMethods),
        maxPayments: cfg.maxPayments,
        paymentCount,
        totalCollected: paymentCount * (cfg.amount > 0 ? cfg.amount : randomFloat(5000, 50000)),
        status,
        expiresAt: cfg.expired ? new Date(Date.now() - randomInt(1, 30) * 86400000) : new Date(Date.now() + 90 * 86400000),
        payments: {
          create: Array.from({ length: paymentCount }, (_, pi) => {
            const payAmount = cfg.amount > 0 ? cfg.amount : randomFloat(5000, 50000)
            const payStatus = pick(['completed', 'completed', 'completed', 'pending', 'failed'])
            return {
              payerName: payerNames[pi % payerNames.length],
              payerEmail: `${payerNames[pi % payerNames.length].toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
              payerCountry: payerCountries[pi % payerCountries.length],
              amount: payAmount,
              currency: cfg.currency,
              paymentMethod: payMethods[pi % payMethods.length],
              provider: pick(['stripe', 'wise', 'local_bank']),
              status: payStatus,
              feeAmount: payAmount * 0.02,
              netAmount: payAmount * 0.98,
              completedAt: payStatus === 'completed' ? new Date(Date.now() - randomInt(1, 14) * 86400000) : null,
            }
          }),
        },
      },
    })
  }
  console.log(`  ✓ 8 payment links with payments created\n`)

  // ==========================================================
  // 15. WALLETS (15) for first 5 businesses
  // ==========================================================
  const walletConfigs = [
    { bizIdx: 0, currency: 'USD', balance: 250000 },
    { bizIdx: 0, currency: 'CNY', balance: 1800000 },
    { bizIdx: 0, currency: 'EUR', balance: 75000 },
    { bizIdx: 1, currency: 'USD', balance: 120000 },
    { bizIdx: 1, currency: 'EUR', balance: 350000 },
    { bizIdx: 1, currency: 'GBP', balance: 45000 },
    { bizIdx: 2, currency: 'USD', balance: 85000 },
    { bizIdx: 2, currency: 'NGN', balance: 42000000 },
    { bizIdx: 3, currency: 'USD', balance: 500000 },
    { bizIdx: 3, currency: 'BRL', balance: 1200000 },
    { bizIdx: 3, currency: 'EUR', balance: 60000 },
    { bizIdx: 4, currency: 'USD', balance: 280000 },
    { bizIdx: 4, currency: 'SGD', balance: 180000 },
    { bizIdx: 4, currency: 'CNY', balance: 500000 },
    { bizIdx: 4, currency: 'JPY', balance: 15000000 },
  ]

  for (const wc of walletConfigs) {
    const walletId = crypto.randomUUID()
    const pendingBal = wc.balance * randomFloat(0.02, 0.15)
    const frozenBal = Math.random() > 0.7 ? wc.balance * randomFloat(0.01, 0.05) : 0
    const availableBal = wc.balance - pendingBal - frozenBal

    const wallet = await db.wallet.create({
      data: {
        id: walletId,
        businessId: businessIds[wc.bizIdx],
        currency: wc.currency,
        balance: wc.balance,
        availableBalance: availableBal,
        pendingBalance: pendingBal,
        frozenBalance: frozenBal,
        isDefault: wc.currency === 'USD',
        status: 'active',
      },
    })

    // Create 3-5 wallet transactions per wallet
    const txCount = randomInt(3, 5)
    let runningBalance = wc.balance
    const txTypes = ['credit', 'debit', 'fee', 'conversion', 'credit']
    const descriptions = [
      'Escrow release - ESC-' + randomInt(20240000, 20259999),
      'Payment received from trade partner',
      'Platform service fee',
      'Currency conversion - ' + wc.currency + ' to USD',
      'Invoice payment received',
      'Wallet top-up via bank transfer',
      'Refund from cancelled transaction',
      'Payment link collection',
    ]
    const refTypes = ['escrow', 'payment_link', 'invoice', 'conversion', 'transfer']

    for (let t = 0; t < txCount; t++) {
      const txType = txTypes[t % txTypes.length]
      const amount = randomFloat(500, runningBalance * 0.3)
      const balanceBefore = runningBalance
      const balanceAfter = txType === 'credit' ? runningBalance + amount : txType === 'debit' || txType === 'fee' ? runningBalance - amount : runningBalance
      runningBalance = balanceAfter

      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          txRef: generateRef('WLT'),
          type: txType,
          amount,
          balanceBefore,
          balanceAfter,
          currency: wc.currency,
          description: descriptions[t % descriptions.length],
          referenceType: refTypes[t % refTypes.length],
          referenceId: crypto.randomUUID(),
          status: 'completed',
        },
      })
    }
    console.log(`  ✓ Wallet: ${BUSINESSES[wc.bizIdx].name} (${wc.currency}) - ${wc.currency === 'JPY' || wc.currency === 'NGN' ? '¥' : '$'}${wc.balance.toLocaleString()}`)
  }
  console.log(`  ── 15 wallets with transactions created\n`)

  // ==========================================================
  // 16. FRAUD ALERTS (12)
  // ==========================================================
  const fraudAlerts = [
    { fraudType: 'unusual_amount', severity: 'high', score: 88, status: 'investigating', businessIdx: 0, description: 'Transaction of $450,000 detected — 3.5x above average for this business.' },
    { fraudType: 'unusual_amount', severity: 'medium', score: 62, status: 'false_positive', businessIdx: 1, description: 'Large payment of €82,000 flagged as above normal threshold but matches seasonal pattern.' },
    { fraudType: 'unusual_amount', severity: 'low', score: 45, status: 'resolved', businessIdx: 2, description: 'Payment amount slightly above average. Verified as legitimate bulk order.' },
    { fraudType: 'velocity_breach', severity: 'high', score: 85, status: 'investigating', businessIdx: 3, description: '15 transactions initiated within 45 minutes — exceeds velocity threshold of 10/hour.' },
    { fraudType: 'velocity_breach', severity: 'medium', score: 70, status: 'open', businessIdx: 4, description: '8 payment attempts in 30 minutes from same business account.' },
    { fraudType: 'geo_mismatch', severity: 'medium', score: 58, status: 'open', businessIdx: 5, description: 'Login from Dubai, UAE but transaction initiated from Lagos, NG within 5 minutes.' },
    { fraudType: 'geo_mismatch', severity: 'high', score: 78, status: 'confirmed_fraud', businessIdx: 6, description: 'Account login in Mumbai but payment originated from a VPN exit in Eastern Europe.' },
    { fraudType: 'sanctioned_entity', severity: 'critical', score: 95, status: 'confirmed_fraud', businessIdx: null, description: 'Counterparty entity name partial match on OFAC SDN list. Potential sanctions evasion.' },
    { fraudType: 'sanctioned_entity', severity: 'high', score: 82, status: 'investigating', businessIdx: 7, description: 'Transaction with entity registered in high-risk jurisdiction. Awaiting enhanced due diligence.' },
    { fraudType: 'fake_identity', severity: 'critical', score: 92, status: 'open', businessIdx: null, description: 'Submitted KYC documents show signs of digital manipulation. Multiple metadata inconsistencies detected.' },
    { fraudType: 'account_takeover', severity: 'high', score: 80, status: 'false_positive', businessIdx: 8, description: 'Unusual login pattern detected but confirmed as legitimate user traveling internationally.' },
    { fraudType: 'account_takeover', severity: 'medium', score: 55, status: 'resolved', businessIdx: 9, description: 'Password change and immediate large transfer. Verified via phone call with account holder.' },
  ]

  for (const fa of fraudAlerts) {
    await db.fraudAlert.create({
      data: {
        alertRef: generateRef('FRD'),
        businessId: fa.businessIdx !== null ? businessIds[fa.businessIdx] : null,
        relatedType: 'escrow',
        relatedId: escrowIds[randomInt(0, escrowIds.length - 1)],
        severity: fa.severity,
        fraudType: fa.fraudType,
        score: fa.score,
        description: fa.description,
        recommendation: fa.severity === 'critical' || fa.severity === 'high'
          ? 'Immediately freeze associated transactions and escalate to compliance team for manual review.'
          : fa.severity === 'medium'
            ? 'Flag for enhanced monitoring. Require additional verification for next transaction.'
            : 'Log and monitor. No immediate action required.',
        status: fa.status,
        resolvedBy: ['confirmed_fraud', 'false_positive', 'resolved'].includes(fa.status) ? userIds[8] : null, // auditor
        resolvedAt: ['confirmed_fraud', 'false_positive', 'resolved'].includes(fa.status) ? new Date(Date.now() - randomInt(1, 7) * 86400000) : null,
      },
    })
  }
  console.log(`  ✓ 12 fraud alerts created\n`)

  // ==========================================================
  // 17. FRAUD RULES (6)
  // ==========================================================
  const fraudRules = [
    { name: 'Large Transaction Alert', description: 'Flags transactions exceeding $100,000 for manual review', condition: JSON.stringify({ field: 'amount', operator: 'greater_than', value: 100000, currency: 'USD' }), action: 'flag_for_review', severity: 'high', triggerCount: randomInt(5, 50) },
    { name: 'Velocity Breach', description: 'Alerts when more than 10 transactions are initiated within 1 hour from the same account', condition: JSON.stringify({ field: 'transaction_count', operator: 'greater_than', value: 10, window_minutes: 60 }), action: 'alert', severity: 'high', triggerCount: randomInt(2, 20) },
    { name: 'High-Risk Country', description: 'Blocks transactions involving parties in sanctioned or high-risk countries', condition: JSON.stringify({ field: 'country', operator: 'in', value: ['KP', 'IR', 'SY', 'CU', 'VE'], list_type: 'sanctions' }), action: 'block', severity: 'critical', triggerCount: randomInt(0, 5) },
    { name: 'New Account Large Payment', description: 'Reviews first transactions above $50,000 from accounts less than 30 days old', condition: JSON.stringify({ field: 'amount', operator: 'greater_than', value: 50000, account_age_days: 30, is_first_transaction: true }), action: 'require_review', severity: 'medium', triggerCount: randomInt(1, 15) },
    { name: 'Structuring Pattern', description: 'Detects multiple transactions just below the $10,000 reporting threshold within 24 hours', condition: JSON.stringify({ field: 'amount', operator: 'between', min: 9000, max: 9999.99, count_threshold: 3, window_minutes: 1440 }), action: 'alert', severity: 'high', triggerCount: randomInt(1, 8) },
    { name: 'Geo Mismatch', description: 'Flags when account login and transaction initiation originate from different countries', condition: JSON.stringify({ field: 'login_country', operator: 'not_equals', value: 'transaction_country', time_window_minutes: 30 }), action: 'flag_for_review', severity: 'medium', triggerCount: randomInt(3, 25) },
  ]

  for (const fr of fraudRules) {
    await db.fraudRule.create({
      data: {
        name: fr.name,
        description: fr.description,
        condition: fr.condition,
        action: fr.action,
        severity: fr.severity,
        isActive: true,
        triggerCount: fr.triggerCount,
        lastTriggeredAt: new Date(Date.now() - randomInt(1, 48) * 3600000),
      },
    })
  }
  console.log(`  ✓ 6 fraud rules created\n`)

  // ==========================================================
  // 18. BUSINESS MATCHES (15) — 3 per first 5 businesses
  // ==========================================================
  const matchReasons = ['Industry complementarity', 'Geographic proximity', 'Trust score alignment', 'Payment history compatibility', 'Similar transaction volume']
  const matchStatuses = ['suggested', 'contacted', 'interested', 'declined', 'engaged']
  const matchTypes = ['supplier', 'buyer', 'partner']

  // Candidate pools for each seeker (avoiding self and duplicates)
  const candidatePools: number[][] = [
    [1, 4, 5, 7, 8, 9, 10, 11],   // Business 0 candidates
    [0, 3, 5, 6, 7, 8, 10, 11],    // Business 1 candidates
    [0, 4, 5, 6, 8, 9, 10, 11],    // Business 2 candidates
    [1, 4, 7, 8, 9, 10, 11],        // Business 3 candidates
    [0, 1, 2, 3, 5, 6, 7, 10, 11],  // Business 4 candidates
  ]

  for (let seekerIdx = 0; seekerIdx < 5; seekerIdx++) {
    const pool = candidatePools[seekerIdx]
    // Pick 3 random unique candidates
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 3)

    for (const candIdx of selected) {
      const score = randomFloat(60, 95)
      // Pick 2-3 random reasons
      const numReasons = randomInt(2, 3)
      const reasons = [...matchReasons].sort(() => Math.random() - 0.5).slice(0, numReasons)

      await db.businessMatch.create({
        data: {
          seekerId: businessIds[seekerIdx],
          candidateId: businessIds[candIdx],
          matchType: matchTypes[randomInt(0, 2)],
          matchScore: score,
          reasons: JSON.stringify(reasons),
          status: matchStatuses[randomInt(0, 4)],
          seekerResponse: Math.random() > 0.5 ? 'Interested in exploring partnership opportunities' : null,
          candidateResponse: Math.random() > 0.6 ? 'Open to discussing terms' : null,
        },
      })
    }
  }
  console.log(`  ✓ 15 business matches created\n`)

  // ==========================================================
  // 19. COLLECTION CASES (10)
  // ==========================================================
  const collectionConfigs = [
    { invoiceIdx: 2, agingBucket: '31-60', priority: 'high', strategy: 'Send friendly reminder first, escalate to firm notice in 7 days if no response. Consider offering 2% early payment discount.' },
    { invoiceIdx: 3, agingBucket: '61-90', priority: 'urgent', strategy: 'Immediate phone contact required. Send formal demand letter. Assess debtor financial health via digital twin data. Prepare for potential escrow dispute.' },
    { invoiceIdx: 6, agingBucket: '1-30', priority: 'normal', strategy: 'Send friendly reminder first, escalate to firm notice in 7 days if no response.' },
    { invoiceIdx: 7, agingBucket: 'current', priority: 'low', strategy: 'Automated payment reminder. Monitor for next 5 days before escalation.' },
    { invoiceIdx: 2, agingBucket: '90+', priority: 'urgent', strategy: 'Engage legal counsel. Initiate mediation. Restrict future trade until resolution. Report to trust graph for score impact.' },
    { invoiceIdx: 3, agingBucket: '31-60', priority: 'high', strategy: 'Multi-channel outreach: email + WhatsApp + phone. Offer structured payment plan. Leverage relationship trust score as incentive.' },
    { invoiceIdx: 6, agingBucket: '61-90', priority: 'high', strategy: 'Escalate to senior management. Consider partial payment arrangement. Flag for compliance review if amount exceeds reporting threshold.' },
    { invoiceIdx: 7, agingBucket: '1-30', priority: 'normal', strategy: 'Send payment reminder with invoice copy attached. Offer early payment incentive.' },
    { invoiceIdx: 2, agingBucket: '31-60', priority: 'normal', strategy: 'Automated follow-up sequence. Track response rate. Engage if no acknowledgment in 3 days.' },
    { invoiceIdx: 3, agingBucket: '90+', priority: 'urgent', strategy: 'Final legal notice. Assess write-off probability using AI prediction model. Coordinate with finance for provision booking.' },
  ]

  const channels = ['email', 'sms', 'whatsapp', 'in_app']
  const templates = ['friendly', 'firm', 'final', 'legal']

  for (const cc of collectionConfigs) {
    const caseId = crypto.randomUUID()
    const reminderCount = randomInt(1, 3)
    // Find the invoice to get the debtor
    const inv = await db.invoice.findFirst({
      where: { id: invoiceIds[cc.invoiceIdx] },
    })
    if (!inv) continue

    await db.collectionCase.create({
      data: {
        id: caseId,
        caseRef: generateRef('COL'),
        invoiceId: inv.id,
        businessId: inv.senderId,
        debtorId: inv.receiverId,
        originalAmount: inv.amount,
        outstandingAmount: inv.amount - inv.paidAmount,
        currency: inv.currency,
        agingBucket: cc.agingBucket,
        priority: cc.priority,
        status: Math.random() > 0.3 ? 'active' : 'resolved',
        reminderCount,
        lastReminderAt: new Date(Date.now() - randomInt(1, 14) * 86400000),
        nextReminderDue: new Date(Date.now() + randomInt(1, 7) * 86400000),
        aiStrategy: cc.strategy,
        resolution: Math.random() > 0.7 ? 'Partial payment received. Remaining balance scheduled for next billing cycle.' : null,
        resolvedAt: Math.random() > 0.7 ? new Date(Date.now() - randomInt(1, 5) * 86400000) : null,
        reminders: {
          create: Array.from({ length: reminderCount }, (_, ri) => {
            const sentDate = new Date(Date.now() - (reminderCount - ri) * randomInt(2, 5) * 86400000)
            return {
              channel: channels[ri % channels.length],
              template: ri === 0 ? 'friendly' : ri === reminderCount - 1 ? 'firm' : templates[randomInt(1, 2)],
              status: pick(['sent', 'delivered', 'read', 'read']),
              sentAt: sentDate,
              response: Math.random() > 0.4 ? 'Acknowledged. Will process payment by end of week.' : null,
              respondedAt: Math.random() > 0.4 ? new Date(sentDate.getTime() + randomInt(4, 48) * 3600000) : null,
            }
          }),
        },
      },
    })
  }
  console.log(`  ✓ 10 collection cases with reminders created\n`)

  // ==========================================================
  // 20. COMPLIANCE RULES (8)
  // ==========================================================
  const complianceRules = [
    { name: 'OFAC Sanctions Screening', description: 'Screen all counterparties against OFAC Specially Designated Nationals (SDN) list before transaction processing', ruleType: 'sanctions_check', condition: JSON.stringify({ lists: ['ofac_sdn', 'eu_consolidated', 'un_sanctions'], match_threshold: 0.85, screen_on: ['transaction_create', 'business_onboard'] }), action: 'block', severity: 'critical', triggeredCount: randomInt(1, 10) },
    { name: 'PEP Screening', description: 'Identify Politically Exposed Persons among business owners and authorized signatories', ruleType: 'kyc_requirement', condition: JSON.stringify({ sources: ['world_check', 'dow_jones', 'lexis_nexis'], positions: ['head_of_state', 'senior_government', 'central_bank_governor', 'military_general'] }), action: 'flag_for_review', severity: 'high', triggeredCount: randomInt(0, 5) },
    { name: 'High-Value Transaction Review', description: 'Any transaction exceeding €10,000 requires enhanced due diligence and compliance approval', ruleType: 'aml_threshold', condition: JSON.stringify({ threshold_amount: 10000, threshold_currency: 'EUR', actions: ['enhanced_due_diligence', 'compliance_approval', 'source_of_funds_check'] }), action: 'require_additional_doc', severity: 'high', triggeredCount: randomInt(5, 30) },
    { name: 'Country Risk Assessment', description: 'Classify transaction risk based on FATF grey/black list and country risk indices', ruleType: 'country_restriction', condition: JSON.stringify({ fatf_list: ['grey', 'black'], risk_indices: { corruption: 5, terrorism: 5, money_laundering: 5 }, restricted_countries: ['KP', 'IR', 'SY'] }), action: 'flag_for_review', severity: 'medium', triggeredCount: randomInt(10, 50) },
    { name: 'Industry Restriction', description: 'Block transactions involving arms, gambling, and other restricted industries', ruleType: 'industry_restriction', condition: JSON.stringify({ restricted_industries: ['arms_and_defense', 'gambling', 'cryptocurrency_mining', 'tobacco', 'adult_entertainment'], naics_codes: ['332995', '7132', '519290'] }), action: 'block', severity: 'critical', triggeredCount: randomInt(0, 3) },
    { name: 'KYC Document Expiry', description: 'Alert when KYC documents are within 30 days of expiry or already expired', ruleType: 'kyc_requirement', condition: JSON.stringify({ warning_days: 30, block_days: 0, document_types: ['certificate_of_incorporation', 'tax_registration', 'proof_of_address', 'license'] }), action: 'flag_for_review', severity: 'medium', triggeredCount: randomInt(8, 20) },
    { name: 'Transaction Limit by Credential Level', description: 'Enforce transaction limits based on Commerce Passport credential level', ruleType: 'transaction_limit', condition: JSON.stringify({ limits: { basic: { daily: 5000, monthly: 50000 }, standard: { daily: 25000, monthly: 250000 }, enhanced: { daily: 100000, monthly: 1000000 }, premium: { daily: 500000, monthly: 5000000 } }, currency: 'USD' }), action: 'block', severity: 'medium', triggeredCount: randomInt(15, 40) },
    { name: 'Duplicate Payment Detection', description: 'Detect and prevent duplicate payments by checking amount, counterparty, and time proximity', ruleType: 'aml_threshold', condition: JSON.stringify({ match_fields: ['amount', 'currency', 'counterparty_id'], time_window_minutes: 1440, tolerance_percent: 0.01 }), action: 'block', severity: 'medium', triggeredCount: randomInt(2, 12) },
  ]

  for (const cr of complianceRules) {
    await db.complianceRule.create({
      data: {
        name: cr.name,
        description: cr.description,
        ruleType: cr.ruleType,
        condition: cr.condition,
        action: cr.action,
        severity: cr.severity,
        isActive: true,
        triggeredCount: cr.triggeredCount,
      },
    })
  }
  console.log(`  ✓ 8 compliance rules created\n`)

  // ==========================================================
  // 21. COMPLIANCE SCREENINGS (15)
  // ==========================================================
  const screeningConfigs = [
    { bizIdx: 0, screeningType: 'sanctions', result: 'clear', riskLevel: 'low' },
    { bizIdx: 1, screeningType: 'pep', result: 'clear', riskLevel: 'low' },
    { bizIdx: 2, screeningType: 'adverse_media', result: 'potential_match', riskLevel: 'medium' },
    { bizIdx: 3, screeningType: 'sanctions', result: 'clear', riskLevel: 'low' },
    { bizIdx: 4, screeningType: 'country_risk', result: 'clear', riskLevel: 'low' },
    { bizIdx: 5, screeningType: 'sanctions', result: 'alert', riskLevel: 'high' },
    { bizIdx: 6, screeningType: 'pep', result: 'clear', riskLevel: 'low' },
    { bizIdx: 7, screeningType: 'adverse_media', result: 'clear', riskLevel: 'low' },
    { bizIdx: 8, screeningType: 'sanctions', result: 'clear', riskLevel: 'low' },
    { bizIdx: 9, screeningType: 'country_risk', result: 'potential_match', riskLevel: 'medium' },
    { bizIdx: 10, screeningType: 'pep', result: 'match', riskLevel: 'high' },
    { bizIdx: 11, screeningType: 'sanctions', result: 'clear', riskLevel: 'low' },
    { bizIdx: 0, screeningType: 'country_risk', result: 'clear', riskLevel: 'low' },
    { bizIdx: 3, screeningType: 'adverse_media', result: 'potential_match', riskLevel: 'medium' },
    { bizIdx: 7, screeningType: 'pep', result: 'clear', riskLevel: 'low' },
  ]

  const screeningDetails: Record<string, string> = {
    'clear': 'No matches found across all screened databases. Business entity and associated persons cleared.',
    'potential_match': 'Partial name match found. Requires manual review to confirm or dismiss.',
    'match': 'Positive match identified. Enhanced due diligence required before proceeding.',
    'alert': 'Entity operates in or transacts with high-risk jurisdictions. Additional documentation requested.',
  }

  for (const sc of screeningConfigs) {
    await db.complianceScreening.create({
      data: {
        businessId: businessIds[sc.bizIdx],
        transactionType: 'escrow',
        transactionId: escrowIds[sc.bizIdx % escrowIds.length],
        screeningType: sc.screeningType,
        result: sc.result,
        riskLevel: sc.riskLevel,
        details: screeningDetails[sc.result],
        matchedLists: sc.result !== 'clear' ? JSON.stringify([sc.screeningType === 'sanctions' ? 'OFAC SDN List' : sc.screeningType === 'pep' ? 'World-Check PEP Database' : sc.screeningType === 'adverse_media' ? 'Reuters Adverse Media' : 'FATF Grey List']) : null,
        status: sc.result === 'clear' ? 'completed' : sc.result === 'alert' || sc.result === 'match' ? 'escalated' : 'completed',
        reviewedBy: sc.result !== 'clear' ? userIds[8] : null, // auditor
        reviewedAt: sc.result !== 'clear' ? new Date(Date.now() - randomInt(1, 5) * 86400000) : null,
      },
    })
  }
  console.log(`  ✓ 15 compliance screenings created\n`)

  // ==========================================================
  // FINAL SUMMARY
  // ==========================================================
  console.log('\n' + '='.repeat(60))
  console.log('✅ Youngsend v2 Seeding Complete!')
  console.log('='.repeat(60))
  console.log(`
  ORIGINAL DATA (recreated):
    12  businesses (with passports + trust scores)
    15  business relationships
    15  reviews
    12  escrow transactions (with milestones + audit logs)
     1  dispute
    10  payment intents
     8  payment methods
     8  invoices
     8  financial digital twins (6mo metrics + predictions + snapshots)
    18  compliance documents
    40  verifications
    10  currency rates

  NEW DATA (added):
    10  users (2 admin, 3 seller, 3 buyer, 1 auditor, 1 viewer)
    ${GLOBAL_PAYMENT_METHODS.length}  global payment methods (mobile money, wallets, RTP, bank, cards, crypto)
     8  payment links (with 2-5 payments each)
    15  wallets (with 3-5 transactions each)
    12  fraud alerts (mixed types, severities, statuses)
     6  fraud rules
    15  business matches (AI-generated)
    10  collection cases (with reminders)
     8  compliance rules
    15  compliance screenings

  TOTAL RECORDS: ~268+
`)
  console.log('='.repeat(60))
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
