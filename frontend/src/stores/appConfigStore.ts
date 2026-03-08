import { create } from "zustand";
import api from "@/services/api";

export interface EmailConfig {
  enabled?: boolean;
  fromEmail?: string;
  fromName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
}

export interface AppConfig {
  defaultCurrency: string;
  currencySymbol: string;
  timezone?: string;
  defaultPreferredLanguage?: string;
  emailConfig?: EmailConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  defaultCurrency: "USD",
  currencySymbol: "$"
};

interface AppConfigState {
  config: AppConfig;
  isLoading: boolean;
  isLoaded: boolean;
  fetchConfig: () => Promise<void>;
  hydrateConfig: (config: Partial<AppConfig>) => void;
  setConfig: (config: Partial<AppConfig>) => void;
}

export const useAppConfigStore = create<AppConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  isLoading: false,
  isLoaded: true,

  fetchConfig: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const [appRes, tenantRes] = await Promise.all([
        api.get<AppConfig>("/api/config/app-config").catch(() => ({ data: null })),
        api.get<{ defaultCurrency?: string; currencySymbol?: string; timezone?: string; defaultPreferredLanguage?: string } | null>("/api/config/tenant-context").catch(() => ({ data: null })),
      ]);
      const appData = appRes?.data;
      const tenantData = tenantRes?.data;
      set({
        config: {
          defaultCurrency:
            tenantData?.defaultCurrency ??
            appData?.defaultCurrency ??
            DEFAULT_CONFIG.defaultCurrency,
          currencySymbol:
            tenantData?.currencySymbol ??
            appData?.currencySymbol ??
            DEFAULT_CONFIG.currencySymbol,
          timezone: tenantData?.timezone ?? appData?.timezone,
          defaultPreferredLanguage:
            tenantData?.defaultPreferredLanguage ?? appData?.defaultPreferredLanguage,
        },
        isLoaded: true
      });
    } catch {
      set({ config: DEFAULT_CONFIG, isLoaded: true });
    } finally {
      set({ isLoading: false });
    }
  },

  hydrateConfig: (config) => {
    set({
      config: {
        defaultCurrency: config.defaultCurrency ?? DEFAULT_CONFIG.defaultCurrency,
        currencySymbol: config.currencySymbol ?? DEFAULT_CONFIG.currencySymbol,
        timezone: config.timezone,
        defaultPreferredLanguage: config.defaultPreferredLanguage,
      },
      isLoaded: true,
    });
  },

  setConfig: (config) => {
    set((s) => ({ config: { ...s.config, ...config } }));
  }
}));

/**
 * Format a number as currency using the app's default currency symbol.
 * Uses the symbol from app config when available; falls back to $ otherwise.
 */
export function formatCurrency(
  value: number,
  options?: {
    symbol?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { config } = useAppConfigStore.getState();
  const symbol = options?.symbol ?? config.currencySymbol;
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2
  });
  return `${formatted}${symbol}`;
}
