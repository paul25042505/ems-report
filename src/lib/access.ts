import type { Role } from "./constants";

/** 每個路徑前綴允許的角色；未列出的路徑為公開頁面 */
const RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/station", roles: ["REPORTER"] },
  { prefix: "/command", roles: ["COMMAND", "ADMIN"] },
  { prefix: "/api/export", roles: ["COMMAND", "ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

export function requiredRoles(pathname: string): Role[] | null {
  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return rule ? rule.roles : null;
}

export function canAccess(role: Role | undefined, pathname: string) {
  const roles = requiredRoles(pathname);
  if (!roles) return true;
  return role !== undefined && roles.includes(role);
}

export function homePathFor(role: Role) {
  return role === "REPORTER" ? "/station" : "/command";
}
