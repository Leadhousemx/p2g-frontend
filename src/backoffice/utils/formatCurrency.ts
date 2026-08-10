interface CurrencyConfig { symbol: string; decimals: number }

function fmtNum(value: number, decimals: number): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = value < 0 ? '-' : '';
  return decimals > 0 ? `${sign}${intFormatted}.${dec}` : `${sign}${intFormatted}`;
}

const CONFIG: Record<string, CurrencyConfig> = {
  USD: { symbol: '$',   decimals: 2 },
  MXN: { symbol: '$',   decimals: 2 },
  COP: { symbol: '$',   decimals: 0 },
  CLP: { symbol: '$',   decimals: 0 },
  PEN: { symbol: 'S/ ', decimals: 2 },
  UYU: { symbol: '$',   decimals: 2 },
  ARS: { symbol: '$',   decimals: 2 },
  BRL: { symbol: 'R$',  decimals: 2 },
};

export function formatCurrency(amount: number | null | undefined, currency: string): string {
  if (amount == null || isNaN(amount)) return '—';
  const cfg = CONFIG[currency] ?? { symbol: '', decimals: 2 };
  return `${currency} ${cfg.symbol}${fmtNum(amount, cfg.decimals)}`;
}

export function formatUsd(amount: number | null | undefined): string {
  return formatCurrency(amount, 'USD');
}
