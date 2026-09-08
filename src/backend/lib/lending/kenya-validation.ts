/**
 * Kenya-specific validation utilities for DCP operations
 */

// Kenyan phone number: +2547XXXXXXXX, 2547XXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
export function validateKenyanPhone(phone: string): {
  valid: boolean
  formatted: string
  error?: string
} {
  const cleaned = phone.replace(/[\s-]/g, '')
  let match: RegExpMatchArray | null

  // +254 format
  match = cleaned.match(/^\+254(7\d{8})$/)
  if (match) return { valid: true, formatted: `+254${match[1]}` }

  // 254 format
  match = cleaned.match(/^254(7\d{8})$/)
  if (match) return { valid: true, formatted: `+254${match[1]}` }

  // 0 format
  match = cleaned.match(/^0(7\d{8})$/)
  if (match) return { valid: true, formatted: `+254${match[1]}` }

  // Bare format
  match = cleaned.match(/^(7\d{8})$/)
  if (match) return { valid: true, formatted: `+254${match[1]}` }

  return {
    valid: false,
    formatted: phone,
    error: 'Invalid Kenyan phone number. Expected format: +2547XXXXXXXX',
  }
}

// Kenyan National ID: 8 digits
export function validateNationalId(idNumber: string): {
  valid: boolean
  error?: string
} {
  const cleaned = idNumber.replace(/\s/g, '')
  if (!/^\d{8}$/.test(cleaned))
    return { valid: false, error: 'Kenyan National ID must be exactly 8 digits' }
  return { valid: true }
}

// KRA PIN: starts with A or P, followed by 9 alphanumeric chars
export function validateKraPin(pin: string): { valid: boolean; error?: string } {
  const cleaned = pin.replace(/\s/g, '').toUpperCase()
  if (!/^[AP]\d{9}[A-Z]$/.test(cleaned))
    return {
      valid: false,
      error:
        'Invalid KRA PIN format. Expected: A/P + 9 digits + 1 letter (e.g., A00XXXXXXXZ)',
    }
  return { valid: true }
}

// Business registration number: varies but typically starts with CPR/YYYY/
export function validateBusinessRegNo(regNo: string): {
  valid: boolean
  error?: string
} {
  if (!regNo || regNo.length < 3)
    return { valid: false, error: 'Invalid business registration number' }
  return { valid: true } // Accept various formats
}
