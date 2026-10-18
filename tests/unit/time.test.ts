import { describe, expect, it } from "vitest";
import { formatAgo, hourKey, parseLocalInput, startOfLocalDay, toLocalInput } from "@/lib/time";

describe("台北時間處理", () => {
  it("datetime-local 輸入視為台北時間", () => {
    expect(parseLocalInput("2026-10-18T09:30")?.toISOString()).toBe("2026-10-18T01:30:00.000Z");
    expect(parseLocalInput("2026-10-18")?.toISOString()).toBe("2026-10-17T16:00:00.000Z");
  });

  it("格式錯誤回傳 null", () => {
    expect(parseLocalInput("")).toBeNull();
    expect(parseLocalInput("2026/10/18 09:30")).toBeNull();
    expect(parseLocalInput("abc")).toBeNull();
  });

  it("輸出與解析互為反函式", () => {
    const d = new Date("2026-10-18T15:45:00Z");
    expect(toLocalInput(d)).toBe("2026-10-18T23:45");
    expect(parseLocalInput(toLocalInput(d))?.getTime()).toBe(d.getTime());
  });

  it("時段與當日起點以台北時間計算（跨 UTC 日界）", () => {
    const d = new Date("2026-10-17T17:10:00Z"); // 台北 10/18 01:10
    expect(hourKey(d)).toBe("2026-10-18 01");
    expect(startOfLocalDay(d).toISOString()).toBe("2026-10-17T16:00:00.000Z");
  });

  it("相對時間", () => {
    const now = new Date("2026-10-18T10:00:00Z");
    expect(formatAgo(null, now)).toBe("尚未回報");
    expect(formatAgo(new Date("2026-10-18T09:59:40Z"), now)).toBe("剛剛");
    expect(formatAgo(new Date("2026-10-18T09:45:00Z"), now)).toBe("15 分鐘前");
    expect(formatAgo(new Date("2026-10-18T08:30:00Z"), now)).toBe("1 小時 30 分前");
  });
});
