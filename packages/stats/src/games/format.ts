export function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function formatInteger(value: number | null): string {
  return value === null ? "—" : Math.round(value).toLocaleString("en-US");
}

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}
