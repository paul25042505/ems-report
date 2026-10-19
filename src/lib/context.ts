import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getEvent, getStation } from "./repo";

/** 操作者（寫入操作紀錄用） */
export type Actor = { name: string; role: "STATION" | "COMMAND" };

/** 目前登入的 Google 帳號（由 middleware 驗證後放進請求標頭） */
export async function currentUser() {
  const h = await headers();
  const email = h.get("x-user-email") ?? "";
  const name = decodeURIComponent(h.get("x-user-name") ?? "") || email;
  const role = h.get("x-user-role") === "COMMAND" ? "COMMAND" : "STATION";
  return { email, name, role } as const;
}

async function who(where: string) {
  const user = await currentUser();
  return user.email ? `${where}／${user.name}（${user.email}）` : where;
}

export async function commandActor(): Promise<Actor> {
  return { name: await who("指揮中心"), role: "COMMAND" };
}

/** 取得網址中的救護站與所屬場次，不存在時顯示 404 */
export async function getStationContext(stationId: string) {
  const station = await getStation(stationId);
  const event = station && (await getEvent(station.eventId));
  if (!station || !event) notFound();
  const actor: Actor = { name: await who(station.name), role: "STATION" };
  return { station: { ...station, event }, actor };
}
