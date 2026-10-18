"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as repo from "@/lib/repo";
import { audit } from "@/lib/audit";
import { COMMAND_ACTOR as actor } from "@/lib/context";
import { DEFAULT_SUPPLIES } from "@/lib/constants";
import {
  eventSchema,
  parseForm,
  stationSchema,
  type ActionState,
} from "@/lib/validation";

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return parsed.state;
  const id = await repo.createEvent(parsed.data);
  await audit(actor, "建立場次", "Event", id, parsed.data);
  redirect(`/admin?event=${id}`);
}

export async function updateEvent(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return parsed.state;
  await repo.updateEvent(eventId, parsed.data);
  await audit(actor, "修改場次", "Event", eventId, parsed.data);
  revalidatePath("/admin");
  return { ok: true, message: "已儲存" };
}

export async function activateEvent(eventId: string) {
  await repo.activateEvent(eventId);
  await audit(actor, "啟用場次", "Event", eventId);
  revalidatePath("/admin");
}

export async function createStation(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(stationSchema, formData);
  if (!parsed.success) return parsed.state;
  const { lat, lng, ...rest } = parsed.data;
  const id = await repo.createStation({ ...rest, lat: lat ?? null, lng: lng ?? null, eventId }, DEFAULT_SUPPLIES);
  await audit(actor, "新增救護站", "Station", id, parsed.data);
  revalidatePath("/admin");
  return { ok: true, message: `已新增「${rest.name}」，並建立預設物資品項` };
}

export async function updateStation(stationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(stationSchema, formData);
  if (!parsed.success) return parsed.state;
  await repo.updateStation(stationId, { ...parsed.data, lat: parsed.data.lat ?? null, lng: parsed.data.lng ?? null });
  await audit(actor, "修改救護站", "Station", stationId, parsed.data);
  revalidatePath(`/admin/stations/${stationId}`);
  return { ok: true, message: "已儲存" };
}

export async function deleteStation(stationId: string) {
  const station = await repo.getStation(stationId);
  if (!station) return;
  // 已有傷患紀錄的站不可刪除（畫面上也不會顯示刪除按鈕），應改為「已撤站」
  if ((await repo.countPatients(stationId)) > 0) return;
  await repo.deleteStation(stationId);
  await audit(actor, "刪除救護站", "Station", stationId, { name: station.name });
  redirect(`/admin?event=${station.eventId}`);
}
