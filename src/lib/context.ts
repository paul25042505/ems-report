import "server-only";
import { notFound } from "next/navigation";
import { getEvent, getStation } from "./repo";

/** 操作者（寫入操作紀錄用）。系統不需登入，以所在頁面區分身分。 */
export type Actor = { name: string; role: "STATION" | "COMMAND" };

export const COMMAND_ACTOR: Actor = { name: "指揮中心", role: "COMMAND" };

/** 取得網址中的救護站與所屬場次，不存在時顯示 404 */
export async function getStationContext(stationId: string) {
  const station = await getStation(stationId);
  const event = station && (await getEvent(station.eventId));
  if (!station || !event) notFound();
  const actor: Actor = { name: station.name, role: "STATION" };
  return { station: { ...station, event }, actor };
}
