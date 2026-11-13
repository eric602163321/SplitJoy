// Fallback rates relative to USD (1 USD = X currency)
const USD_PIVOT_RATES: Record<string, number> = {
  USD: 1,
  TWD: 32.2,
  JPY: 152.0,
  HKD: 7.78,
  EUR: 0.92,
  KRW: 1380.0,
  THB: 34.5,
  GBP: 0.79,
  SGD: 1.34,
  AUD: 1.52,
  CAD: 1.39,
  CNY: 7.22,
};

const CACHE_KEY = 'splitit_exchange_rates_cache_v1';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CachedRateEntry {
  timestamp: number;
  rates: Record<string, number>;
}

function readCache(): Record<string, CachedRateEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CachedRateEntry>;
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CachedRateEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * 透過 USD 基準匯率表估算離線/預設匯率（支援任兩種支援幣別互換）
 */
export function getFallbackExchangeRate(fromCode: string, toCode: string): number {
  const from = fromCode.toUpperCase();
  const to = toCode.toUpperCase();
  if (from === to) return 1.0;

  const fromPerUsd = USD_PIVOT_RATES[from];
  const toPerUsd = USD_PIVOT_RATES[to];
  if (fromPerUsd && toPerUsd) {
    return toPerUsd / fromPerUsd;
  }
  return 1.0;
}

/**
 * 取得即時匯率（含 2 小時 localStorage 快取，避免重複請求外部 API）
 */
export async function fetchExchangeRate(fromCode: string, toCode: string): Promise<number | null> {
  const from = fromCode.toUpperCase();
  const to = toCode.toUpperCase();
  if (from === to) return 1.0;

  const cache = readCache();
  const entry = cache[from];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS && typeof entry.rates[to] === 'number') {
    return entry.rates[to];
  }

  const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data && data.rates && typeof data.rates[to] === 'number') {
    cache[from] = {
      timestamp: Date.now(),
      rates: data.rates
    };
    writeCache(cache);
    return data.rates[to];
  }
  return null;
}
