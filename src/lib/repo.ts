// Firestore 資料存取層。
// 所有查詢只用單一欄位的等值條件（Firestore 自動建立索引），排序在程式內完成，
// 因此不需要另外建立複合索引。單一活動的資料量（數百筆）在記憶體內處理綽綽有餘。
import { Timestamp, type DocumentSnapshot, type Query } from "firebase-admin/firestore";
import { DEFAULT_SUPPLIES } from "./constants";
import { firestore } from "./firestore";

export type Event = {
  id: string;
  name: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
};

export type Station = {
  id: string;
  eventId: string;
  name: string;
  location: string;
  lat: number | null;
  lng: number | null;
  /** OPEN | PAUSED | CLOSED */
  status: string;
  contactName: string;
  contactPhone: string;
  lastReportAt: Date | null;
  /** 顯示順序（小的在前）；舊資料沒有時以建立時間排序 */
  order?: number;
  createdAt: Date;
};

const stationOrder = (s: Station) => s.order ?? s.createdAt.getTime();

/** 傷患紀錄 */
export type Patient = {
  id: string;
  eventId: string;
  stationId: string;
  arrivedAt: Date;
  patientType: string;
  /** 階級（國軍官兵才有） */
  rank: string;
  /** 姓名（選填） */
  name: string;
  sex: string;
  /** 實際年齡（不知道時為 null，只記年齡層） */
  age: number | null;
  ageGroup: string;
  category: string;
  complaint: string;
  treatment: string;
  disposition: string;
  hospital: string;
  ambulance: string;
  departedAt: Date | null;
  note: string;
  reporterName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Supply = {
  id: string;
  eventId: string;
  stationId: string;
  name: string;
  unit: string;
  quantity: number;
  threshold: number;
  updatedAt: Date;
};

export type SupportRequest = {
  id: string;
  eventId: string;
  stationId: string;
  type: string;
  content: string;
  urgent: boolean;
  /** PENDING | IN_PROGRESS | DONE */
  status: string;
  reporterName: string;
  handlerName: string;
  response: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditLog = {
  id: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  createdAt: Date;
};

const col = {
  events: firestore.collection("events"),
  stations: firestore.collection("stations"),
  patients: firestore.collection("patients"),
  supplies: firestore.collection("supplies"),
  requests: firestore.collection("requests"),
  auditLogs: firestore.collection("auditLogs"),
  allowedUsers: firestore.collection("allowedUsers"),
  accountRequests: firestore.collection("accountRequests"),
};

/** Firestore 的 Timestamp 轉回 Date */
function fromDoc<T>(snap: DocumentSnapshot): T | null {
  if (!snap.exists) return null;
  const data = snap.data()!;
  const out: Record<string, unknown> = { id: snap.id };
  for (const [k, v] of Object.entries(data)) out[k] = v instanceof Timestamp ? v.toDate() : v;
  return out as T;
}

async function all<T>(query: Query): Promise<T[]> {
  const snap = await query.get();
  return snap.docs.map((d) => fromDoc<T>(d)!);
}

const byDesc = <T>(key: (x: T) => Date) => (a: T, b: T) => key(b).getTime() - key(a).getTime();
const byAsc = <T>(key: (x: T) => Date) => (a: T, b: T) => key(a).getTime() - key(b).getTime();

type NewData<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

// ── 活動場次 ──────────────────────────────────────────────

export async function listEvents() {
  return (await all<Event>(col.events)).sort(byDesc((e) => e.startDate));
}

export async function getEvent(id: string) {
  return fromDoc<Event>(await col.events.doc(id).get());
}

export async function getActiveEvent() {
  const events = await listEvents();
  return events.find((e) => e.isActive) ?? events[0] ?? null;
}

export async function createEvent(data: Omit<NewData<Event>, "isActive">) {
  const hasActive = !(await col.events.where("isActive", "==", true).limit(1).get()).empty;
  const ref = await col.events.add({ ...data, isActive: !hasActive, createdAt: new Date() });
  return ref.id;
}

export async function updateEvent(id: string, data: Partial<NewData<Event>>) {
  await col.events.doc(id).update(data);
}

export async function activateEvent(id: string) {
  const batch = firestore.batch();
  for (const doc of (await col.events.get()).docs) batch.update(doc.ref, { isActive: doc.id === id });
  await batch.commit();
}

// ── 救護站 ────────────────────────────────────────────────

export async function listStations(eventId: string) {
  return (await all<Station>(col.stations.where("eventId", "==", eventId))).sort((a, b) => stationOrder(a) - stationOrder(b));
}

export async function countStations(eventId: string) {
  return (await col.stations.where("eventId", "==", eventId).count().get()).data().count;
}

export async function getStation(id: string) {
  return fromDoc<Station>(await col.stations.doc(id).get());
}

/** 建立救護站並一併建立預設物資品項 */
export async function createStation(
  data: Omit<NewData<Station>, "lastReportAt"> & { lastReportAt?: Date | null },
  supplies: readonly { name: string; unit: string; quantity: number; threshold: number }[],
) {
  const now = new Date();
  const ref = col.stations.doc();
  const batch = firestore.batch();
  // 新站排在最後
  batch.set(ref, { lastReportAt: null, ...data, order: now.getTime(), createdAt: now });
  for (const s of supplies) {
    batch.set(col.supplies.doc(), { ...s, eventId: data.eventId, stationId: ref.id, updatedAt: now });
  }
  await batch.commit();
  return ref.id;
}

/** 把救護站往上或往下移一格，並將整個場次的順序重新編號 */
export async function moveStation(stationId: string, direction: "up" | "down") {
  const station = await getStation(stationId);
  if (!station) return;
  const list = await listStations(station.eventId);
  const i = list.findIndex((s) => s.id === stationId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const batch = firestore.batch();
  list.forEach((s, index) => batch.update(col.stations.doc(s.id), { order: index }));
  await batch.commit();
}

export async function updateStation(id: string, data: Partial<NewData<Station>>) {
  await col.stations.doc(id).update(data);
}

/** 任何站點操作都視為一次回報 */
export async function touchStation(id: string) {
  await col.stations.doc(id).update({ lastReportAt: new Date() });
}

export async function countPatients(stationId: string) {
  return (await col.patients.where("stationId", "==", stationId).count().get()).data().count;
}

/** 刪除救護站與其物資、申請（呼叫前需確認沒有傷患紀錄） */
export async function deleteStation(id: string) {
  const batch = firestore.batch();
  for (const c of [col.supplies, col.requests]) {
    for (const doc of (await c.where("stationId", "==", id).get()).docs) batch.delete(doc.ref);
  }
  batch.delete(col.stations.doc(id));
  await batch.commit();
}

// ── 傷患 ──────────────────────────────────────────────────

export async function listPatientsByStation(stationId: string) {
  return (await all<Patient>(col.patients.where("stationId", "==", stationId))).sort(byDesc((p) => p.arrivedAt));
}

export async function listPatientsByEvent(eventId: string) {
  return (await all<Patient>(col.patients.where("eventId", "==", eventId))).sort(byDesc((p) => p.arrivedAt));
}

export async function getPatient(id: string) {
  return fromDoc<Patient>(await col.patients.doc(id).get());
}

export async function createPatient(data: NewData<Patient>) {
  const now = new Date();
  const ref = await col.patients.add({ ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function updatePatient(id: string, data: Partial<NewData<Patient>>) {
  await col.patients.doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deletePatient(id: string) {
  await col.patients.doc(id).delete();
}

// ── 物資 ──────────────────────────────────────────────────

const byName = (a: Supply, b: Supply) => a.name.localeCompare(b.name, "zh-Hant");

export async function listSuppliesByStation(stationId: string) {
  return (await all<Supply>(col.supplies.where("stationId", "==", stationId))).sort(byName);
}

export async function listSuppliesByEvent(eventId: string) {
  return (await all<Supply>(col.supplies.where("eventId", "==", eventId))).sort(byName);
}

export async function getSupply(id: string) {
  return fromDoc<Supply>(await col.supplies.doc(id).get());
}

export async function createSupply(data: Omit<NewData<Supply>, "updatedAt">) {
  const ref = await col.supplies.add({ ...data, updatedAt: new Date() });
  return ref.id;
}

export async function updateSupply(id: string, data: Partial<NewData<Supply>>) {
  await col.supplies.doc(id).update({ ...data, updatedAt: new Date() });
}

// ── 支援申請 ──────────────────────────────────────────────

export async function listRequestsByStation(stationId: string) {
  return (await all<SupportRequest>(col.requests.where("stationId", "==", stationId))).sort(byDesc((r) => r.createdAt));
}

export async function listRequestsByEvent(eventId: string) {
  return (await all<SupportRequest>(col.requests.where("eventId", "==", eventId))).sort(byDesc((r) => r.createdAt));
}

export async function getRequest(id: string) {
  return fromDoc<SupportRequest>(await col.requests.doc(id).get());
}

export async function createRequest(data: Omit<NewData<SupportRequest>, "status" | "handlerName" | "response">) {
  const now = new Date();
  const ref = await col.requests.add({ ...data, status: "PENDING", handlerName: "", response: "", createdAt: now, updatedAt: now });
  return ref.id;
}

export async function updateRequest(id: string, data: Partial<NewData<SupportRequest>>) {
  await col.requests.doc(id).update({ ...data, updatedAt: new Date() });
}

// ── 操作紀錄 ──────────────────────────────────────────────

export async function addAuditLog(data: Omit<AuditLog, "id" | "createdAt">) {
  await col.auditLogs.add({ ...data, createdAt: new Date() });
}

export async function listAuditLogs(limit: number) {
  return all<AuditLog>(col.auditLogs.orderBy("createdAt", "desc").limit(limit));
}

// ── 登入名單 ──────────────────────────────────────────────

/** 允許以 Google 帳號登入的名單；文件 id 為小寫 email */
export type AllowedUser = {
  id: string;
  email: string;
  note: string;
  /** 可複選：COMMAND（指揮中心）、STATION（站點人員） */
  roles?: string[];
  /** 舊版的單一角色欄位，讀取時轉成 roles */
  role?: string;
  createdAt: Date;
};

/** 讀出成員的角色：舊資料的「指揮中心」原本可進入所有頁面，轉為兩者皆有；沒有角色時視為站點人員 */
export function rolesOfMember(u: Pick<AllowedUser, "roles" | "role">): string[] {
  if (u.roles) return u.roles;
  return u.role === "COMMAND" ? ["COMMAND", "STATION"] : ["STATION"];
}

export const emailId = (email: string) => email.trim().toLowerCase();

export async function listAllowedUsers() {
  return (await all<AllowedUser>(col.allowedUsers)).sort(byAsc((u) => u.createdAt));
}

/** 回傳名單上的角色；不在名單上回傳 null */
export async function getAllowedRoles(email: string): Promise<string[] | null> {
  const snap = await col.allowedUsers.doc(emailId(email)).get();
  return snap.exists ? rolesOfMember(snap.data() as AllowedUser) : null;
}

export async function addAllowedUser(email: string, note: string, roles: string[]) {
  const id = emailId(email);
  await col.allowedUsers.doc(id).set({ email: id, note, roles, createdAt: new Date() });
}

export async function setAllowedUserRoles(email: string, roles: string[]) {
  await col.allowedUsers.doc(emailId(email)).update({ roles });
}

export async function removeAllowedUser(email: string) {
  await col.allowedUsers.doc(emailId(email)).delete();
}

// ── 帳號申請 ──────────────────────────────────────────────

/** 不在登入名單上的人以 Google 登入後提出的申請；文件 id 為小寫 email */
export type AccountRequest = {
  id: string;
  email: string;
  unit: string;
  rank: string;
  name: string;
  /** PENDING | APPROVED | REJECTED */
  status: string;
  reviewedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getAccountRequest(email: string) {
  return fromDoc<AccountRequest>(await col.accountRequests.doc(emailId(email)).get());
}

export async function listPendingAccountRequests() {
  return (await all<AccountRequest>(col.accountRequests.where("status", "==", "PENDING"))).sort(byAsc((r) => r.createdAt));
}

/** 送出或重新送出申請（狀態回到待審核） */
export async function submitAccountRequest(email: string, data: { unit: string; rank: string; name: string }) {
  const id = emailId(email);
  const now = new Date();
  await col.accountRequests.doc(id).set({ ...data, email: id, status: "PENDING", reviewedBy: "", createdAt: now, updatedAt: now });
}

export async function reviewAccountRequest(email: string, status: "APPROVED" | "REJECTED", reviewedBy: string) {
  await col.accountRequests.doc(emailId(email)).update({ status, reviewedBy, updatedAt: new Date() });
}

// ── 清除測試資料 ──────────────────────────────────────────

/**
 * 把場次恢復成剛建立救護站時的狀態：刪除傷患紀錄與支援申請、物資恢復預設清單與數量、
 * 救護站改回「開設中」並清除最後回報時間。救護站、場次、登入名單與操作紀錄保留。
 */
export async function resetEventData(eventId: string) {
  const [patients, requests, supplies, stations] = await Promise.all(
    [col.patients, col.requests, col.supplies, col.stations].map((c) => c.where("eventId", "==", eventId).get()),
  );
  const writer = firestore.bulkWriter();
  for (const doc of [...patients.docs, ...requests.docs, ...supplies.docs]) writer.delete(doc.ref);
  const now = new Date();
  for (const station of stations.docs) {
    writer.update(station.ref, { status: "OPEN", lastReportAt: null });
    for (const s of DEFAULT_SUPPLIES) {
      writer.create(col.supplies.doc(), { ...s, eventId, stationId: station.id, updatedAt: now });
    }
  }
  await writer.close();
  return { patients: patients.size, requests: requests.size, stations: stations.size };
}
