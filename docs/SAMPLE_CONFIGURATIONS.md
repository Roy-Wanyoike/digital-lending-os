# Digital Lending OS - Sample Configurations

<div align="center">

**Example Tenant Setups for Different DCP Types**

Version 2.0.0

[Tier 1 - Enterprise](#tier-1-enterprise-configuration) • [Tier 2 - Professional](#tier-2-professional-configuration) • [Tier 4 - Starter](#tier-4-starter-configuration) • [Custom Products](#custom-loan-product-examples)

</div>

---

## Table of Contents

1. [Introduction](#introduction)
2. [Tenant Plans Overview](#tenant-plans-overview)
3. [Tier 1 - Enterprise Configuration](#tier-1-enterprise-configuration)
4. [Tier 2 - Professional Configuration](#tier-2-professional-configuration)
5. [Tier 4 - Starter Configuration](#tier-4-starter-configuration)
6. [Custom Loan Product Examples](#custom-loan-product-examples)
7. [Workflow Configuration Examples](#workflow-configuration-examples)
8. [Branding Configuration Examples](#branding-configuration-examples)
9. [Complete Tenant Setup API Examples](#complete-tenant-setup-api-examples)

---

## Introduction

This document provides sample configurations for different types of Digital Credit Providers (DCPs) using Digital Lending OS. Each configuration is tailored to specific business sizes, needs, and regulatory requirements.

### Using These Samples

These configurations can be used as:

1. **Reference templates** for setting up new tenants
2. **Documentation examples** for understanding configuration options
3. **Testing data** for development and QA environments
4. **Migration guides** when onboarding new DCPs

### Configuration Structure

Each tenant configuration includes:

| Component | Description |
|-----------|-------------|
| **Basic Info** | Name, contact, licensing details |
| **Branding** | Visual identity settings |
| **Plan Features** | Available features based on subscription |
| **Loan Products** | Configured lending products |
| **Workflows** | Approval and disbursement processes |
| **Users & Roles** | Team structure and permissions |

---

## Tenant Plans Overview

### Plan Comparison Table

| Feature | STARTER (Tier 4) | PROFESSIONAL (Tier 2) | ENTERPRISE (Tier 1) |
|---------|-------------------|----------------------|---------------------|
| **Monthly Fee** | KSh 5,000 | KSh 15,000 | KSh 50,000 |
| **Transaction Rate** | 1.5% | 1.0% | 0.5% |
| **Max Users** | 4 | 6 | 8+ |
| **Loan Products** | 3 | 5 | Unlimited |
| **Custom Workflows** | ❌ Basic only | ✅ Advanced | ✅ Full Custom |
| **API Access** | Standard | Enhanced | Priority + Webhooks |
| **White Labeling** | Basic colors | Full branding | Enterprise branding |
| **Support** | Email | Email + Phone | Dedicated CSM |
| **Reports** | Standard | Advanced | Custom reports |
| **Integrations** | M-Pesa only | M-Pesa + Bank | All channels |
| **Data Export** | CSV | CSV + PDF | All formats + API |

### Recommended For

| Plan | Ideal For | Example DCPs |
|------|-----------|--------------|
| **STARTER** | New/small lenders, < 100 loans/month | Abepot Credit, Amaze Credit |
| **PROFESSIONAL** | Growing lenders, 100-500 loans/month | Fabilo Credit, Hawkins Capital |
| **ENTERPRISE** | Large established lenders, 500+ loans/month | Signature Capital, ED Partners Africa |

---

## Tier 1 - Enterprise Configuration

### Example Tenant: Signature Capital Kenya Ltd

A large, well-established digital lender with multiple branches, high transaction volume, and complex product requirements.

#### Basic Configuration

```json
{
  "id": "clenterprise001",
  "name": "Signature Capital",
  "slug": "signaturecapital",
  "companyName": "Signature Capital Kenya Ltd",
  "licenseNumber": "DCP-2021-0001",
  "licenseDate": "2021-06-10T00:00:00.000Z",
  
  "contact": {
    "phone": "+254722345678",
    "email": "operations@signaturecapital.co.ke",
    "physicalAddress": "Westlands, Nairobi",
    "website": "https://www.signaturecapital.co.ke"
  },
  
  "subscription": {
    "plan": "ENTERPRISE",
    "status": "ACTIVE",
    "monthlyFee": 50000,
    "transactionRate": 0.5,
    "startDate": "2021-06-10"
  }
}
```

#### Branding Configuration

```json
{
  "branding": {
    "logo": "https://cdn.signaturecapital.co.ke/logo-full.png",
    "favicon": "https://cdn.signaturecapital.co.ke/favicon.ico",
    
    "colors": {
      "primaryColor": "#1a365d",
      "primaryHover": "#2c5282",
      "secondaryColor": "#c53030",
      "accentColor": "#d69e2e",
      "backgroundColor": "#f7fafc",
      "textColor": "#1a202c",
      "successColor": "#276749",
      "warningColor": "#c05621",
      "errorColor": "#c53030"
    },
    
    "typography": {
      "fontFamily": "'Inter', sans-serif",
      "headingFont": "'Playfair Display', serif",
      "fontSize": "16px",
      "headingSize": "1.5rem"
    },
    
    "theme": {
      "mode": "light",
      "borderRadius": "8px",
      "shadow": "lg",
      "density": "comfortable"
    },
    
    "customCSS": ".signature-header { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); }"
  }
}
```

#### Business Rules Configuration

```json
{
  "config": {
    "kycRequirements": {
      "individual": ["NATIONAL_ID", "PASSPORT_PHOTO", "UTILITY_BILL", "PAYSLIP", "BANK_STATEMENT"],
      "business": ["BUSINESS_REGISTRATION", "KRA_PIN_CERTIFICATE", "BANK_STATEMENT_6MONTHS", "DIRECTOR_ID"],
      "highValue": ["NATIONAL_ID", "PASSPORT_PHOTO", "UTILITY_BILL", "PAYSLIP", "BANK_STATEMENT_6MONTHS", "KRA_PIN", "GUARANTOR_FORM"]
    },
    
    "approvalWorkflow": {
      "type": "multi_tier",
      "tiers": [
        {
          "name": "auto_underwriting",
          "enabled": true,
          "rules": {
            "amountLimit": 100000,
            "creditScoreMin": 700,
            "crbStatus": "CLEAN",
            "existingLoansMax": 2
          }
        },
        {
          "name": "officer_review",
          "enabled": true,
          "rules": {
            "amountLimit": 300000,
            "requiresManualReview": true
          }
        },
        {
          "name": "manager_approval",
          "enabled": true,
          "rules": {
            "amountLimit": 800000,
            "requiresTwoFactorAuth": true
          }
        },
        {
          "name": "credit_committee",
          "enabled": true,
          "rules": {
            "amountMin": 800001,
            "committeeSize": 3,
            "meetingRequired": true
          }
        }
      ]
    },
    
    "interestRateLimits": {
      "minRate": 6.0,
      "maxRate": 18.0,
      "regulatoryCap": 15.0,
      "riskBasedPricing": {
        "enabled": true,
        "tiers": [
          { "scoreRange": [750, 900], "rateModifier": -2.0 },
          { "scoreRange": [650, 749], "rateModifier": 0 },
          { "scoreRange": [550, 649], "rateModifier": 2.0 },
          { "scoreRange": [0, 549], "rateModifier": 4.0 }
        ]
      }
    },
    
    "paymentConfig": {
      "defaultMethod": "MPESA",
      "allowedMethods": ["MPESA", "BANK_TRANSFER", "PESALINK"],
      "mpesa": {
        "shortcode": "174379",
        "passkey": "encrypted_passkey_here",
        "timeoutSeconds": 300
      },
      "bankTransfer": {
        "allowedBanks": ["Equity", "KCB", "Cooperative", "NCBA", "Standard Chartered"],
        "settlementAccount": "01-23456-7890123-00"
      }
    },
    
    "collections": {
      "reminderSchedule": {
        "beforeDueDays": [3, 1],
        "afterDueDays": [1, 3, 7, 14, 30]
      },
      "escalationRules": {
        "days1to7": { "action": "sms_reminder" },
        "days8to30": { "action": "phone_call", "assignTo": "collection_agent" },
        "days31to60": { "action": "formal_letter", "ccrListing": true },
        "days61plus": { "action": "legal_process", "externalAgency": true }
      }
    },
    
    "reporting": {
      "cbkReporting": {
        "enabled": true,
        "frequency": "monthly",
        "dueDay": 15,
        "formats": ["CBK_TEMPLATE_V2"],
        "autoSubmit": false
      },
      "internalReports": {
        "daily": ["disbursements", "collections", "new_applications"],
        "weekly": ["portfolio_quality", "arrears_aging", "collector_performance"],
        "monthly": ["financial_statements", "loan_loss_provisioning", "board_pack"]
      }
    }
  }
}
```

#### Loan Products Configuration

```json
{
  "products": [
    {
      "name": "Signature Personal Loan",
      "productCode": "SPL-001",
      "category": "PERSONAL_LOAN",
      
      "amounts": {
        "minAmount": 25000,
        "maxAmount": 300000,
        "defaultAmount": 100000
      },
      
      "pricing": {
        "interestType": "REDUCING_BALANCE",
        "interestRate": 13.5,
        "processingFee": 200,
        "processingFeeType": "FIXED",
        "insuranceFee": 0.75,
        "insuranceFeeType": "PERCENTAGE"
      },
      
      "terms": {
        "minTermDays": 90,
        "maxTermDays": 365,
        "defaultTermDays": 180,
        "repaymentFrequency": "MONTHLY",
        "gracePeriodDays": 15
      },
      
      "eligibility": {
        "minCreditScore": 600,
        "minIncome": 35000,
        "employmentStatus": ["EMPLOYED", "SELF_EMPLOYED", "BUSINESS_OWNER"],
        "requiredDocuments": ["NATIONAL_ID", "PAYSLIP", "BANK_STATEMENT"],
        "maxExistingDebtRatio": 0.5
      }
    },
    
    {
      "name": "Business Growth Loan",
      "productCode": "SBG-001",
      "category": "BUSINESS_LOAN",
      
      "amounts": {
        "minAmount": 100000,
        "maxAmount": 2000000,
        "defaultAmount": 500000
      },
      
      "pricing": {
        "interestType": "REDUCING_BALANCE",
        "interestRate": 11.0,
        "processingFee": 1000,
        "processingFeeType": "FIXED",
        "insuranceFee": 0.5,
        "insuranceFeeType": "PERCENTAGE"
      },
      
      "terms": {
        "minTermDays": 180,
        "maxTermDays": 1095,
        "defaultTermDays": 365,
        "repaymentFrequency": "MONTHLY",
        "gracePeriodDays": 45
      },
      
      "eligibility": {
        "minCreditScore": 650,
        "minMonthlyRevenue": 150000,
        "businessAgeMonths": 12,
        "requiredDocuments": ["BUSINESS_REGISTRATION", "KRA_PIN_CERTIFICATE", "BANK_STATEMENT_6MONTHS", "FINANCIAL_STATEMENTS"]
      }
    },
    
    {
      "name": "Asset Finance - Logbook",
      "productCode": "SAF-001",
      "category": "LOGBOOK_LOAN",
      
      "amounts": {
        "minAmount": 100000,
        "maxAmount": 5000000,
        "defaultAmount": 1500000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 9.5,
        "processingFee": 2500,
        "processingFeeType": "FIXED",
        "insuranceFee": "COMPREHENSIVE",
        "insuranceFeeType": "CALCULATED"
      },
      
      "terms": {
        "minTermDays": 365,
        "maxTermDays": 1825,
        "defaultTermDays": 1460,
        "repaymentFrequency": "MONTHLY",
        "gracePeriodDays": 30
      },
      
      "collateral": {
        "type": "VEHICLE_LOGBOOK",
        "logbookRetention": true,
        "insuranceRequired": true,
        "valuationRequired": true
      }
    },
    
    {
      "name": "Salary Advance Express",
      "productCode": "SSA-001",
      "category": "SALARY_ADVANCE",
      
      "amounts": {
        "minAmount": 10000,
        "maxAmount": 150000,
        "defaultAmount": 50000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 8.0,
        "processingFee": 0,
        "insuranceFee": 0
      },
      
      "terms": {
        "minTermDays": 7,
        "maxTermDays": 30,
        "defaultTermDays": 30,
        "repaymentFrequency": "BULLET",
        "gracePeriodDays": 0
      },
      
      "eligibility": {
        "employerWhitelist": true,
        "verifiedEmployers": ["Government of Kenya", "Safaricom PLC", "Equity Bank", "KCB Group", "East African Breweries"],
        "minEmploymentMonths": 6,
        "salaryDeductionAllowed": true
      }
    },
    
    {
      "name": "Invoice Discounting",
      "productCode": "SID-001",
      "category": "INVOICE_FINANCING",
      
      "amounts": {
        "minAmount": 50000,
        "maxAmount": 5000000,
        "defaultAmount": 500000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 3.5,
        "discountRate": 2.5,
        "processingFee": 1500,
        "processingFeeType": "FIXED"
      },
      
      "terms": {
        "minTermDays": 30,
        "maxTermDays": 120,
        "repaymentFrequency": "BULLET"
      },
      
      "specialConditions": {
        "invoiceVerification": true,
        "debtorCreditCheck": true,
        "debtorConfirmationRequired": true
      }
    }
  ]
}
```

#### User Roles & Team Structure

```json
{
  "users": [
    {
      "role": "TENANT_ADMIN",
      "count": 1,
      "permissions": ["full_access", "user_management", "billing_access", "reports_all"],
      "exampleUser": {
        "name": "Mary Wanjohi",
        "email": "m.wanjohi@signaturecapital.co.ke",
        "department": "Executive"
      }
    },
    {
      "role": "MANAGER",
      "count": 3,
      "departments": ["Credit Operations", "Collections", "Risk & Compliance"],
      "exampleUsers": [
        { "name": "James Ochieng", "email": "j.ocheng@signaturecapital.co.ke", "department": "Credit Operations" },
        { "name": "Grace Muthoni", "email": "g.muthoni@signaturecapital.co.ke", "department": "Collections" },
        { "name": "Peter Kamau", "email": "p.kamau@signaturecapital.co.ke", "department": "Risk & Compliance" }
      ]
    },
    {
      "role": "STAFF",
      "count": 4,
      "departments": ["Underwriting", "Customer Service", "Disbursements", "Finance"],
      "exampleUsers": [
        { "name": "Alice Achieng", "email": "a.achieng@signaturecapital.co.ke" },
        { "name": "Brian Mutua", "email": "b.mutua@signaturecapital.co.ke" },
        { "name": "Catherine Nyokabi", "email": "c.nyokabi@signaturecapital.co.ke" },
        { "name": "David Otieno", "email": "d.otieno@signaturecapital.co.ke" }
      ]
    },
    {
      "role": "AGENT",
      "count": 3,
      "type": "field_collection",
      "regions": ["Nairobi", "Mombasa", "Kisumu"],
      "exampleUsers": [
        { "name": "Elijah Maina", "region": "Nairobi" },
        { "name": "Fatuma Hassan", "region": "Mombasa" },
        { "name": "George Opiyo", "region": "Kisumu" }
      ]
    }
  ],
  "totalUsers": 11
}
```

---

## Tier 2 - Professional Configuration

### Example Tenant: Fabilo Financial Services Ltd

A mid-sized regional lender with focus on SME and personal lending in the Rift Valley region.

#### Basic Configuration

```json
{
  "id": "clprofessional001",
  "name": "Fabilo Credit",
  "slug": "fabilo",
  "companyName": "Fabilo Financial Services Ltd",
  "licenseNumber": "DCP-2023-0089",
  "licenseDate": "2023-11-20T00:00:00.000Z",
  
  "contact": {
    "phone": "+254711234567",
    "email": "info@fabilo.com",
    "physicalAddress": "Eldoret Town, Uasin Gishu County",
    "website": "https://www.fabilo.com"
  },
  
  "subscription": {
    "plan": "PROFESSIONAL",
    "status": "ACTIVE",
    "monthlyFee": 15000,
    "transactionRate": 1.0,
    "startDate": "2023-11-20"
  }
}
```

#### Branding Configuration

```json
{
  "branding": {
    "logo": "https://cdn.fabilo.com/logo.png",
    "favicon": "https://cdn.fabilo.com/favicon.ico",
    
    "colors": {
      "primaryColor": "#047857",
      "primaryHover": "#065f46",
      "secondaryColor": "#f59e0b",
      "accentColor": "#3b82f6",
      "backgroundColor": "#ecfdf5",
      "textColor": "#064e3b"
    },
    
    "typography": {
      "fontFamily": "'Plus Jakarta Sans', sans-serif"
    },
    
    "theme": {
      "mode": "light",
      "borderRadius": "6px"
    }
  }
}
```

#### Business Rules Configuration

```json
{
  "config": {
    "kycRequirements": {
      "individual": ["NATIONAL_ID", "PASSPORT_PHOTO", "UTILITY_BILL"],
      "business": ["BUSINESS_REGISTRATION", "KRA_PIN_CERTIFICATE", "BANK_STATEMENT"]
    },
    
    "approvalWorkflow": {
      "type": "two_level",
      "levels": [
        {
          "name": "auto_approve",
          "enabled": true,
          "limits": { "amount": 75000, "creditScore": 650 }
        },
        {
          "name": "manual_review",
          "enabled": true,
          "requiresManagerApproval": true
        }
      ]
    },
    
    "interestRateLimits": {
      "minRate": 10.0,
      "maxRate": 20.0,
      "defaultRate": 14.0
    },
    
    "paymentConfig": {
      "defaultMethod": "MPESA",
      "allowedMethods": ["MPESA", "BANK_TRANSFER"]
    },
    
    "collections": {
      "reminderSchedule": {
        "beforeDueDays": [2, 1],
        "afterDueDays": [1, 7, 14]
      },
      "escalationRules": {
        "days1to7": "sms_reminder",
        "days8to30": "phone_call",
        "days31plus": "formal_notice"
      }
    }
  }
}
```

#### Loan Products Configuration

```json
{
  "products": [
    {
      "name": "Fabilo Quick Loan",
      "productCode": "FQL-001",
      "category": "PERSONAL_LOAN",
      
      "amounts": {
        "minAmount": 5000,
        "maxAmount": 200000,
        "defaultAmount": 50000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 14.0,
        "processingFee": 300,
        "processingFeeType": "FIXED",
        "insuranceFee": 1.0,
        "insuranceFeeType": "PERCENTAGE"
      },
      
      "terms": {
        "minTermDays": 30,
        "maxTermDays": 180,
        "defaultTermDays": 90,
        "repaymentFrequency": "MONTHLY",
        "gracePeriodDays": 5
      },
      
      "eligibility": {
        "minCreditScore": 550,
        "minIncome": 20000,
        "requiredDocuments": ["NATIONAL_ID", "UTILITY_BILL"]
      }
    },
    
    {
      "name": "SME Working Capital",
      "productCode": "FSW-001",
      "category": "SME_LOAN",
      
      "amounts": {
        "minAmount": 25000,
        "maxAmount": 500000,
        "defaultAmount": 150000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 12.0,
        "processingFee": 500,
        "processingFeeType": "FIXED",
        "insuranceFee": 0.75,
        "insuranceFeeType": "PERCENTAGE"
      },
      
      "terms": {
        "minTermDays": 60,
        "maxTermDays": 365,
        "defaultTermDays": 180,
        "repaymentFrequency": "MONTHLY",
        "gracePeriodDays": 15
      },
      
      "eligibility": {
        "minCreditScore": 600,
        "businessAgeMonths": 6,
        "requiredDocuments": ["BUSINESS_REGISTRATION", "KRA_PIN_CERTIFICATE", "BANK_STATEMENT"]
      }
    },
    
    {
      "name": "Emergency Express",
      "productCode": "FEE-001",
      "category": "EMERGENCY_LOAN",
      
      "amounts": {
        "minAmount": 1000,
        "maxAmount": 30000,
        "defaultAmount": 10000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 16.0,
        "processingFee": 150,
        "processingFeeType": "FIXED",
        "insuranceFee": 0
      },
      
      "terms": {
        "minTermDays": 7,
        "maxTermDays": 60,
        "defaultTermDays": 30,
        "repaymentFrequency": "BULLET",
        "gracePeriodDays": 0
      },
      
      "eligibility": {
        "minCreditScore": 500,
        "quickApproval": true,
        "disbursementTime": "30_minutes"
      }
    },
    
    {
      "name": "School Fees Advance",
      "productCode": "FSF-001",
      "category": "SCHOOL_FEES",
      
      "amounts": {
        "minAmount": 10000,
        "maxAmount": 150000,
        "defaultAmount": 40000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 10.0,
        "processingFee": 200,
        "processingFeeType": "FIXED",
        "insuranceFee": 0
      },
      
      "terms": {
        "minTermDays": 60,
        "maxTermDays": 180,
        "defaultTermDays": 120,
        "repaymentFrequency": "MONTHLY",
        "gracePeriodDays": 30,
        "alignWithTermDates": true
      },
      
      "specialFeatures": {
        "termAligned": true,
        "schoolTerms": ["Term 1", "Term 2", "Term 3"],
        "parentGuarantorAccepted": true
      }
    },
    
    {
      "name": "Agricultural Input Finance",
      "productCode": "FAI-001",
      "category": "SUPPLY_CHAIN",
      
      "amounts": {
        "minAmount": 10000,
        "maxAmount": 200000,
        "defaultAmount": 50000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 11.0,
        "processingFee": 250,
        "processingFeeType": "FIXED",
        "insuranceFee": 0.5,
        "insuranceFeeType": "PERCENTAGE"
      },
      
      "terms": {
        "minTermDays": 90,
        "maxTermDays": 270,
        "defaultTermDays": 180,
        "repaymentFrequency": "SEASONAL",
        "gracePeriodDays": 60
      },
      
      "seasonalConfig": {
        "plantingSeason": "March-May",
        "harvestSeason": "September-November",
        "repaymentAfterHarvest": true
      }
    }
  ]
}
```

#### User Roles & Team Structure

```json
{
  "users": [
    {
      "role": "TENANT_ADMIN",
      "count": 1,
      "exampleUser": {
        "name": "Samuel Kiprop",
        "email": "admin@fabilo.com"
      }
    },
    {
      "role": "MANAGER",
      "count": 2,
      "departments": ["Operations", "Credit"],
      "exampleUsers": [
        { "name": "Lucy Chebet", "email": "l.chebet@fabilo.com" },
        { "name": "Robert Kirui", "email": "r.kirui@fabilo.com" }
      ]
    },
    {
      "role": "STAFF",
      "count": 3,
      "exampleUsers": [
        { "name": "Ann Jepkosgei", "email": "a.jepkosgei@fabilo.com" },
        { "name": "Mike Kigen", "email": "m.kigen@fabilo.com" },
        { "name": "Sarah Chirchir", "email": "s.chirchir@fabilo.com" }
      ]
    },
    {
      "role": "AGENT",
      "count": 2,
      "regions": ["Eldoret", "Iten"],
      "exampleUsers": [
        { "name": "Daniel Yego", "region": "Eldoret" },
        { "name": "Emily Jebet", "region": "Iten" }
      ]
    }
  ],
  "totalUsers": 8
}
```

---

## Tier 4 - Starter Configuration

### Example Tenant: Abepot Credit Limited

A small, newer digital lender focusing on quick personal loans and salary advances.

#### Basic Configuration

```json
{
  "id": "clstarter001",
  "name": "Abepot Credit",
  "slug": "abepot",
  "companyName": "Abepot Credit Limited",
  "licenseNumber": "DCP-2024-0142",
  "licenseDate": "2024-03-15T00:00:00.000Z",
  
  "contact": {
    "phone": "+254700123456",
    "email": "admin@abepot.co.ke",
    "physicalAddress": "Moi Avenue, Nairobi",
    "website": null
  },
  
  "subscription": {
    "plan": "STARTER",
    "status": "ACTIVE",
    "monthlyFee": 5000,
    "transactionRate": 1.5,
    "startDate": "2024-03-15"
  }
}
```

#### Branding Configuration

```json
{
  "branding": {
    "logo": null,
    "favicon": null,
    
    "colors": {
      "primaryColor": "#059669",
      "primaryHover": "#047857",
      "secondaryColor": "#7c3aed",
      "accentColor": "#f59e0b"
    },
    
    "typography": {
      "fontFamily": "system-ui, sans-serif"
    },
    
    "theme": {
      "mode": "light",
      "borderRadius": "4px"
    }
  }
}
```

#### Business Rules Configuration

```json
{
  "config": {
    "kycRequirements": {
      "individual": ["NATIONAL_ID", "PHONE_VERIFIED"]
    },
    
    "approvalWorkflow": {
      "type": "simple",
      "autoApproveEnabled": true,
      "autoApproveLimits": {
        "amount": 25000,
        "creditScore": 600,
        "firstTimeBorrower": false
      },
      "manualReviewForOthers": true
    },
    
    "interestRateLimits": {
      "minRate": 14.0,
      "maxRate": 20.0,
      "defaultRate": 16.0
    },
    
    "paymentConfig": {
      "defaultMethod": "MPESA",
      "allowedMethods": ["MPESA"]
    },
    
    "collections": {
      "reminderSchedule": {
        "beforeDueDays": [1],
        "afterDueDays": [1, 3, 7]
      },
      "simpleEscalation": true
    }
  }
}
```

#### Loan Products Configuration

```json
{
  "products": [
    {
      "name": "Abepot Quick Cash",
      "productCode": "AQK-001",
      "category": "PERSONAL_LOAN",
      
      "amounts": {
        "minAmount": 1000,
        "maxAmount": 100000,
        "defaultAmount": 25000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 16.0,
        "processingFee": 300,
        "processingFeeType": "FIXED",
        "insuranceFee": 0
      },
      
      "terms": {
        "minTermDays": 7,
        "maxTermDays": 180,
        "defaultTermDays": 30,
        "repaymentFrequency": "MONTHLY",
        "gracePeriodDays": 0
      },
      
      "eligibility": {
        "minCreditScore": 500,
        "minIncome": 15000,
        "quickDisbursement": true,
        "requiredDocuments": ["NATIONAL_ID"]
      }
    },
    
    {
      "name": "Payday Advance",
      "productCode": "APA-001",
      "category": "SALARY_ADVANCE",
      
      "amounts": {
        "minAmount": 2000,
        "maxAmount": 50000,
        "defaultAmount": 15000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 12.0,
        "processingFee": 100,
        "processingFeeType": "FIXED",
        "insuranceFee": 0
      },
      
      "terms": {
        "minTermDays": 7,
        "maxTermDays": 30,
        "defaultTermDays": 30,
        "repaymentFrequency": "BULLET",
        "gracePeriodDays": 0
      },
      
      "eligibility": {
        "employedOnly": true,
        "salaryProofRequired": true,
        "firstLoanLimit": 20000
      }
    },
    
    {
      "name": "Emergency Help",
      "productCode": "AEH-001",
      "category": "EMERGENCY_LOAN",
      
      "amounts": {
        "minAmount": 500,
        "maxAmount": 20000,
        "defaultAmount": 5000
      },
      
      "pricing": {
        "interestType": "FLAT_RATE",
        "interestRate": 18.0,
        "processingFee": 100,
        "processingFeeType": "FIXED",
        "insuranceFee": 0
      },
      
      "terms": {
        "minTermDays": 3,
        "maxTermDays": 30,
        "defaultTermDays": 14,
        "repaymentFrequency": "BULLET",
        "gracePeriodDays": 0
      },
      
      "features": {
        "instantApproval": true,
        "minutesToDisburse": 15,
        "noDocumentsRequired": true,
        "phoneVerificationOnly": true
      }
    }
  ]
}
```

#### User Roles & Team Structure

```json
{
  "users": [
    {
      "role": "TENANT_ADMIN",
      "count": 1,
      "exampleUser": {
        "name": "John Abepot",
        "email": "admin@abepot.co.ke"
      }
    },
    {
      "role": "MANAGER",
      "count": 1,
      "exampleUser": {
        "name": "Jane Admin",
        "email": "jane@abepot.co.ke"
      }
    },
    {
      "role": "STAFF",
      "count": 2,
      "exampleUsers": [
        { "name": "Tom Officer", "email": "tom@abepot.co.ke" },
        { "name": "Jerry Support", "email": "jerry@abepot.co.ke" }
      ]
    }
  ],
  "totalUsers": 4
}
```

---

## Custom Loan Product Examples

### Product Template Library

Here are additional loan product templates that can be customized for any tenant:

#### 1. Logbook Loan Template

```json
{
  "templateName": "Logbook Secured Loan",
  "category": "LOGBOOK_LOAN",
  
  "amounts": {
    "minAmount": 100000,
    "maxAmount": 5000000,
    "incrementStep": 50000
  },
  
  "pricing": {
    "interestTypeOptions": ["FLAT_RATE", "REDUCING_BALANCE"],
    "interestRateRange": [7.5, 13.5],
    "processingFeeOptions": {
      "fixed": [2000, 5000],
      "percentage": [1.0, 2.5]
    },
    "valuationFee": 3500,
    "logbookFee": 5000
  },
  
  "terms": {
    "minTermMonths": 12,
    "maxTermMonths": 60,
    "defaultTermMonths": 48,
    "repaymentFrequency": "MONTHLY"
  },
  
  "collateral": {
    "vehicleAgeMaxYears": 8,
    "minimumVehicleValue": 500000,
    "insuranceComprehensive": true,
    "logbookDeposit": true
  }
}
```

#### 2. Invoice Financing Template

```json
{
  "templateName": "Invoice Discounting / Factoring",
  "category": "INVOICE_FINANCING",
  
  "amounts": {
    "minAmount": 50000,
    "maxAmount": 10000000,
    "percentageOfInvoice": [70, 90]
  },
  
  "pricing": {
    "discountRateRange": [1.5, 4.0],
    "facilityFeeMonthly": [0.5, 1.5],
    "processingFee": [1000, 5000]
  },
  
  "terms": {
    "minTermDays": 30,
    "maxTermDays": 120,
    "alignedWithInvoicePayment": true
  },
  
  "requirements": {
    "buyerCreditCheck": true,
    "invoiceVerification": true,
    "debtorsConfirmation": true,
    "noConcentrationRisk": 0.3 // Max 30% per debtor
  }
}
```

#### 3. Supply Chain Financing Template

```json
{
  "templateName": "Supply Chain / Trade Finance",
  "category": "SUPPLY_CHAIN",
  
  "amounts": {
    "minAmount": 100000,
    "maxAmount": 5000000
  },
  
  "pricing": {
    "interestRateRange": [8.0, 15.0],
    "transactionFee": 0.5
  },
  
  "structures": [
    {
      "type": "PURCHASE_ORDER_FINANCING",
      "description": "Finance supplier payments based on confirmed POs"
    },
    {
      "type": "INVENTORY_FINANCING",
      "description": "Finance stock purchase for retailers"
    },
    {
      "type": "DISTRIBUTOR_FINANCING",
      "description": "Working capital for distributors"
    }
  ]
}
```

#### 4. Digital/Instant Loan Template

```json
{
  "templateName": "Mobile-First Instant Loan",
  "category": "PERSONAL_LOAN",
  
  "amounts": {
    "minAmount": 500,
    "maxAmount": 50000,
    "algorithmicLimits": true // AI-based limits
  },
  
  "pricing": {
    "interestType": "FLAT_RATE",
    "interestRateRange": [15.0, 22.0],
    "noProcessingFee": true,
    "instantDisbursement": true
  },
  
  "terms": {
    "minTermDays": 1,
    "maxTermDays": 61,
    "options": [7, 14, 30, 61]
  },
  
  "digitalFeatures": {
    "appOnlyApplication": true,
    "alternativeDataScoring": true,
    "airtimeDataConsent": true,
    "bankStatementAPI": true,
    "disbursementTimeMinutes": 5
  }
}
```

---

## Workflow Configuration Examples

### Simple Approval Workflow (Starter Tier)

```yaml
workflow:
  name: simple_approval
  steps:
    - name: application_submission
      type: automatic
      action: receive_application
      
    - name: kyc_verification
      type: automatic
      checks:
        - id_verified
        - phone_verified
      auto_reject_if_fails: true
      
    - name: credit_check
      type: automatic
      actions:
        - query_crb
        - calculate_score
      decision:
        if score >= 600 AND amount <= 25000:
          next: auto_approve
        else:
          next: manual_review
          
    - name: auto_approve
      type: automatic
      action: approve_loan
      notify: customer
      
    - name: manual_review
      type: human
      assign_to: loan_officer
      sla_hours: 24
      possible_outcomes: [approve, reject, request_info]
```

### Multi-Tier Approval Workflow (Enterprise Tier)

```yaml
workflow:
  name: enterprise_multi_tier
  steps:
    - name: submission
      type: automatic
      validation: required_fields_complete
      
    - name: document_collection
      type: hybrid
      system_checks: [id_validation, phone_verification]
      human_task: document_review
      assign_to: kyc_specialist
      
    - name: credit_assessment
      type: automatic
      engines:
        - bureau_pull: metropol
        - internal_scoring: signature_v3
        - affordability: dti_calculator
      output: credit_memorandum
      
    - name: tier_1_auto_approve
      condition: amount <= 100000 AND score >= 700
      type: automatic
      action: approve
      limit: manager_daily_override
      
    - name: tier_2_officer_review
      condition: amount <= 500000 OR score < 700
      type: human
      assign_to: credit_officer
      sla_hours: 4
      authority: approve_up_to_500k
      
    - name: tier_3_manager_approval
      condition: amount <= 2000000
      type: human
      assign_to: branch_manager
      sla_hours: 8
      requires_second_signature: true
      
    - name: tier_4_committee
      condition: amount > 2000000
      type: committee
      members_min: 3
      meeting_type: physical_or_video
      requires_presentation: yes
      voting: majority
      
    - name: post_approval
      type: automatic_parallel:
        - generate_offer_letter
        - schedule_disbursement
        - send_congratulations_sms
        - update_crms
```

---

## Branding Configuration Examples

### Corporate Professional Theme

```json
{
  "themeName": "Corporate Blue",
  "colors": {
    "primary": "#1e40af",
    "primaryLight": "#3b82f6",
    "primaryDark": "#1e3a8a",
    "secondary": "#7c3aed",
    "success": "#059669",
    "warning": "#d97706",
    "error": "#dc2626",
    "background": "#f8fafc",
    "surface": "#ffffff",
    "textPrimary": "#1e293b",
    "textSecondary": "#64748b"
  },
  "components": {
    "buttonRadius": "6px",
    "cardShadow": "md",
    "fontScale": "normal",
    "density": "comfortable"
  },
  "suitableFor": ["Banks", "Large DCPs", "Professional services"]
}
```

### Friendly Consumer Theme

```json
{
  "themeName": "Friendly Green",
  "colors": {
    "primary": "#059669",
    "primaryLight": "#34d399",
    "primaryDark": "#047857",
    "secondary": "#8b5cf6",
    "success": "#10b981",
    "warning": "#f59e0b",
    "error": "#ef4444",
    "background": "#ecfdf5",
    "surface": "#ffffff",
    "textPrimary": "#064e3b",
    "textSecondary": "#6b7280"
  },
  "components": {
    "buttonRadius": "12px",
    "cardShadow": "lg",
    "fontScale": "large",
    "density": "spacious"
  },
  "suitableFor": ["Consumer lenders", "SME finance", "Friendly brands"]
}
```

### Bold Modern Theme

```json
{
  "themeName": "Bold Dark Accent",
  "colors": {
    "primary": "#dc2626",
    "primaryLight": "#ef4444",
    "primaryDark": "#991b1b",
    "secondary": "#2563eb",
    "success": "#16a34a",
    "warning": "#ea580c",
    "error": "#dc2626",
    "background": "#fafafa",
    "surface": "#ffffff",
    "textPrimary": "#171717",
    "textSecondary": "#525252"
  },
  "components": {
    "buttonRadius": "4px",
    "cardShadow": "xl",
    "fontScale": "normal",
    "density": "compact"
  },
  "suitableFor": ["Digital-first lenders", "Fintech", "Modern brands"]
}
```

---

## Complete Tenant Setup API Examples

### Creating a New Tenant with Full Configuration

```bash
curl -X POST https://api.digitallendingos.co.ke/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -d '{
    "name": "My New DCP Limited",
    "slug": "mynewdcp",
    "companyName": "My New DCP Limited",
    "licenseNumber": "DCP-2026-0100",
    "phone": "+254700000001",
    "email": "admin@mynewdcp.co.ke",
    "physicalAddress": "Nairobi, Kenya",
    "website": "https://www.mynewdcp.co.ke",
    "plan": "PROFESSIONAL",
    "status": "ACTIVE",
    "branding": {
      "primaryColor": "#1e40af",
      "secondaryColor": "#f59e0b",
      "fontFamily": "Inter, sans-serif"
    },
    "config": {
      "kycRequirements": ["NATIONAL_ID", "UTILITY_BILL"],
      "approvalWorkflow": "two_level",
      "paymentConfig": {
        "defaultMethod": "MPESA"
      }
    }
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "clnew123",
    "name": "My New DCP Limited",
    "slug": "mynewdcp",
    "status": "ACTIVE",
    "plan": "PROFESSIONAL",
    "monthlyFee": 15000,
    "transactionRate": 1.0,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "branding": "{\"primaryColor\":\"#1e40af\",...}",
    "config": "{\"kycRequirements\":[...],...}"
  }
}
```

### Bulk Product Creation After Tenant Setup

```bash
# Create products for the new tenant
TENANT_ID="clnew123"

# Product 1: Personal Loan
curl -X POST https://api.digitallendingos.co.ke/api/products \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"name\": \"Personal Loan\",
    \"productCode\": \"PL-001\",
    \"category\": \"PERSONAL_LOAN\",
    \"minAmount\": 5000,
    \"maxAmount\": 200000,
    \"interestRate\": 14.0,
    \"minTermDays\": 30,
    \"maxTermDays\": 180
  }"

# Product 2: Business Loan
curl -X POST https://api.digitallendingos.co.ke/api/products \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"name\": \"Business Loan\",
    \"productCode\": \"BL-001\",
    \"category\": \"BUSINESS_LOAN\",
    \"minAmount\": 25000,
    \"maxAmount\": 500000,
    \"interestRate\": 12.0,
    \"minTermDays\": 60,
    \"maxTermDays\": 365
  }"

# Product 3: Emergency Loan
curl -X POST https://api.digitallendingos.co.ke/api/products \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"name\": \"Emergency Cash\",
    \"productCode\": \"EL-001\",
    \"category\": \"EMERGENCY_LOAN\",
    \"minAmount\": 1000,
    \"maxAmount\": 50000,
    \"interestRate\": 18.0,
    \"minTermDays\": 7,
    \"maxTermDays\": 30
  }"
```

### Creating Users for the New Tenant

```bash
TENANT_ID="clnew123"

# Create Admin User
curl -X POST https://api.digitallendingos.co.ke/api/users \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"email\": \"admin@mynewdcp.co.ke\",
    \"name\": \"Admin User\",
    \"password\": \"SecurePassword123!\",
    \"role\": \"TENANT_ADMIN\"
  }"

# Create Manager
curl -X POST https://api.digitallendingos.co.ke/api/users \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"email\": \"manager@mynewdcp.co.ke\",
    \"name\": \"Manager User\",
    \"password\": \"SecurePassword123!\",
    \"role\": \"MANAGER\"
  }"

# Create Staff
curl -X POST https://api.digitallendingos.co.ke/api/users \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"email\": \"staff@mynewdcp.co.ke\",
    \"name\": \"Staff User\",
    \"password\": \"SecurePassword123!\",
    \"role\": \"STAFF\"
  }"
```

---

## Summary: All Seed Data Tenants

The platform comes pre-configured with these sample tenants:

| # | Name | Slug | Plan | Status | Location |
|---|------|------|------|--------|----------|
| 1 | Signature Capital | `signaturecapital` | ENTERPRISE | ACTIVE | Westlands, Nairobi |
| 2 | Fabilo Credit | `fabilo` | PROFESSIONAL | ACTIVE | Eldoret, Uasin Gishu |
| 3 | Abepot Credit | `abepot` | STARTER | ACTIVE | Moi Avenue, Nairobi |
| 4 | Karibu Credit | `karibucredit` | STARTER | TRIAL | Kisumu City |
| 5 | ED Partners Africa | `edpartners` | ENTERPRISE | ACTIVE | Ngong Road, Nairobi |
| 6 | Amaze Credit | `amaze` | STARTER | ACTIVE | Mombasa Road, Nairobi |
| 7 | Baecot Credit | `baecot` | STARTER | ACTIVE | Nakuru Town |
| 8 | Bluewave Cash | `bluewave` | STARTER | ACTIVE | Kisumu City |
| 9 | Dahawi Credit | `dahawi` | STARTER | ACTIVE | Eldoret Town |
| 10 | Eversure Credit | `eversure` | STARTER | ACTIVE | Nyeri Town |
| 11 | Finseil | `finseil` | STARTER | ACTIVE | Machakos Town |
| 12 | Iboda Credit | `iboda` | STARTER | ACTIVE | Thika Town |
| 13 | Maison Capital | `maison` | STARTER | ACTIVE | Malindi |
| 14 | Malicash Investment | `malicash` | STARTER | ACTIVE | Naivasha |
| 15 | Mimi Credit | `mimicredit` | STARTER | ACTIVE | Meru Town |
| 16 | NJB Limited | `njb` | STARTER | ACTIVE | Garissa Town |
| 17 | Centenary Micro | `centenary` | PROFESSIONAL | ACTIVE | Wundanyi |
| 18 | Hawkins Capital | `hawkins` | PROFESSIONAL | ACTIVE | Nyahururu |
| 19 | Lucason Capital | `lucason` | PROFESSIONAL | ACTIVE | Voi Town |
| 20 | Milhan Access | `milhan` | PROFESSIONAL | ACTIVE | Bungoma Town |
| 21 | Novatok Credit | `novatok` | PROFESSIONAL | ACTIVE | Marsabit Town |
| 22 | Becalob Credit | `becalob` | STARTER | TRIAL | Kitale |
| 23 | Equal Reach | `equalreach` | STARTER | TRIAL | Kakamega |
| 24 | Kechita Credit | `kechita` | STARTER | TRIAL | Nanyuki |
| 25 | Mkulimapay Credit | `mkulimapay` | STARTER | TRIAL | Embu Town |

---

<div align="center>

**Need help configuring your tenant?**

Contact our onboarding team: onboard@digitallendingos.co.ke

**Looking for technical details?**

See [Developer Guide](DEVELOPER.md) or [Architecture](ARCHITECTURE.md)

</div>
