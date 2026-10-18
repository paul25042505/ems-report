"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as repo from "@/lib/repo";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { DEFAULT_SUPPLIES } from "@/lib/constants";
import {
  eventSchema,
  parseForm,
  passwordResetSchema,
  stationSchema,
  userCreateSchema,
  type ActionState,
} from "@/lib/validation";

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return parsed.state;
  const id = await repo.createEvent(parsed.data);
  await audit(session, "建立場次", "Event", id, parsed.data);
  redirect(`/admin?event=${id}`);
}

export async function updateEvent(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return parsed.state;
  await repo.updateEvent(eventId, parsed.data);
  await audit(session, "修改場次", "Event", eventId, parsed.data);
  revalidatePath("/admin");
  return { ok: true, message: "已儲存" };
}

export async function activateEvent(eventId: string) {
  const session = await requireRole("ADMIN");
  await repo.activateEvent(eventId);
  await audit(session, "啟用場次", "Event", eventId);
  revalidatePath("/admin");
}

export async function createStation(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(stationSchema, formData);
  if (!parsed.success) return parsed.state;
  const { lat, lng, ...rest } = parsed.data;
  const id = await repo.createStation({ ...rest, lat: lat ?? null, lng: lng ?? null, eventId }, DEFAULT_SUPPLIES);
  await audit(session, "新增救護站", "Station", id, parsed.data);
  revalidatePath("/admin");
  return { ok: true, message: `已新增「${rest.name}」，並建立預設物資品項` };
}

export async function updateStation(stationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(stationSchema, formData);
  if (!parsed.success) return parsed.state;
  await repo.updateStation(stationId, { ...parsed.data, lat: parsed.data.lat ?? null, lng: parsed.data.lng ?? null });
  await audit(session, "修改救護站", "Station", stationId, parsed.data);
  revalidatePath(`/admin/stations/${stationId}`);
  return { ok: true, message: "已儲存" };
}

/** 重新產生 QR 代碼：舊 QR Code 失效，已用舊代碼登入的裝置也會被登出 */
export async function regenerateToken(stationId: string) {
  const session = await requireRole("ADMIN");
  await repo.updateStation(stationId, { joinToken: repo.newToken() });
  await audit(session, "重新產生 QR Code", "Station", stationId);
  revalidatePath(`/admin/stations/${stationId}`);
}

export async function deleteStation(stationId: string) {
  const session = await requireRole("ADMIN");
  const station = await repo.getStation(stationId);
  if (!station) return;
  // 已有傷患紀錄的站不可刪除（畫面上也不會顯示刪除按鈕），應改為「已撤站」
  if ((await repo.countPatients(stationId)) > 0) return;
  await repo.deleteStation(stationId);
  await audit(session, "刪除救護站", "Station", stationId, { name: station.name });
  redirect(`/admin?event=${station.eventId}`);
}

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(userCreateSchema, formData);
  if (!parsed.success) return parsed.state;
  const { password, ...rest } = parsed.data;
  const created = await repo.createUser({ ...rest, passwordHash: await bcrypt.hash(password, 10) });
  if (!created) return { error: "帳號已存在", fieldErrors: { username: "帳號已存在" } };
  const id = repo.userIdOf(rest.username);
  await audit(session, "建立帳號", "User", id, rest);
  revalidatePath("/admin/users");
  return { ok: true, message: `已建立帳號 ${id}` };
}

export async function toggleUser(userId: string) {
  const session = await requireRole("ADMIN");
  if (repo.userIdOf(userId) === repo.userIdOf(session.uid ?? "")) return; // 不能停用自己
  const user = await repo.getUser(userId);
  if (!user) return;
  await repo.updateUser(user.id, { active: !user.active });
  await audit(session, user.active ? "停用帳號" : "啟用帳號", "User", userId, { username: user.username });
  revalidatePath("/admin/users");
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(passwordResetSchema, formData);
  if (!parsed.success) return parsed.state;
  if (!(await repo.getUser(parsed.data.id))) return { error: "找不到此帳號" };
  await repo.updateUser(parsed.data.id, { passwordHash: await bcrypt.hash(parsed.data.password, 10) });
  await audit(session, "重設密碼", "User", parsed.data.id);
  return { ok: true, message: "密碼已重設" };
}
