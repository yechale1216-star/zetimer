/**
 * Ethiopian Calendar Utility
 * Provides conversion from Gregorian to Ethiopian (EC)
 */

export interface ECDate {
  year: number;
  month: number; // 0-indexed (0=Meskerem, ..., 12=Pagume)
  day: number;
}

export const ET_MONTHS_EN = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"
];

export const ET_MONTHS_AM = [
  "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"
];

/**
 * Converts a Gregorian Date to Ethiopian Date
 */
export function toEthiopianDate(date: Date): ECDate {
  const jdn = getJDN(date);
  return jdnToEthiopic(jdn);
}

/**
 * Calculates Julian Day Number from Gregorian Date
 */
function getJDN(date: Date): number {
  let year = date.getFullYear();
  let month = date.getMonth() + 1; // 1-indexed
  let day = date.getDate();

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);

  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

/**
 * Converts JDN to Ethiopic {year, month, day}
 */
function jdnToEthiopic(jdn: number): ECDate {
    const era = 1723856; // Ethiopic Epoch
    const r = (Math.floor(jdn) - era) % 1461;
    const n = (r % 365) + 365 * Math.floor(r / 1460);
    
    const year = 4 * Math.floor((Math.floor(jdn) - era) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
    const month = Math.floor(n / 30);
    const day = (n % 30) + 1;

    return { year, month, day };
}

/**
 * Formats Ethiopian Date
 */
export function formatEthiopianDate(date: Date, lang: 'en' | 'am' = 'am'): string {
  const ec = toEthiopianDate(date);
  const monthName = lang === 'am' ? ET_MONTHS_AM[ec.month] : ET_MONTHS_EN[ec.month];
  return `${monthName} ${ec.day} ቀን ${ec.year} ዓ.ም`;
}
