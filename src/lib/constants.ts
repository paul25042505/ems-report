// 所有下拉選項的合法值與顯示文字。之後要對齊 Google 表單時，只需調整這個檔案。

type Option<T extends string | number> = { value: T; label: string };

function labelOf<T extends string | number>(options: readonly Option<T>[], value: T | string | number) {
  return options.find((o) => o.value === value)?.label ?? String(value);
}

export const ROLES = ["ADMIN", "COMMAND", "REPORTER"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "系統管理員",
  COMMAND: "指揮中心",
  REPORTER: "站點回報員",
};

export const STATION_STATUS = [
  { value: "OPEN", label: "開設中" },
  { value: "PAUSED", label: "暫停" },
  { value: "CLOSED", label: "已撤站" },
] as const satisfies readonly Option<string>[];
export type StationStatus = (typeof STATION_STATUS)[number]["value"];
export const stationStatusLabel = (v: string) => labelOf(STATION_STATUS, v);

export const PATIENT_TYPES = [
  { value: "PUBLIC", label: "民眾" },
  { value: "MILITARY", label: "國軍官兵" },
  { value: "STAFF", label: "工作人員" },
] as const satisfies readonly Option<string>[];
export const patientTypeLabel = (v: string) => labelOf(PATIENT_TYPES, v);

export const SEXES = [
  { value: "M", label: "男" },
  { value: "F", label: "女" },
  { value: "U", label: "不詳" },
] as const satisfies readonly Option<string>[];
export const sexLabel = (v: string) => labelOf(SEXES, v);

export const AGE_GROUPS = [
  { value: "CHILD", label: "兒童(0-12)" },
  { value: "TEEN", label: "青少年(13-17)" },
  { value: "ADULT", label: "成人(18-64)" },
  { value: "SENIOR", label: "長者(65+)" },
] as const satisfies readonly Option<string>[];
export const ageGroupLabel = (v: string) => labelOf(AGE_GROUPS, v);

// 台灣急診五級檢傷分類 (TTAS)
export const TRIAGE_LEVELS = [
  { value: 1, label: "1級 復甦急救", short: "1級", color: "bg-blue-700 text-white" },
  { value: 2, label: "2級 危急", short: "2級", color: "bg-red-600 text-white" },
  { value: 3, label: "3級 緊急", short: "3級", color: "bg-yellow-400 text-black" },
  { value: 4, label: "4級 次緊急", short: "4級", color: "bg-green-600 text-white" },
  { value: 5, label: "5級 非緊急", short: "5級", color: "bg-gray-200 text-black" },
] as const;
export const triageLabel = (v: number) => TRIAGE_LEVELS.find((t) => t.value === v)?.label ?? `${v}級`;
/** 1、2 級視為重症，需要指揮中心立即注意 */
export const CRITICAL_TRIAGE_MAX = 2;

export const CATEGORIES = [
  { value: "HEAT", label: "熱傷害（中暑/熱衰竭）" },
  { value: "DIZZY", label: "頭暈/暈眩" },
  { value: "ABRASION", label: "擦挫傷" },
  { value: "SPRAIN", label: "扭傷" },
  { value: "CUT", label: "割傷/撕裂傷" },
  { value: "INSECT", label: "蚊蟲叮咬" },
  { value: "GI", label: "腸胃不適" },
  { value: "ALLERGY", label: "過敏" },
  { value: "OTHER", label: "其他" },
] as const satisfies readonly Option<string>[];
export const categoryLabel = (v: string) => labelOf(CATEGORIES, v);

export const DISPOSITIONS = [
  { value: "OBSERVING", label: "留站觀察中" },
  { value: "RELEASED", label: "處置後離站" },
  { value: "TRANSFERRED", label: "後送醫院" },
  { value: "REFUSED", label: "拒絕就醫" },
] as const satisfies readonly Option<string>[];
export const dispositionLabel = (v: string) => labelOf(DISPOSITIONS, v);

export const REQUEST_TYPES = [
  { value: "STAFF", label: "人力支援" },
  { value: "SUPPLY", label: "物資補給" },
  { value: "AMBULANCE", label: "救護車" },
  { value: "OTHER", label: "其他" },
] as const satisfies readonly Option<string>[];
export const requestTypeLabel = (v: string) => labelOf(REQUEST_TYPES, v);

export const REQUEST_STATUS = [
  { value: "PENDING", label: "待處理" },
  { value: "IN_PROGRESS", label: "處理中" },
  { value: "DONE", label: "已完成" },
] as const satisfies readonly Option<string>[];
export const requestStatusLabel = (v: string) => labelOf(REQUEST_STATUS, v);

/** 新增救護站時預設建立的物資項目 */
export const DEFAULT_SUPPLIES = [
  { name: "飲用水", unit: "箱", quantity: 10, threshold: 3 },
  { name: "運動飲料", unit: "瓶", quantity: 48, threshold: 12 },
  { name: "冰敷袋", unit: "個", quantity: 50, threshold: 15 },
  { name: "紗布", unit: "包", quantity: 30, threshold: 10 },
  { name: "OK繃", unit: "盒", quantity: 10, threshold: 3 },
  { name: "生理食鹽水", unit: "瓶", quantity: 20, threshold: 5 },
  { name: "彈性繃帶", unit: "捲", quantity: 15, threshold: 5 },
] as const;

/** 站點超過幾分鐘沒有任何回報動作就發出告警 */
export const STALE_REPORT_MINUTES = 60;
