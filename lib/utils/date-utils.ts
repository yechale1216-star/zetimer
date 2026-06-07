/**
 * Zetime Date & Time Localization Utilities
 * Supports Gregorian and Ethiopian Calendar (EC) formatting
 */

import { Language } from "../i18n/translations";
import { toEthiopianDate, ET_MONTHS_AM, ET_MONTHS_EN } from "./ethiopian-calendar";

export interface DateOptions {
  month?: "long" | "short" | "numeric";
  day?: "numeric" | "2-digit";
  year?: "numeric" | "2-digit";
  weekday?: "long" | "short";
  hour?: "numeric" | "2-digit";
  minute?: "numeric" | "2-digit";
}

const amharicDays = [
  "እሁድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"
];

const amharicShortDays = [
  "እሁ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "ዓር", "ቅዳ"
];

/**
 * Formats a date string or object into a localized string
 */
export function formatLocalizedDate(
  dateInput: string | Date | number,
  language: Language = "en",
  options: DateOptions = { month: "short", day: "numeric" }
): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    // Ethiopian Calendar for Amharic
    if (language === "am") {
      const ec = toEthiopianDate(date);
      let result = "";
      
      // Just Time?
      if (options.hour && options.minute && !options.month && !options.day && !options.year && !options.weekday) {
        const ampm = date.getHours() >= 12 ? "ከሰዓት" : "ጠዋት";
        let hours = date.getHours() % 12;
        hours = hours ? hours : 12;
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${ampm} ${hours}:${minutes}`;
      }

      if (options.weekday) {
        result += options.weekday === 'short' ? amharicShortDays[date.getDay()] : amharicDays[date.getDay()];
        result += "፣ ";
      }
      if (options.month) {
        result += (options.month === 'numeric' ? (ec.month + 1) : ET_MONTHS_AM[ec.month]) + " ";
      }
      if (options.day) {
        result += ec.day + " ";
      }
      if (options.year) {
        result += options.month ? "" : "፣ ";
        result += ec.year + " ዓ.ም";
      }
      if (options.hour && options.minute) {
        const ampm = date.getHours() >= 12 ? "ከሰዓት" : "ጠዋት";
        let hours = date.getHours() % 12;
        hours = hours ? hours : 12;
        const minutes = date.getMinutes().toString().padStart(2, '0');
        result += ` ${ampm} ${hours}:${minutes}`;
      }

      return result.trim().replace(/፣\s*$/, '');
    }

    // Default English localization
    return new Intl.DateTimeFormat("en-US", {
      ...options as any,
      timeZone: "Africa/Addis_Ababa",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(dateInput);
  }
}

/**
 * Formats time into a localized string
 */
export function formatLocalizedTime(
  dateInput: string | Date | number,
  language: Language = "en"
): string {
  return formatLocalizedDate(dateInput, language, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Specific Gregorian to Ethiopian Calendar (EC) conversion
 * Simple implementation for display purposes
 */
export function toEthiopianDateString(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  // The Ethiopian calendar is approximately 7-8 years behind Gregorian.
  // This is a simplified conversion logic.
  // For a production app, we'd use a dedicated library like 'ethiopian-date'.
  // But we can approximate for UI display of 'standards'.
  
  // Meskerem 1 (New Year) is typically Sept 11 or 12.
  
  // Real EC calculation is complex, but let's provide a "Standard" formatter 
  // that at least uses Amharic names for Gregorian if EC logic is not fully available.
  return new Intl.DateTimeFormat("am-ET", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Addis_Ababa",
  }).format(date);
}

/**
 * Gets a relative time string (e.g., "Just now", "2 mins ago")
 */
export function getRelativeTimeString(
  dateInput: string | Date | number,
  language: Language = "en",
  t: (key: any) => string
): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t("just_now");
  
  // For simplicity, we fallback to localized short date if it's older than a minute
  return formatLocalizedDate(date, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
