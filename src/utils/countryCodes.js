export const COUNTRY_CODES = [
  { code: '+91', country: 'IN', name: 'India', flag: '🇮🇳', phoneLen: 10, pattern: /^[6-9]\d{9}$/ },
  { code: '+1', country: 'US', name: 'United States', flag: '🇺🇸', phoneLen: 10, pattern: /^\d{10}$/ },
  { code: '+44', country: 'GB', name: 'United Kingdom', flag: '🇬🇧', phoneLen: 10, pattern: /^\d{10,11}$/ },
  { code: '+971', country: 'AE', name: 'UAE', flag: '🇦🇪', phoneLen: 9, pattern: /^\d{9}$/ },
  { code: '+61', country: 'AU', name: 'Australia', flag: '🇦🇺', phoneLen: 9, pattern: /^\d{9}$/ },
  { code: '+65', country: 'SG', name: 'Singapore', flag: '🇸🇬', phoneLen: 8, pattern: /^\d{8}$/ },
  { code: '+1', country: 'CA', name: 'Canada', flag: '🇨🇦', phoneLen: 10, pattern: /^\d{10}$/ },
  { code: '+49', country: 'DE', name: 'Germany', flag: '🇩🇪', phoneLen: 10, pattern: /^\d{10,11}$/ },
  { code: '+33', country: 'FR', name: 'France', flag: '🇫🇷', phoneLen: 9, pattern: /^\d{9}$/ },
  { code: '+966', country: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', phoneLen: 9, pattern: /^\d{9}$/ },
  { code: '+60', country: 'MY', name: 'Malaysia', flag: '🇲🇾', phoneLen: 9, pattern: /^\d{9,10}$/ },
  { code: '+81', country: 'JP', name: 'Japan', flag: '🇯🇵', phoneLen: 10, pattern: /^\d{10}$/ },
  { code: '+880', country: 'BD', name: 'Bangladesh', flag: '🇧🇩', phoneLen: 10, pattern: /^\d{10}$/ },
  { code: '+94', country: 'LK', name: 'Sri Lanka', flag: '🇱🇰', phoneLen: 9, pattern: /^\d{9}$/ },
  { code: '+977', country: 'NP', name: 'Nepal', flag: '🇳🇵', phoneLen: 10, pattern: /^\d{10}$/ },
  { code: '+234', country: 'NG', name: 'Nigeria', flag: '🇳🇬', phoneLen: 10, pattern: /^\d{10}$/ },
  { code: '+27', country: 'ZA', name: 'South Africa', flag: '🇿🇦', phoneLen: 9, pattern: /^\d{9}$/ },
  { code: '+64', country: 'NZ', name: 'New Zealand', flag: '🇳🇿', phoneLen: 9, pattern: /^\d{9}$/ },
  { code: '+63', country: 'PH', name: 'Philippines', flag: '🇵🇭', phoneLen: 10, pattern: /^\d{10}$/ },
  { code: '+62', country: 'ID', name: 'Indonesia', flag: '🇮🇩', phoneLen: 10, pattern: /^\d{9,11}$/ }
];

export const detectUserCountryCode = () => {
  try {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
    const lang = (navigator.language || navigator.userLanguage || '').toUpperCase();

    if (tz.includes('calcutta') || tz.includes('kolkata') || tz.includes('india') || lang.endsWith('IN')) {
      return '+91';
    }
    if (tz.includes('new_york') || tz.includes('los_angeles') || tz.includes('chicago') || tz.includes('denver') || tz.includes('america') || lang === 'EN-US') {
      return '+1';
    }
    if (tz.includes('london') || tz.includes('europe/london') || lang === 'EN-GB') {
      return '+44';
    }
    if (tz.includes('dubai') || tz.includes('abu_dhabi') || tz.includes('muscat')) {
      return '+971';
    }
    if (tz.includes('sydney') || tz.includes('melbourne') || tz.includes('brisbane') || tz.includes('perth') || lang.endsWith('AU')) {
      return '+61';
    }
    if (tz.includes('singapore') || lang.endsWith('SG')) {
      return '+65';
    }
    if (tz.includes('toronto') || tz.includes('vancouver') || tz.includes('montreal') || lang.endsWith('CA')) {
      return '+1';
    }
    if (tz.includes('berlin') || tz.includes('frankfurt') || lang.endsWith('DE')) {
      return '+49';
    }
    if (tz.includes('paris') || lang.endsWith('FR')) {
      return '+33';
    }
    if (tz.includes('riyadh')) {
      return '+966';
    }
    if (tz.includes('kuala_lumpur') || lang.endsWith('MY')) {
      return '+60';
    }
    if (tz.includes('tokyo') || lang.endsWith('JP')) {
      return '+81';
    }
  } catch (e) {}
  return '+91';
};

export const fetchGeolocationCountryCode = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    if (data && (data.country_calling_code || data.country_code)) {
      const callingCode = data.country_calling_code
        ? (data.country_calling_code.startsWith('+') ? data.country_calling_code : `+${data.country_calling_code}`)
        : null;
      const match = COUNTRY_CODES.find((c) => c.code === callingCode || c.country === data.country_code);
      if (match) {
        return match.code;
      }
    }
  } catch (e) {}
  return null;
};
