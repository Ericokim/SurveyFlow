import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility: Merge Tailwind classes
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * LocalStorage helpers with encryption support (future)
 */
export const setStorageData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting ${key} in localStorage:`, error);
    return false;
  }
};

export const getStorageData = (key) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;

    // Only attempt JSON.parse when it looks like JSON; otherwise return the raw string (e.g. JWT)
    const firstChar = value.trim().charAt(0);
    const looksJson =
      firstChar === "{" || firstChar === "[" || firstChar === '"';
    if (looksJson) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  } catch (error) {
    console.error(`Error getting ${key} from localStorage:`, error);
    return null;
  }
};

export const clearStorageData = () => {
  // Preserve theme during logout
  const preserveKeys = ["vite-ui-theme"];
  const preserved = {};

  preserveKeys.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      preserved[key] = value;
    }
  });

  // Clear auth data (including Zustand persisted state)
  const authKeys = ["token", "user", "auth-storage"];
  authKeys.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Clear all sessionStorage (contains temporary session data)
  sessionStorage.clear();

  // Restore preserved keys
  Object.entries(preserved).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
};

export const removeStorageData = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
    return false;
  }
};

/**
 * Clear selected rows in DataTable
 */
export const clearSelectedRows = (table) => {
  table.resetRowSelection();
};

/**
 * Format currency (KES)
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

/**
 * Format date
 */
export const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

/**
 * Format date with time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid Date";
  }
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return "";

  const nameSplit = name.trim().split(/\s+/);
  const nameLength = nameSplit.length;

  if (nameLength > 1) {
    return (
      nameSplit[0].substring(0, 1).toUpperCase() +
      nameSplit[nameLength - 1].substring(0, 1).toUpperCase()
    );
  } else if (nameLength === 1) {
    return nameSplit[0].substring(0, 1).toUpperCase();
  }

  return "";
};

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format number with commas
 */
export const comma = (num) => {
  if (!num) return num;
  return Number(num).toLocaleString();
};
