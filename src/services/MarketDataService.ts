/**
 * Live market data via Yahoo Finance v8 (unofficial, no key needed).
 * Covers Indian equity sectors, gold, silver, and real estate index.
 */

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

export type AssetCategory = 'equity' | 'commodity' | 'realestate';

export interface AssetData {
  symbol:       string;
  name:         string;
  category:     AssetCategory;
  currentPrice: number;
  currency:     string;
  change1W:     number;   // % change
  change1M:     number;
  change3M:     number;
  trend:        'up' | 'down' | 'flat';
  priceHistory: number[]; // weekly closes, oldest first
}

const TRACKED_ASSETS: { symbol: string; name: string; category: AssetCategory }[] = [
  // Broad market
  { symbol: '^NSEI',          name: 'Nifty 50',      category: 'equity'      },
  { symbol: '^NSEBANK',       name: 'Bank Nifty',    category: 'equity'      },
  // Sectors
  { symbol: 'NIFTYIT.NS',     name: 'IT',            category: 'equity'      },
  { symbol: 'NIFTYPHARMA.NS', name: 'Pharma',        category: 'equity'      },
  { symbol: 'NIFTYFMCG.NS',   name: 'FMCG',          category: 'equity'      },
  { symbol: 'NIFTYAUTO.NS',   name: 'Auto',          category: 'equity'      },
  { symbol: 'NIFTYENERGY.NS', name: 'Energy',        category: 'equity'      },
  // Real estate (listed RE companies index)
  { symbol: '^CNXREALTY',     name: 'Realty Index',  category: 'realestate'  },
  // Commodities
  { symbol: 'GOLDBEES.NS',    name: 'Gold ETF',      category: 'commodity'   },
  { symbol: 'SILVERBEES.NS',  name: 'Silver ETF',    category: 'commodity'   },
];

async function fetchAsset(
  symbol: string,
  name: string,
  category: AssetCategory,
): Promise<AssetData | null> {
  try {
    const url = `${YF_BASE}/${encodeURIComponent(symbol)}?range=3mo&interval=1wk`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const cleanCloses = closes.filter((v): v is number => v !== null && !isNaN(v));
    if (cleanCloses.length === 0) return null;

    const current = result.meta?.regularMarketPrice ?? cleanCloses[cleanCloses.length - 1];
    const currency = result.meta?.currency ?? 'INR';
    const len = cleanCloses.length;

    const pct = (old: number) => old > 0 ? ((current - old) / old) * 100 : 0;
    const change1W = len >= 2 ? pct(cleanCloses[len - 2]) : 0;
    const change1M = len >= 5 ? pct(cleanCloses[len - 5]) : 0;
    const change3M = len >= 1 ? pct(cleanCloses[0])       : 0;

    return {
      symbol, name, category,
      currentPrice: current,
      currency,
      change1W, change1M, change3M,
      trend: change1M > 1.5 ? 'up' : change1M < -1.5 ? 'down' : 'flat',
      priceHistory: cleanCloses,
    };
  } catch {
    return null;
  }
}

export async function fetchAllAssets(): Promise<AssetData[]> {
  const results = await Promise.all(
    TRACKED_ASSETS.map(a => fetchAsset(a.symbol, a.name, a.category))
  );
  return results.filter(Boolean) as AssetData[];
}

/** Format % change for display */
export function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

/** Trend colour */
export function trendColor(n: number): string {
  return n >= 0 ? '#4ADE80' : '#FF4757';
}
