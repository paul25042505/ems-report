import "server-only";
import { departmentOf } from "./constants";
import { listPatientsByEvent, listStations } from "./repo";

export type PatientFilter = {
  event?: string;
  station?: string;
  disposition?: string;
  department?: string;
  category?: string;
};

/** 取得場次的傷患紀錄（依篩選條件，新到舊），並附上站名 */
export async function findPatients(eventId: string, f: PatientFilter) {
  const [patients, stations] = await Promise.all([listPatientsByEvent(eventId), listStations(eventId)]);
  const names = new Map(stations.map((s) => [s.id, s.name]));
  return patients
    .filter(
      (p) =>
        (!f.station || p.stationId === f.station) &&
        (!f.disposition || p.disposition === f.disposition) &&
        (!f.department || departmentOf(p.category) === f.department) &&
        (!f.category || p.category === f.category),
    )
    .map((p) => ({ ...p, station: { name: names.get(p.stationId) ?? "" } }));
}
