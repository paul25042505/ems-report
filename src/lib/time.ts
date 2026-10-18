// 活動在台灣舉行，所有顯示與時段統計一律使用台北時間，不受伺服器時區影響。

export const TZ = "Asia/Taipei";
const TZ_OFFSET = "+08:00";

const dateTimeFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parts(d: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour, min: p.minute };
}

export const formatDateTime = (d: Date) => dateTimeFmt.format(d);
export const formatTime = (d: Date) => timeFmt.format(d);

/** 給 <input type="datetime-local"> 用的值，例如 2026-10-18T09:30 */
export function toLocalInput(d: Date) {
  const p = parts(d);
  return `${p.y}-${p.m}-${p.d}T${p.h}:${p.min}`;
}

/** 給 <input type="date"> 用的值，例如 2026-10-18 */
export function toLocalDateInput(d: Date) {
  const p = parts(d);
  return `${p.y}-${p.m}-${p.d}`;
}

/** 將 datetime-local 或 date 輸入值視為台北時間解析；格式錯誤回傳 null */
export function parseLocalInput(value: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2] ?? "00:00"}:00${TZ_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 台北時間的「YYYY-MM-DD HH時」時段鍵，用於每小時統計 */
export function hourKey(d: Date) {
  const p = parts(d);
  return `${p.y}-${p.m}-${p.d} ${p.h}`;
}

/** 台北時間當日 00:00 */
export function startOfLocalDay(d: Date) {
  const p = parts(d);
  return new Date(`${p.y}-${p.m}-${p.d}T00:00:00${TZ_OFFSET}`);
}

export function minutesSince(d: Date, now = new Date()) {
  return Math.floor((now.getTime() - d.getTime()) / 60000);
}

export function formatAgo(d: Date | null, now = new Date()) {
  if (!d) return "尚未回報";
  const m = minutesSince(d, now);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  return `${h} 小時 ${m % 60} 分前`;
}
