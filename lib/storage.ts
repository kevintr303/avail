import Cookies from "js-cookie";
import { CheckHistory } from "@/types";
import { SEARCH_CONFIG, THEME_CONFIG } from "@/config/constants";

const HISTORY_KEY = "domain_check_history";
const THEME_KEY = "selected_theme";
const TLDS_KEY = "selected_tlds";
const TLDS_CACHE_KEY = "tlds_cache";
const TLDS_CACHE_DURATION = 24 * 60 * 60 * 1000;

export const storage = {
  getHistory(): CheckHistory[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addToHistory(history: CheckHistory): void {
    if (typeof window === "undefined") return;
    const current = this.getHistory();
    const updated = [history, ...current].slice(0, SEARCH_CONFIG.maxHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  },

  clearHistory(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(HISTORY_KEY);
  },

  getTheme(): number {
    const stored = Cookies.get(THEME_KEY);
    return stored ? parseInt(stored, 10) : 0;
  },

  setTheme(themeIndex: number): void {
    Cookies.set(THEME_KEY, themeIndex.toString(), { expires: THEME_CONFIG.cookieExpiry });
  },

  getTlds(): string[] {
    const stored = Cookies.get(TLDS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  setTlds(tlds: string[]): void {
    Cookies.set(TLDS_KEY, JSON.stringify(tlds), { expires: THEME_CONFIG.cookieExpiry });
  },

  getCachedTlds(): { tlds: string[]; popular: string[] } | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(TLDS_CACHE_KEY);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      if (now - parsed.timestamp > TLDS_CACHE_DURATION) {
        localStorage.removeItem(TLDS_CACHE_KEY);
        return null;
      }
      return { tlds: parsed.tlds || [], popular: parsed.popular || [] };
    } catch {
      return null;
    }
  },

  setCachedTlds(tlds: string[], popular: string[]): void {
    if (typeof window === "undefined") return;
    const data = {
      tlds,
      popular,
      timestamp: Date.now(),
    };
    localStorage.setItem(TLDS_CACHE_KEY, JSON.stringify(data));
  },
};
