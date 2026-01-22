import { Theme } from "@/types";

export const themes: Theme[] = [
  {
    colors: {
      primary: "#11151c",
      secondary: "#212d40",
      tertiary: "#364156",
      quaternary: "#7d4e57",
      quinary: "#d66853",
    },
  },
  {
    colors: {
      primary: "#4c212a",
      secondary: "#01172f",
      tertiary: "#00635d",
      quaternary: "#08a4bd",
      quinary: "#446df6",
    },
  },
  {
    colors: {
      primary: "#092327",
      secondary: "#0b5351",
      tertiary: "#00a9a5",
      quaternary: "#4e8098",
      quinary: "#90c2e7",
    },
  },
  {
    colors: {
      primary: "#d0e3cc",
      secondary: "#f7ffdd",
      tertiary: "#fcfdaf",
      quaternary: "#efd780",
      quinary: "#dba159",
    },
  },
  {
    colors: {
      primary: "#546a76",
      secondary: "#88a0a8",
      tertiary: "#b4ceb3",
      quaternary: "#dbd3c9",
      quinary: "#fad4d8",
    },
  },
];

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Calculate relative luminance according to WCAG 2.0
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors according to WCAG 2.0
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get the best text color (white or black) with opacity that meets WCAG AA standard (4.5:1)
 * for normal text on the given background
 */
function getAccessibleTextColor(backgroundColor: string): { color: string; opacity: number } {
  const white = "#ffffff";
  const black = "#000000";

  const targetContrast = 4.5;

  const whiteContrast = getContrastRatio(backgroundColor, white);

  const blackContrast = getContrastRatio(backgroundColor, black);

  if (whiteContrast > blackContrast) {
    if (whiteContrast >= targetContrast) {
      return { color: white, opacity: 1 };
    } else {
      return { color: white, opacity: 1 };
    }
  } else {
    if (blackContrast >= targetContrast) {
      return { color: black, opacity: 1 };
    } else {
      return { color: black, opacity: 1 };
    }
  }
}

/**
 * Get muted text color with WCAG AA compliance for small text (3:1 ratio)
 */
function getMutedTextColor(backgroundColor: string): { color: string; opacity: number } {
  const white = "#ffffff";
  const black = "#000000";

  const minContrast = 3.0;

  const whiteContrast = getContrastRatio(backgroundColor, white);
  const blackContrast = getContrastRatio(backgroundColor, black);

  if (whiteContrast > blackContrast) {
    if (whiteContrast >= minContrast) {
      return { color: white, opacity: 0.6 };
    } else {
      return { color: white, opacity: 0.8 };
    }
  } else {
    if (blackContrast >= minContrast) {
      return { color: black, opacity: 0.5 };
    } else {
      return { color: black, opacity: 0.7 };
    }
  }
}

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.colors.primary);
  root.style.setProperty("--color-secondary", theme.colors.secondary);
  root.style.setProperty("--color-tertiary", theme.colors.tertiary);
  root.style.setProperty("--color-quaternary", theme.colors.quaternary);
  root.style.setProperty("--color-quinary", theme.colors.quinary);
  root.style.setProperty("--color-background", theme.colors.primary);
  root.style.setProperty("--color-popover", theme.colors.secondary);
  root.style.setProperty("--color-ring", theme.colors.quinary);

  const textColor = getAccessibleTextColor(theme.colors.primary);
  const mutedTextColor = getMutedTextColor(theme.colors.primary);
  const iconBgTextColor = getAccessibleTextColor(theme.colors.quinary);

  const primaryRgb = hexToRgb(theme.colors.primary);
  const primaryLuminance = getRelativeLuminance(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  const isLightTheme = primaryLuminance > 0.5;

  if (isLightTheme) {
    root.style.setProperty("--panel-bg", "rgba(0, 0, 0, 0.15)");
    root.style.setProperty("--panel-bg-strong", "rgba(0, 0, 0, 0.25)");
    root.style.setProperty("--panel-border", "rgba(0, 0, 0, 0.15)");
    root.style.setProperty("--panel-hover-bg", "rgba(0, 0, 0, 0.1)");
  } else {
    root.style.setProperty("--panel-bg", "rgba(255, 255, 255, 0.03)");
    root.style.setProperty("--panel-bg-strong", "rgba(255, 255, 255, 0.06)");
    root.style.setProperty("--panel-border", "rgba(255, 255, 255, 0.08)");
    root.style.setProperty("--panel-hover-bg", "rgba(255, 255, 255, 0.05)");
  }

  root.style.setProperty("--color-text", textColor.color);
  root.style.setProperty("--color-text-opacity", textColor.opacity.toString());
  root.style.setProperty("--color-text-muted", mutedTextColor.color);
  root.style.setProperty("--color-text-muted-opacity", mutedTextColor.opacity.toString());
  root.style.setProperty("--color-icon-text", iconBgTextColor.color);
  root.style.setProperty("--color-icon-text-opacity", iconBgTextColor.opacity.toString());

  document.body.style.background = `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary}, ${theme.colors.tertiary})`;
};
