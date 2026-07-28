export interface Country {
  code: string          // ISO 3166-1 alpha-2 code e.g. "ET"
  name: string          // Country Name e.g. "Ethiopia"
  dialCode: string      // Calling code with plus e.g. "+251"
  flag: string          // Flag Emoji e.g. "🇪🇹"
  format: string        // Mask template e.g. "9X XXX XXXX"
  minLength: number     // Min national digits
  maxLength: number     // Max national digits
  placeholder: string   // Local number placeholder e.g. "91 234 5678"
}

export const COUNTRIES: Country[] = [
  // ── East & North Africa (Ethiopia at the very top)
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹', format: '9X XXX XXXX', minLength: 9, maxLength: 9, placeholder: '91 234 5678' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', format: '7XX XXX XXX', minLength: 9, maxLength: 9, placeholder: '712 345 678' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬', format: '7XX XXX XXX', minLength: 9, maxLength: 9, placeholder: '712 345 678' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿', format: '7XX XXX XXX', minLength: 9, maxLength: 9, placeholder: '712 345 678' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼', format: '7XX XXX XXX', minLength: 9, maxLength: 9, placeholder: '788 123 456' },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253', flag: '🇩🇯', format: '77 XX XX XX', minLength: 8, maxLength: 8, placeholder: '77 12 34 56' },
  { code: 'SO', name: 'Somalia', dialCode: '+252', flag: '🇸🇴', format: '61 XXX XXXX', minLength: 8, maxLength: 9, placeholder: '61 234 5678' },
  { code: 'ER', name: 'Eritrea', dialCode: '+291', flag: '🇪🇷', format: '7 XX XX XX', minLength: 7, maxLength: 7, placeholder: '7 12 34 56' },
  { code: 'SD', name: 'Sudan', dialCode: '+249', flag: '🇸🇩', format: '9X XXX XXXX', minLength: 9, maxLength: 9, placeholder: '91 234 5678' },
  { code: 'SS', name: 'South Sudan', dialCode: '+211', flag: '🇸🇸', format: '9X XXX XXXX', minLength: 9, maxLength: 9, placeholder: '91 234 5678' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', format: '1X XXXX XXXX', minLength: 10, maxLength: 10, placeholder: '10 1234 5678' },

  // ── Rest of Africa
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', format: '80X XXX XXXX', minLength: 10, maxLength: 10, placeholder: '803 123 4567' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', format: '71 XXX XXXX', minLength: 9, maxLength: 9, placeholder: '71 234 5678' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭', format: '24 XXX XXXX', minLength: 9, maxLength: 9, placeholder: '24 123 4567' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦', format: '6XX XX XX XX', minLength: 9, maxLength: 9, placeholder: '661 12 34 56' },

  // ── Middle East
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', format: '50 XXX XXXX', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', format: '5X XXX XXXX', minLength: 9, maxLength: 9, placeholder: '51 234 5678' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', format: '33XX XXXX', minLength: 8, maxLength: 8, placeholder: '3312 3456' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', format: '9XXX XXXX', minLength: 8, maxLength: 8, placeholder: '9123 4567' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', format: '9XXX XXXX', minLength: 8, maxLength: 8, placeholder: '9123 4567' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', format: '3XXX XXXX', minLength: 8, maxLength: 8, placeholder: '3912 3456' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴', format: '7 XXXX XXXX', minLength: 9, maxLength: 9, placeholder: '7 9123 4567' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧', format: '71 XXX XXX', minLength: 7, maxLength: 8, placeholder: '71 123 456' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', format: '5X XXX XXXX', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },

  // ── Americas
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', format: '(XXX) XXX-XXXX', minLength: 10, maxLength: 10, placeholder: '(555) 123-4567' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', format: '(XXX) XXX-XXXX', minLength: 10, maxLength: 10, placeholder: '(555) 123-4567' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', format: '55 XXXX XXXX', minLength: 10, maxLength: 10, placeholder: '55 1234 5678' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', format: '11 9XXXX-XXXX', minLength: 10, maxLength: 11, placeholder: '11 91234-5678' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', format: '9 11 XXXX-XXXX', minLength: 10, maxLength: 11, placeholder: '9 11 1234-5678' },

  // ── Europe
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', format: '7XXX XXXXXX', minLength: 10, maxLength: 10, placeholder: '7911 123456' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', format: '151 XXXXXXXX', minLength: 10, maxLength: 11, placeholder: '151 12345678' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', format: '6 XX XX XX XX', minLength: 9, maxLength: 9, placeholder: '6 12 34 56 78' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', format: '3XX XXXXXXX', minLength: 9, maxLength: 10, placeholder: '312 3456789' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', format: '6XX XX XX XX', minLength: 9, maxLength: 9, placeholder: '612 34 56 78' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', format: '6 XXXXXXXX', minLength: 9, maxLength: 9, placeholder: '6 12345678' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', format: '70 XXX XX XX', minLength: 9, maxLength: 9, placeholder: '70 123 45 67' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', format: '79 XXX XX XX', minLength: 9, maxLength: 9, placeholder: '79 123 45 67' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', format: '5XX XXX XX XX', minLength: 10, maxLength: 10, placeholder: '501 123 45 67' },

  // ── Asia & Pacific
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', format: '9XXXX XXXXX', minLength: 10, maxLength: 10, placeholder: '98765 43210' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', format: '13X XXXX XXXX', minLength: 11, maxLength: 11, placeholder: '138 1234 5678' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', format: '90 XXXX XXXX', minLength: 10, maxLength: 10, placeholder: '90 1234 5678' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', format: '10 XXXX XXXX', minLength: 10, maxLength: 10, placeholder: '10 1234 5678' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', format: '4XX XXX XXX', minLength: 9, maxLength: 9, placeholder: '412 345 678' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', format: '21 XXX XXXX', minLength: 8, maxLength: 9, placeholder: '21 123 4567' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', format: '30X XXXXXXX', minLength: 10, maxLength: 10, placeholder: '300 1234567' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', format: '17XX XXXXXX', minLength: 10, maxLength: 10, placeholder: '1712 345678' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', format: '9XX XXX XXXX', minLength: 10, maxLength: 10, placeholder: '917 123 4567' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', format: '812 XXXX XXXX', minLength: 10, maxLength: 12, placeholder: '812 3456 7890' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', format: '12 XXX XXXX', minLength: 9, maxLength: 10, placeholder: '12 345 6789' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', format: '8XXX XXXX', minLength: 8, maxLength: 8, placeholder: '8123 4567' },
]

export const DEFAULT_COUNTRY = COUNTRIES[0] // Ethiopia (+251)

/**
 * Finds a country matching a given dial code or ISO code
 */
export function findCountryByCodeOrDial(input: string): Country | undefined {
  if (!input) return undefined
  const cleaned = input.trim().toUpperCase()
  
  // Try matching ISO code
  const byCode = COUNTRIES.find(c => c.code === cleaned)
  if (byCode) return byCode

  // Try matching dial code (e.g. +251, +1, +254)
  const dial = cleaned.startsWith('+') ? cleaned : `+${cleaned}`
  
  // Sort by dial code length descending so +251 matches before +2
  const dialMatches = COUNTRIES.filter(c => dial.startsWith(c.dialCode))
    .sort((a, b) => b.dialCode.length - a.dialCode.length)

  return dialMatches[0]
}

/**
 * Parses raw input or E.164 phone string and extracts country & national number digits
 */
export function parsePhoneNumber(raw: string, fallbackCountry: Country = DEFAULT_COUNTRY): {
  country: Country
  nationalDigits: string
  e164: string
  isValid: boolean
  errorMessage?: string
} {
  if (!raw || !raw.trim()) {
    return {
      country: fallbackCountry,
      nationalDigits: '',
      e164: '',
      isValid: false,
    }
  }

  let cleaned = raw.trim()

  // Detect country from leading plus / dial code
  let matchedCountry = fallbackCountry
  let digitsOnly = ''

  if (cleaned.startsWith('+')) {
    const found = findCountryByCodeOrDial(cleaned)
    if (found) {
      matchedCountry = found
      // Strip dial code from digits
      digitsOnly = cleaned.slice(found.dialCode.length).replace(/\D/g, '')
    } else {
      digitsOnly = cleaned.replace(/\D/g, '')
    }
  } else {
    // Local input
    digitsOnly = cleaned.replace(/\D/g, '')
    // Handle leading zero for local numbers e.g. "0912345678" -> "912345678"
    if (digitsOnly.startsWith('0') && matchedCountry.code === 'ET') {
      digitsOnly = digitsOnly.substring(1)
    }
  }

  const e164 = digitsOnly ? `${matchedCountry.dialCode}${digitsOnly}` : ''

  // Validate digit count
  const len = digitsOnly.length
  let isValid = false
  let errorMessage: string | undefined

  if (len === 0) {
    isValid = false
  } else if (len < matchedCountry.minLength) {
    isValid = false
    errorMessage = `Phone number is too short (${len}/${matchedCountry.minLength} digits for ${matchedCountry.name})`
  } else if (len > matchedCountry.maxLength) {
    isValid = false
    errorMessage = `Phone number is too long (${len}/${matchedCountry.maxLength} digits for ${matchedCountry.name})`
  } else {
    // Special validation for Ethiopian numbers: must start with 9 or 7
    if (matchedCountry.code === 'ET') {
      if (!digitsOnly.startsWith('9') && !digitsOnly.startsWith('7')) {
        isValid = false
        errorMessage = 'Ethiopian phone numbers must start with 9 or 7 (e.g., +251 912345678)'
      } else {
        isValid = true
      }
    } else {
      isValid = true
    }
  }

  return {
    country: matchedCountry,
    nationalDigits: digitsOnly,
    e164: isValid ? e164 : (e164 || raw),
    isValid,
    errorMessage,
  }
}
