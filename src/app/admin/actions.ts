"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
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

const newToken = () => randomBytes(18).toString("base64url");

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return parsed.state;
  const hasActive = await db.event.count({ where: { isActive: true } });
  const event = await db.event.create({ data: { ...parsed.data, isActive: hasActive === 0 } });
  await audit(session, "建立場次", "Event", event.id, parsed.data);
  redirect(`/admin?event=${event.id}`);
}

export async function updateEvent(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return parsed.state;
  await db.event.update({ where: { id: eventId }, data: parsed.data });
  await audit(session, "修改場次", "Event", eventId, parsed.data);
  revalidatePath("/admin");
  return { ok: true, message: "已儲存" };
}

export async function activateEvent(eventId: string) {
  const session = await requireRole("ADMIN");
  await db.$transaction([
    db.event.updateMany({ data: { isActive: false } }),
    db.event.update({ where: { id: eventId }, data: { isActive: true } }),
  ]);
  await audit(session, "啟用場次", "Event", eventId);
  revalidatePath("/admin");
}

export async function createStation(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(stationSchema, formData);
  if (!parsed.success) return parsed.state;
  const station = await db.station.create({
    data: {
      ...parsed.data,
      eventId,
      joinToken: newToken(),
      supplies: { create: DEFAULT_SUPPLIES.map((s) => ({ ...s })) },
    },
  });
  await audit(session, "新增救護站", "Station", station.id, parsed.data);
  revalidatePath("/admin");
  return { ok: true, message: `已新增「${station.name}」，並建立預設物資品項` };
}

export async function updateStation(stationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(stationSchema, formData);
  if (!parsed.success) return parsed.state;
  await db.station.update({
    where: { id: stationId },
    data: { ...parsed.data, lat: parsed.data.lat ?? null, lng: parsed.data.lng ?? null },
  });
  await audit(session, "修改救護站", "Station", stationId, parsed.data);
  revalidatePath(`/admin/stations/${stationId}`);
  return { ok: true, message: "已儲存" };
}

/** 重新產生 QR 代碼：舊 QR Code 失效，已用舊代碼登入的裝置也會被登出 */
export async function regenerateToken(stationId: string) {
  const session = await requireRole("ADMIN");
  await db.station.update({ where: { id: stationId }, data: { joinToken: newToken() } });
  await audit(session, "重新產生 QR Code", "Station", stationId);
  revalidatePath(`/admin/stations/${stationId}`);
}

export async function deleteStation(stationId: string) {
  const session = await requireRole("ADMIN");
  const station = await db.station.findUnique({ where: { id: stationId }, include: { _count: { select: { patients: true } } } });
  if (!station) return;
  // 已有傷患紀錄的站不可刪除（畫面上也不會顯示刪除按鈕），應改為「已撤站」
  if (station._count.patients > 0) return;
  await db.station.delete({ where: { id: stationId } });
  await audit(session, "刪除救護站", "Station", stationId, { name: station.name });
  redirect(`/admin?event=${station.eventId}`);
}

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(userCreateSchema, formData);
  if (!parsed.success) return parsed.state;
  const { password, ...rest } = parsed.data;
  if (await db.user.findUnique({ where: { username: rest.username } })) {
    return { error: "帳號已存在", fieldErrors: { username: "帳號已存在" } };
  }
  const user = await db.user.create({ data: { ...rest, passwordHash: await bcrypt.hash(password, 10) } });
  await audit(session, "建立帳號", "User", user.id, rest);
  revalidatePath("/admin/users");
  return { ok: true, message: `已建立帳號 ${user.username}` };
}

export async function toggleUser(userId: string) {
  const session = await requireRole("ADMIN");
  if (userId === session.uid) return; // 不能停用自己
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await db.user.update({ where: { id: userId }, data: { active: !user.active } });
  await audit(session, user.active ? "停用帳號" : "啟用帳號", "User", userId, { username: user.username });
  revalidatePath("/admin/users");
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = parseForm(passwordResetSchema, formData);
  if (!parsed.success) return parsed.state;
  await db.user.update({ where: { id: parsed.data.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) } });
  await audit(session, "重設密碼", "User", parsed.data.id);
  return { ok: true, message: "密碼已重設" };
}
