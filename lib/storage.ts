import Cookies from "js-cookie";
import { CheckHistory } from "@/types";
import { SEARCH_CONFIG, THEME_CONFIG } from "@/config/constants";

const HISTORY_KEY = "domain_check_history";
const THEME_KEY = "selected_theme";
const TLDS_KEY = "selected_tlds";

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
};
