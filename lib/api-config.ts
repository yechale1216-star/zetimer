/**
 * Centralized API URL configuration to prevent circular dependencies.
 */
export const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    // Determine if we are on a local network or localhost
    return "https://zetimer-ctgw.onrender.com";
  }
  return "https://zetimer-ctgw.onrender.com";
};

export const API_URL = getApiUrl();
