import bcrypt from "bcryptjs";
import { createUser, hasAnyUser } from "./repo";

/**
 * 資料庫還沒有任何帳號時，依 ADMIN_USERNAME / ADMIN_PASSWORD 建立初始管理員。
 * 第一次登入時自動執行，部署後不需要另外跑初始化指令。
 */
export async function ensureInitialAdmin() {
  if (await hasAnyUser()) return false;
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password === "change-me" || password.length < 8) return false;
  return createUser({
    username,
    displayName: "系統管理員",
    role: "ADMIN",
    passwordHash: await bcrypt.hash(password, 10),
  });
}
