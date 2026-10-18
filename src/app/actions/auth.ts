"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createSession, destroySession } from "@/lib/auth";
import { homePathFor } from "@/lib/access";
import type { Role } from "@/lib/constants";
import { clearFailures, isLimited, recordFailure } from "@/lib/rate-limit";
import { joinSchema, loginSchema, parseForm, type ActionState } from "@/lib/validation";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.success) return parsed.state;
  const { username, password } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${username.toLowerCase()}`;
  if (isLimited(key)) return { error: "登入失敗次數過多，請 10 分鐘後再試" };

  const user = await db.user.findUnique({ where: { username } });
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) {
    recordFailure(key);
    return { error: "帳號或密碼錯誤" };
  }
  clearFailures(key);

  const role = user.role as Role;
  await createSession({ role, name: user.displayName, uid: user.id });
  await audit({ name: user.displayName, role }, "登入", "User", user.id);
  redirect(homePathFor(role));
}

export async function joinStation(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(joinSchema, formData);
  if (!parsed.success) return parsed.state;

  const station = await db.station.findUnique({ where: { joinToken: token } });
  if (!station) return { error: "此 QR Code 已失效，請向指揮中心索取新的 QR Code" };

  const name = parsed.data.reporterName;
  await createSession({ role: "REPORTER", name, stationId: station.id, joinToken: token });
  await audit({ name, role: "REPORTER" }, "站點登入", "Station", station.id, { station: station.name });
  redirect("/station");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
