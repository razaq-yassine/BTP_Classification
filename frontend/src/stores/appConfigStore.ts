import { create } from "zustand";
import api from "@/services/api";

export interface AppConfig {
  defaultCurrency: string;
  currencySymbol: string;
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
  setConfig: (config: Partial<AppConfig>) => void;
}

export const useAppConfigStore = create<AppConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  isLoading: false,
  isLoaded: false,

  fetchConfig: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get<AppConfig>("/api/config/app-config");
      set({
        config: {
          defaultCurrency:
            data?.defaultCurrency ?? DEFAULT_CONFIG.defaultCurrency,
          currencySymbol: data?.currencySymbol ?? DEFAULT_CONFIG.currencySymbol
        },
        isLoaded: true
      });
    } catch {
      set({ config: DEFAULT_CONFIG, isLoaded: true });
    } finally {
      set({ isLoading: false });
    }
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
