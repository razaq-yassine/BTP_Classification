export interface Country {
  code: string
  name: string
  dialCode: string
  flag: string
  phoneLength: { min: number; max: number }
  phonePattern?: RegExp
}

export const countries: Country[] = [
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦', phoneLength: { min: 9, max: 9 } },
  { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿', phoneLength: { min: 9, max: 9 } },
  { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳', phoneLength: { min: 8, max: 8 } },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', phoneLength: { min: 9, max: 9 } },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', phoneLength: { min: 9, max: 11 } },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', phoneLength: { min: 10, max: 10 } },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', phoneLength: { min: 10, max: 10 } },
]

// Default country (Morocco)
export const defaultCountry: Country = countries.find(c => c.code === 'MA') || countries[0]

// Helper function to get country by code
export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(c => c.code === code)
}

// Helper function to get country by dial code
export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return countries.find(c => c.dialCode === dialCode)
}
