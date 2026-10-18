"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireReporter } from "@/lib/auth";
import {
  parseForm,
  patientSchema,
  requestSchema,
  stationStatusSchema,
  supplyCreateSchema,
  supplyQuantitySchema,
  type ActionState,
} from "@/lib/validation";

/** 任何站點操作都視為一次回報，更新最後回報時間 */
async function touch(stationId: string) {
  await db.station.update({ where: { id: stationId }, data: { lastReportAt: new Date() } });
}

export async function savePatient(patientId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session, station } = await requireReporter();
  const parsed = parseForm(patientSchema, formData);
  if (!parsed.success) return parsed.state;
  const v = parsed.data;

  const existing = patientId ? await db.patient.findUnique({ where: { id: patientId } }) : null;
  if (patientId && (!existing || existing.stationId !== station.id)) return { error: "找不到這筆紀錄" };

  const data = {
    ...v,
    hospital: v.disposition === "TRANSFERRED" ? v.hospital : "",
    ambulance: v.disposition === "TRANSFERRED" ? v.ambulance : "",
    // 留觀中沒有離站時間；離站但沒填時間就以現在記錄
    departedAt: v.disposition === "OBSERVING" ? null : (v.departedAt ?? existing?.departedAt ?? new Date()),
  };

  if (existing) {
    await db.patient.update({ where: { id: existing.id }, data });
    await audit(session, "修改傷患紀錄", "Patient", existing.id, data);
  } else {
    const created = await db.patient.create({ data: { ...data, stationId: station.id, reporterName: session.name } });
    await audit(session, "新增傷患紀錄", "Patient", created.id, data);
  }
  await touch(station.id);
  redirect(`/station?saved=${existing ? "updated" : "created"}`);
}

export async function setStationStatus(formData: FormData) {
  const { session, station } = await requireReporter();
  const parsed = parseForm(stationStatusSchema, formData);
  if (!parsed.success) return;
  await db.station.update({ where: { id: station.id }, data: { status: parsed.data.status, lastReportAt: new Date() } });
  await audit(session, "變更站點狀態", "Station", station.id, parsed.data);
  revalidatePath("/station");
}

export async function heartbeat() {
  const { session, station } = await requireReporter();
  await touch(station.id);
  await audit(session, "回報平安", "Station", station.id);
  revalidatePath("/station");
}

export async function updateSupplyQuantity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session, station } = await requireReporter();
  const parsed = parseForm(supplyQuantitySchema, formData);
  if (!parsed.success) return parsed.state;
  const supply = await db.supply.findUnique({ where: { id: parsed.data.id } });
  if (!supply || supply.stationId !== station.id) return { error: "找不到此品項" };
  await db.supply.update({ where: { id: supply.id }, data: { quantity: parsed.data.quantity } });
  await audit(session, "更新物資", "Supply", supply.id, { name: supply.name, from: supply.quantity, to: parsed.data.quantity });
  await touch(station.id);
  revalidatePath("/station/supplies");
  return { ok: true, message: "已儲存" };
}

export async function addSupply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session, station } = await requireReporter();
  const parsed = parseForm(supplyCreateSchema, formData);
  if (!parsed.success) return parsed.state;
  const dup = await db.supply.findUnique({ where: { stationId_name: { stationId: station.id, name: parsed.data.name } } });
  if (dup) return { error: "已有同名品項", fieldErrors: { name: "已有同名品項" } };
  const created = await db.supply.create({ data: { ...parsed.data, stationId: station.id } });
  await audit(session, "新增物資品項", "Supply", created.id, parsed.data);
  await touch(station.id);
  revalidatePath("/station/supplies");
  return { ok: true, message: `已新增「${created.name}」` };
}

export async function createRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session, station } = await requireReporter();
  const parsed = parseForm(requestSchema, formData);
  if (!parsed.success) return parsed.state;
  const created = await db.supportRequest.create({
    data: { ...parsed.data, stationId: station.id, reporterName: session.name },
  });
  await audit(session, "提出支援申請", "SupportRequest", created.id, parsed.data);
  await touch(station.id);
  revalidatePath("/station/requests");
  return { ok: true, message: "已送出，指揮中心會盡快處理" };
}
