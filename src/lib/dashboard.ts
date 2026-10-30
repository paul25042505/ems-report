import "server-only";
import {
  listLoansByEvent,
  getActiveEvent,
  getEvent,
  listPatientsByEvent,
  listRequestsByEvent,
  listStations,
  listSuppliesByEvent,
} from "./repo";
import { departmentOf } from "./constants";
import { computeAlerts, countBy, hourlyCounts, totals, wheelchairStatus } from "./summary";

export { getActiveEvent };

/** 依網址參數 ?event= 取得場次，沒有指定時使用目前啟用的場次 */
export async function resolveEvent(eventId?: string) {
  if (eventId) {
    const event = await getEvent(eventId);
    if (event) return event;
  }
  return getActiveEvent();
}

export async function getEventDashboard(eventId: string, now = new Date()) {
  const [stations, patients, supplies, requests, loans] = await Promise.all([
    listStations(eventId),
    listPatientsByEvent(eventId),
    listSuppliesByEvent(eventId),
    listRequestsByEvent(eventId),
    listLoansByEvent(eventId),
  ]);
  const chairs = wheelchairStatus(stations, loans);
  const stationName = new Map(stations.map((s) => [s.id, s.name]));

  return {
    stations: stations.map((s) => {
      const own = patients.filter((p) => p.stationId === s.id);
      return {
        id: s.id,
        name: s.name,
        location: s.location,
        lat: s.lat,
        lng: s.lng,
        status: s.status,
        contactName: s.contactName,
        contactPhone: s.contactPhone,
        lastReportAt: s.lastReportAt,
        totals: totals(own),
        lowSupplies: supplies.filter((x) => x.stationId === s.id && x.quantity <= x.threshold),
        pendingRequests: requests.filter((r) => r.stationId === s.id && r.status !== "DONE").length,
      };
    }),
    totals: totals(patients),
    pendingRequests: requests.filter((r) => r.status === "PENDING").length,
    byDepartment: countBy(patients, (p) => departmentOf(p.category)),
    byCategory: countBy(patients, (p) => p.category),
    byDisposition: countBy(patients, (p) => p.disposition),
    byPatientType: countBy(patients, (p) => p.patientType),
    byAgeGroup: countBy(patients, (p) => p.ageGroup),
    bySex: countBy(patients, (p) => p.sex),
    hourly: hourlyCounts(patients),
    alerts: computeAlerts({ stations, patients, supplies, requests, loans }, now),
    // 有配置輪椅、或有輪椅借用往來的站
    wheelchairs: stations
      .map((s) => ({ id: s.id, name: s.name, ...chairs.get(s.id)! }))
      .filter((c) => c.allocated > 0 || c.out > 0 || c.available > 0),
    openLoans: loans
      .filter((l) => !l.returnedAt)
      .map((l) => ({ ...l, stationName: stationName.get(l.stationId) ?? "" })),
  };
}

export type EventDashboard = Awaited<ReturnType<typeof getEventDashboard>>;
