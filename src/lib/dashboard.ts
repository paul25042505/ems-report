import "server-only";
import { db } from "./db";
import { computeAlerts, countBy, hourlyCounts, totals, type PatientLite } from "./summary";

export async function getActiveEvent() {
  return (
    (await db.event.findFirst({ where: { isActive: true }, orderBy: { startDate: "desc" } })) ??
    (await db.event.findFirst({ orderBy: { startDate: "desc" } }))
  );
}

/** 依網址參數 ?event= 取得場次，沒有指定時使用目前啟用的場次 */
export async function resolveEvent(eventId?: string) {
  if (eventId) {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (event) return event;
  }
  return getActiveEvent();
}

export async function getEventDashboard(eventId: string, now = new Date()) {
  const stations = await db.station.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: {
      patients: true,
      supplies: { orderBy: { name: "asc" } },
      requests: { orderBy: { createdAt: "desc" } },
    },
  });

  const patients: PatientLite[] = stations.flatMap((s) => s.patients);
  const supplies = stations.flatMap((s) => s.supplies);
  const requests = stations.flatMap((s) => s.requests);

  return {
    stations: stations.map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location,
      lat: s.lat,
      lng: s.lng,
      status: s.status,
      contactName: s.contactName,
      contactPhone: s.contactPhone,
      lastReportAt: s.lastReportAt,
      totals: totals(s.patients),
      lowSupplies: s.supplies.filter((x) => x.quantity <= x.threshold),
      pendingRequests: s.requests.filter((r) => r.status !== "DONE").length,
    })),
    totals: totals(patients),
    pendingRequests: requests.filter((r) => r.status === "PENDING").length,
    byTriage: countBy(patients, (p) => p.triage),
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
