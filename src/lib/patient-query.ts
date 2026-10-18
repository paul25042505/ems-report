import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export type PatientFilter = {
  event?: string;
  station?: string;
  triage?: string;
  disposition?: string;
  category?: string;
};

export function patientWhere(eventId: string, f: PatientFilter): Prisma.PatientWhereInput {
  const triage = Number(f.triage);
  return {
    station: { eventId },
    ...(f.station ? { stationId: f.station } : {}),
    ...(triage >= 1 && triage <= 5 ? { triage } : {}),
    ...(f.disposition ? { disposition: f.disposition } : {}),
    ...(f.category ? { category: f.category } : {}),
  };
}

export function findPatients(eventId: string, f: PatientFilter) {
  return db.patient.findMany({
    where: patientWhere(eventId, f),
    include: { station: { select: { name: true } } },
    orderBy: { arrivedAt: "desc" },
  });
}
