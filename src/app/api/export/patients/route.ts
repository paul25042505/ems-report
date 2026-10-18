import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { COMMAND_ACTOR } from "@/lib/context";
import { resolveEvent } from "@/lib/dashboard";
import { findPatients, type PatientFilter } from "@/lib/patient-query";
import {
  ageGroupLabel,
  categoryLabel,
  dispositionLabel,
  patientTypeLabel,
  sexLabel,
} from "@/lib/constants";
import { toCsv } from "@/lib/summary";
import { formatDateTime, toLocalDateInput } from "@/lib/time";

export async function GET(req: NextRequest) {
  const filter = Object.fromEntries(req.nextUrl.searchParams) as PatientFilter;
  const event = await resolveEvent(filter.event);
  if (!event) return NextResponse.json({ error: "no event" }, { status: 404 });

  const patients = await findPatients(event.id, filter);
  const rows: unknown[][] = [
    ["到站時間", "站點", "身分", "階級", "姓名", "性別", "年齡", "年齡層", "傷病類別", "主訴", "處置", "去向", "後送醫院", "救護車", "離站時間", "備註"],
    ...patients.map((p) => [
      formatDateTime(p.arrivedAt),
      p.station.name,
      patientTypeLabel(p.patientType),
      p.rank ?? "",
      p.name ?? "",
      sexLabel(p.sex),
      p.age ?? "",
      ageGroupLabel(p.ageGroup),
      categoryLabel(p.category),
      p.complaint,
      p.treatment,
      dispositionLabel(p.disposition),
      p.hospital,
      p.ambulance,
      p.departedAt ? formatDateTime(p.departedAt) : "",
      p.note,
    ]),
  ];

  await audit(COMMAND_ACTOR, "匯出傷患紀錄", "Event", event.id, { filter, count: patients.length });

  const filename = encodeURIComponent(`傷患紀錄_${event.name}_${toLocalDateInput(new Date())}.csv`);
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="patients.csv"; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
