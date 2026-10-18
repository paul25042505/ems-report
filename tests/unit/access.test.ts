import { describe, expect, it } from "vitest";
import { canAccess, homePathFor, requiredRoles } from "@/lib/access";

describe("路由權限", () => {
  it("公開頁面不需登入", () => {
    expect(requiredRoles("/login")).toBeNull();
    expect(requiredRoles("/join/abc")).toBeNull();
    expect(canAccess(undefined, "/login")).toBe(true);
  });

  it("各角色只能進入自己的區域", () => {
    expect(canAccess("REPORTER", "/station/patients/new")).toBe(true);
    expect(canAccess("REPORTER", "/command")).toBe(false);
    expect(canAccess("REPORTER", "/api/export/patients")).toBe(false);
    expect(canAccess("COMMAND", "/command/summary")).toBe(true);
    expect(canAccess("COMMAND", "/admin")).toBe(false);
    expect(canAccess("COMMAND", "/station")).toBe(false);
    expect(canAccess("ADMIN", "/admin/users")).toBe(true);
    expect(canAccess("ADMIN", "/command")).toBe(true);
    expect(canAccess(undefined, "/command")).toBe(false);
  });

  it("前綴比對不會誤判相似路徑", () => {
    expect(requiredRoles("/stationery")).toBeNull();
    expect(requiredRoles("/administrator")).toBeNull();
  });

  it("登入後導向", () => {
    expect(homePathFor("REPORTER")).toBe("/station");
    expect(homePathFor("COMMAND")).toBe("/command");
    expect(homePathFor("ADMIN")).toBe("/command");
  });
});
