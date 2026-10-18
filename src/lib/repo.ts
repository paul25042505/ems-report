// Firestore 資料存取層。
// 所有查詢只用單一欄位的等值條件（Firestore 自動建立索引），排序在程式內完成，
// 因此不需要另外建立複合索引。單一活動的資料量（數百筆）在記憶體內處理綽綽有餘。
import { Timestamp, type DocumentSnapshot, type Query } from "firebase-admin/firestore";
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
  createdAt: Date;
};

/** 傷患紀錄（去識別化，不收姓名、身分證） */
export type Patient = {
  id: string;
  eventId: string;
  stationId: string;
  arrivedAt: Date;
  patientType: string;
  sex: string;
  ageGroup: string;
  triage: number;
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
  return (await all<Station>(col.stations.where("eventId", "==", eventId))).sort(byAsc((s) => s.createdAt));
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
  batch.set(ref, { lastReportAt: null, ...data, createdAt: now });
  for (const s of supplies) {
    batch.set(col.supplies.doc(), { ...s, eventId: data.eventId, stationId: ref.id, updatedAt: now });
  }
  await batch.commit();
  return ref.id;
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
