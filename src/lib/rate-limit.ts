// 簡易記憶體內登入失敗次數限制（單一主機部署足夠）
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;

const failures = new Map<string, { count: number; first: number }>();

export function isLimited(key: string, now = Date.now()) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (now - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(key: string, now = Date.now()) {
  const entry = failures.get(key);
  if (!entry || now - entry.first > WINDOW_MS) failures.set(key, { count: 1, first: now });
  else entry.count += 1;
}

export function clearFailures(key: string) {
  failures.delete(key);
}
