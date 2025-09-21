// Utilities to convert and format salaries in INR

// Default conversion rate; overridden by client env var VITE_USD_INR_RATE when provided
const DEFAULT_USD_INR = 83;

function readEnvRate(): number | null {
  try {
    // import.meta.env is available in Vite client builds
    const raw = (import.meta as any)?.env?.VITE_USD_INR_RATE ?? (import.meta as any)?.env?.VITE_USD_TO_INR;
    if (raw == null) return null;
    const n = Number(raw);
    if (!isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

export function getUsdInrRate(): number {
  return readEnvRate() ?? DEFAULT_USD_INR;
}

export function formatINR(amountINR: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(amountINR));
  } catch {
    // Fallback formatting
    return `₹${Math.round(amountINR).toLocaleString('en-IN')}`;
  }
}

export function usdToInr(amountUSD: number, rate: number = getUsdInrRate()): number {
  if (!isFinite(amountUSD)) return 0;
  return amountUSD * rate;
}

function parseUsdToken(token: string): number | null {
  if (!token) return null;
  let t = token.trim().toLowerCase();
  t = t.replace(/\$/g, '').replace(/,/g, '');
  let multiplier = 1;
  if (t.endsWith('k')) {
    multiplier = 1_000;
    t = t.slice(0, -1);
  } else if (t.endsWith('m')) {
    multiplier = 1_000_000;
    t = t.slice(0, -1);
  }
  const val = parseFloat(t);
  if (isNaN(val)) return null;
  return val * multiplier;
}

export function toINRRange(range: string, rate: number = getUsdInrRate()): string {
  if (!range || typeof range !== 'string') return '';
  const parts = range.split(/\s*-\s*/);
  if (parts.length === 1) {
    const v = parseUsdToken(parts[0]);
    if (v == null) return range;
    return formatINR(usdToInr(v, rate));
  }
  const a = parseUsdToken(parts[0]);
  const b = parseUsdToken(parts[1]);
  if (a == null || b == null) return range;
  return `${formatINR(usdToInr(a, rate))} - ${formatINR(usdToInr(b, rate))}`;
}
