export interface DomainCheckResult {
  domain: string;
  available: boolean;
  error?: string;
  whoisData?: Record<string, unknown>;
}

export interface CheckHistory {
  timestamp: number;
  query: string;
  results: DomainCheckResult[];
}

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
    quinary: string;
  };
}
