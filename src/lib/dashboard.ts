import "server-only";
import {
  getActiveEvent,
  getEvent,
  listPatientsByEvent,
  listRequestsByEvent,
  listStations,
  listSuppliesByEvent,
} from "./repo";
import { computeAlerts, countBy, hourlyCounts, totals } from "./summary";

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
  const [stations, patients, supplies, requests] = await Promise.all([
    listStations(eventId),
    listPatientsByEvent(eventId),
    listSuppliesByEvent(eventId),
    listRequestsByEvent(eventId),
  ]);

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
    byCategory: countBy(patients, (p) => p.category),
    byDisposition: countBy(patients, (p) => p.disposition),
    byPatientType: countBy(patients, (p) => p.patientType),
    byAgeGroup: countBy(patients, (p) => p.ageGroup),
    bySex: countBy(patients, (p) => p.sex),
    hourly: hourlyCounts(patients),
    alerts: computeAlerts({ stations, patients, supplies, requests }, now),
  };
}

export type EventDashboard = Awaited<ReturnType<typeof getEventDashboard>>;
