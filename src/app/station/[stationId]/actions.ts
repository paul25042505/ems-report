"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as repo from "@/lib/repo";
import { wheelchairStatus } from "@/lib/summary";
import { audit } from "@/lib/audit";
import { getStationContext } from "@/lib/context";
import {
  parseForm,
  patientSchema,
  requestSchema,
  stationStatusSchema,
  supplyCreateSchema,
  supplyQuantitySchema,
  loanSchema,
  type ActionState,
} from "@/lib/validation";

/** 任何站點操作都視為一次回報，更新最後回報時間 */
const touch = repo.touchStation;

export async function savePatient(
  stationId: string,
  patientId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { actor, station } = await getStationContext(stationId);
  const parsed = parseForm(patientSchema, formData);
  if (!parsed.success) return parsed.state;
  const v = parsed.data;

  const existing = patientId ? await repo.getPatient(patientId) : null;
  if (patientId && (!existing || existing.stationId !== station.id)) return { error: "找不到這筆紀錄" };

  const data = {
    ...v,
    hospital: v.disposition === "TRANSFERRED" ? v.hospital : "",
    ambulance: v.disposition === "TRANSFERRED" ? v.ambulance : "",
    // 留觀中沒有離站時間；離站但沒填時間就以現在記錄
    departedAt: v.disposition === "OBSERVING" ? null : (v.departedAt ?? existing?.departedAt ?? new Date()),
  };

  if (existing) {
    await repo.updatePatient(existing.id, data);
    await audit(actor, "修改傷患紀錄", "Patient", existing.id, data);
  } else {
    const id = await repo.createPatient({ ...data, eventId: station.eventId, stationId: station.id, reporterName: station.name });
    await audit(actor, "新增傷患紀錄", "Patient", id, data);
  }
  await touch(station.id);
  redirect(`/station/${station.id}?saved=${existing ? "updated" : "created"}`);
}

/** 刪除傷患紀錄；刪除前的完整內容寫入操作紀錄，誤刪時可查回 */
export async function deletePatient(stationId: string, patientId: string) {
  const { actor, station } = await getStationContext(stationId);
  const existing = await repo.getPatient(patientId);
  if (!existing || existing.stationId !== station.id) return;
  await repo.deletePatient(patientId);
  await audit(actor, "刪除傷患紀錄", "Patient", patientId, existing);
  await touch(station.id);
  redirect(`/station/${station.id}?saved=deleted`);
}

export async function setStationStatus(stationId: string, formData: FormData) {
  const { actor, station } = await getStationContext(stationId);
  const parsed = parseForm(stationStatusSchema, formData);
  if (!parsed.success) return;
  await repo.updateStation(station.id, { status: parsed.data.status, lastReportAt: new Date() });
  await audit(actor, "變更站點狀態", "Station", station.id, parsed.data);
  revalidatePath(`/station/${station.id}`);
}

export async function heartbeat(stationId: string) {
  const { actor, station } = await getStationContext(stationId);
  await touch(station.id);
  await audit(actor, "回報平安", "Station", station.id);
  revalidatePath(`/station/${station.id}`);
}

export async function updateSupplyQuantity(stationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { actor, station } = await getStationContext(stationId);
  const parsed = parseForm(supplyQuantitySchema, formData);
  if (!parsed.success) return parsed.state;
  const supply = await repo.getSupply(parsed.data.id);
  if (!supply || supply.stationId !== station.id) return { error: "找不到此品項" };
  await repo.updateSupply(supply.id, { quantity: parsed.data.quantity });
  await audit(actor, "更新物資", "Supply", supply.id, { name: supply.name, from: supply.quantity, to: parsed.data.quantity });
  await touch(station.id);
  revalidatePath(`/station/${station.id}/supplies`);
  return { ok: true, message: "已儲存" };
}

export async function addSupply(stationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { actor, station } = await getStationContext(stationId);
  const parsed = parseForm(supplyCreateSchema, formData);
  if (!parsed.success) return parsed.state;
  const existing = await repo.listSuppliesByStation(station.id);
  if (existing.some((s) => s.name === parsed.data.name)) return { error: "已有同名品項", fieldErrors: { name: "已有同名品項" } };
  const id = await repo.createSupply({ ...parsed.data, eventId: station.eventId, stationId: station.id });
  await audit(actor, "新增物資品項", "Supply", id, parsed.data);
  await touch(station.id);
  revalidatePath(`/station/${station.id}/supplies`);
  return { ok: true, message: `已新增「${parsed.data.name}」` };
}

export async function createRequest(stationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { actor, station } = await getStationContext(stationId);
  const parsed = parseForm(requestSchema, formData);
  if (!parsed.success) return parsed.state;
  const id = await repo.createRequest({ ...parsed.data, eventId: station.eventId, stationId: station.id, reporterName: station.name });
  await audit(actor, "提出支援申請", "SupportRequest", id, parsed.data);
  await touch(station.id);
  revalidatePath(`/station/${station.id}/requests`);
  return { ok: true, message: "已送出，指揮中心會盡快處理" };
}

export async function borrowWheelchair(stationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { actor, station } = await getStationContext(stationId);
  if (!station.wheelchairs) return { error: "此站沒有配置輪椅" };
  const parsed = parseForm(loanSchema, formData);
  if (!parsed.success) return parsed.state;
  const [stations, loans] = await Promise.all([repo.listStations(station.eventId), repo.listLoansByEvent(station.eventId)]);
  if ((wheelchairStatus(stations, loans).get(station.id)?.available ?? 0) <= 0) {
    return { error: "本站目前沒有可借的輪椅" };
  }
  const id = await repo.createLoan({ ...parsed.data, eventId: station.eventId, equipment: "WHEELCHAIR", stationId: station.id });
  await audit(actor, "借出輪椅", "EquipmentLoan", id, parsed.data);
  await touch(station.id);
  revalidatePath(`/station/${station.id}`);
  return { ok: true, message: parsed.data.borrowerName ? `已借出輪椅給 ${parsed.data.borrowerName}` : "已借出輪椅" };
}

/** 歸還輪椅：任何有配置輪椅的站都可以收 */
export async function returnWheelchair(stationId: string, loanId: string) {
  const { actor, station } = await getStationContext(stationId);
  if (!station.wheelchairs) return;
  const loan = await repo.getLoan(loanId);
  if (!loan || loan.returnedAt || loan.eventId !== station.eventId) return;
  await repo.returnLoan(loanId, station.id);
  await audit(actor, "歸還輪椅", "EquipmentLoan", loanId, { borrowerName: loan.borrowerName, borrowedAt: loan.borrowedAt });
  await touch(station.id);
  revalidatePath(`/station/${station.id}`);
}
