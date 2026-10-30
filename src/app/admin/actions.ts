"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as repo from "@/lib/repo";
import { audit } from "@/lib/audit";
import { commandActor, currentUser } from "@/lib/context";
import { forgetAllowed, ownerEmails } from "@/lib/access";
import { DEFAULT_SUPPLIES, memberRoleLabel } from "@/lib/constants";
import {
  allowedUserSchema,
  eventSchema,
  approveRequestSchema,
  memberRolesSchema,
  parseForm,
  stationSchema,
  type ActionState,
} from "@/lib/validation";

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return parsed.state;
  const id = await repo.createEvent(parsed.data);
  await audit(await commandActor(), "建立場次", "Event", id, parsed.data);
  redirect(`/admin?event=${id}`);
}

export async function updateEvent(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return parsed.state;
  await repo.updateEvent(eventId, parsed.data);
  await audit(await commandActor(), "修改場次", "Event", eventId, parsed.data);
  revalidatePath("/admin");
  return { ok: true, message: "已儲存" };
}

export async function activateEvent(eventId: string) {
  await repo.activateEvent(eventId);
  await audit(await commandActor(), "啟用場次", "Event", eventId);
  revalidatePath("/admin");
}

export async function createStation(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(stationSchema, formData);
  if (!parsed.success) return parsed.state;
  const { lat, lng, ...rest } = parsed.data;
  const id = await repo.createStation({ ...rest, lat: lat ?? null, lng: lng ?? null, eventId }, DEFAULT_SUPPLIES);
  await audit(await commandActor(), "新增救護站", "Station", id, parsed.data);
  revalidatePath("/admin");
  return { ok: true, message: `已新增「${rest.name}」，並建立預設物資品項` };
}

export async function updateStation(stationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(stationSchema, formData);
  if (!parsed.success) return parsed.state;
  await repo.updateStation(stationId, { ...parsed.data, lat: parsed.data.lat ?? null, lng: parsed.data.lng ?? null });
  await audit(await commandActor(), "修改救護站", "Station", stationId, parsed.data);
  revalidatePath(`/admin/stations/${stationId}`);
  return { ok: true, message: "已儲存" };
}

export async function moveStation(stationId: string, direction: "up" | "down") {
  await repo.moveStation(stationId, direction);
  await audit(await commandActor(), direction === "up" ? "救護站上移" : "救護站下移", "Station", stationId);
  revalidatePath("/admin");
}

export async function deleteStation(stationId: string) {
  const station = await repo.getStation(stationId);
  if (!station) return;
  // 已有傷患紀錄的站不可刪除（畫面上也不會顯示刪除按鈕），應改為「已撤站」
  if ((await repo.countPatients(stationId)) > 0) return;
  await repo.deleteStation(stationId);
  await audit(await commandActor(), "刪除救護站", "Station", stationId, { name: station.name });
  redirect(`/admin?event=${station.eventId}`);
}

export async function addAllowedUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(allowedUserSchema, formData);
  if (!parsed.success) return parsed.state;
  await repo.addAllowedUser(parsed.data.email, parsed.data.note, parsed.data.roles);
  forgetAllowed(parsed.data.email);
  await audit(await commandActor(), "加入登入名單", "AllowedUser", parsed.data.email, parsed.data);
  revalidatePath("/admin/users");
  return { ok: true, message: `已加入 ${parsed.data.email}（${parsed.data.roles.map(memberRoleLabel).join("、")}）` };
}

export async function removeAllowedUser(email: string) {
  // 系統擁有者與自己不能移除，避免把自己鎖在外面
  if (ownerEmails().includes(repo.emailId(email)) || repo.emailId(email) === (await currentUser()).email) return;
  await repo.removeAllowedUser(email);
  forgetAllowed(email);
  await audit(await commandActor(), "移出登入名單", "AllowedUser", email);
  revalidatePath("/admin/users");
}

export async function setMemberRoles(email: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  // 不能改擁有者與自己的角色，避免把自己鎖在系統管理外面
  if (ownerEmails().includes(repo.emailId(email)) || repo.emailId(email) === (await currentUser()).email) {
    return { error: "不能變更自己或擁有者的角色" };
  }
  const parsed = parseForm(memberRolesSchema, formData);
  if (!parsed.success) return { error: parsed.state.fieldErrors?.roles ?? "請至少勾選一個角色" };
  await repo.setAllowedUserRoles(email, parsed.data);
  forgetAllowed(email);
  await audit(await commandActor(), "變更成員角色", "AllowedUser", email, { roles: parsed.data });
  revalidatePath("/admin/users");
  return { ok: true, message: "已儲存" };
}

/** 核准帳號申請：加入登入名單（備註填入單位、級職、姓名） */
export async function approveAccountRequest(email: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const request = await repo.getAccountRequest(email);
  if (!request || request.status !== "PENDING") return { error: "找不到這筆申請" };
  const parsed = parseForm(approveRequestSchema, formData);
  if (!parsed.success) return { error: parsed.state.fieldErrors?.roles ?? "請至少勾選一個角色" };
  const reviewer = await currentUser();
  await repo.addAllowedUser(request.email, `${request.unit} ${request.rank} ${request.name}`, parsed.data);
  await repo.reviewAccountRequest(request.email, "APPROVED", reviewer.email);
  forgetAllowed(request.email);
  await audit(await commandActor(), "核准帳號申請", "AccountRequest", request.email, { ...request, roles: parsed.data });
  revalidatePath("/admin/users");
  return { ok: true, message: "已核准" };
}

export async function rejectAccountRequest(email: string) {
  const request = await repo.getAccountRequest(email);
  if (!request || request.status !== "PENDING") return;
  await repo.reviewAccountRequest(request.email, "REJECTED", (await currentUser()).email);
  await audit(await commandActor(), "拒絕帳號申請", "AccountRequest", request.email, request);
  revalidatePath("/admin/users");
}

/** 清除場次的測試資料（需輸入「清除」確認） */
export async function resetEventData(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (String(formData.get("confirm") ?? "").trim() !== "清除") {
    return { error: "請在欄位中輸入「清除」兩個字才會執行" };
  }
  const event = await repo.getEvent(eventId);
  if (!event) return { error: "找不到這個場次" };
  const result = await repo.resetEventData(eventId);
  await audit(await commandActor(), "清除測試資料", "Event", eventId, { event: event.name, ...result });
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: `已清除：傷患紀錄 ${result.patients} 筆、支援申請 ${result.requests} 筆、輪椅借用 ${result.loans} 筆，${result.stations} 個救護站的物資與狀態已恢復預設`,
  };
}
