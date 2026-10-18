import { describe, expect, it } from "vitest";
import { computeAlerts, csvCell, hourlyCounts, toCsv, totals, type PatientLite } from "@/lib/summary";

const now = new Date("2026-10-18T06:00:00Z"); // 台北 14:00

function patient(over: Partial<PatientLite>): PatientLite {
  return {
    id: Math.random().toString(36),
    stationId: "s1",
    arrivedAt: new Date("2026-10-18T05:00:00Z"),
    category: "HEAT",
    disposition: "RELEASED",
    patientType: "PUBLIC",
    ageGroup: "ADULT",
    sex: "M",
    hospital: "",
    departedAt: null,
    ...over,
  };
}

const stations = [
  { id: "s1", name: "主站", status: "OPEN", lastReportAt: new Date("2026-10-18T05:50:00Z") },
  { id: "s2", name: "分站A", status: "OPEN", lastReportAt: new Date("2026-10-18T04:00:00Z") },
  { id: "s3", name: "分站B", status: "CLOSED", lastReportAt: null },
];

describe("統計", () => {
  it("totals 分類計數", () => {
    const t = totals([
      patient({ disposition: "OBSERVING" }),
      patient({ disposition: "TRANSFERRED" }),
      patient({ disposition: "RELEASED" }),
      patient({ disposition: "REFUSED" }),
    ]);
    expect(t).toEqual({ total: 4, observing: 1, transferred: 1, released: 1, refused: 1 });
  });

  it("每小時統計補上空白時段", () => {
    const h = hourlyCounts([
      patient({ arrivedAt: new Date("2026-10-18T01:10:00Z") }), // 09時
      patient({ arrivedAt: new Date("2026-10-18T01:50:00Z") }), // 09時
      patient({ arrivedAt: new Date("2026-10-18T03:05:00Z") }), // 11時
    ]);
    expect(h.map((x) => [x.label, x.count])).toEqual([
      ["09時", 2],
      ["10時", 0],
      ["11時", 1],
    ]);
    expect(hourlyCounts([])).toEqual([]);
  });
});

describe("告警", () => {
  it("產生各類告警且危急排在前面", () => {
    const alerts = computeAlerts(
      {
        stations,
        patients: [
          patient({ disposition: "OBSERVING", category: "HEAT" }),
          patient({ disposition: "TRANSFERRED", hospital: "台大醫院", departedAt: new Date("2026-10-18T05:45:00Z") }),
          patient({ disposition: "TRANSFERRED", hospital: "舊後送", departedAt: new Date("2026-10-18T03:00:00Z") }),
        ],
        supplies: [
          { stationId: "s1", name: "冰敷袋", unit: "個", quantity: 3, threshold: 10 },
          { stationId: "s1", name: "紗布", unit: "包", quantity: 30, threshold: 10 },
          { stationId: "s3", name: "飲用水", unit: "箱", quantity: 0, threshold: 3 },
        ],
        requests: [
          { id: "r1", stationId: "s2", type: "AMBULANCE", content: "需救護車", urgent: false, status: "PENDING", createdAt: now },
          { id: "r2", stationId: "s2", type: "SUPPLY", content: "水", urgent: false, status: "PENDING", createdAt: now },
          { id: "r3", stationId: "s2", type: "STAFF", content: "人力", urgent: true, status: "DONE", createdAt: now },
        ],
      },
      now,
    );
    const messages = alerts.map((a) => a.message);
    expect(alerts[0].level).toBe("danger");
    expect(alerts.filter((a) => a.level === "danger")).toHaveLength(1);
    expect(messages).toContain("分站A：緊急申請「救護車」待處理 — 需救護車");
    expect(messages.some((m) => m.includes("後送 台大醫院"))).toBe(true);
    expect(messages.some((m) => m.includes("舊後送"))).toBe(false); // 超過 30 分鐘
    expect(messages.some((m) => m.includes("冰敷袋 剩 3個"))).toBe(true);
    expect(messages.some((m) => m.includes("紗布"))).toBe(false);
    expect(messages.some((m) => m.includes("飲用水"))).toBe(false); // 已撤站不告警
    expect(messages.some((m) => m.startsWith("分站A：超過 60 分鐘未回報"))).toBe(true);
    expect(messages.some((m) => m.startsWith("主站：超過"))).toBe(false);
    expect(messages.some((m) => m.includes("分站B：超過"))).toBe(false);
    expect(messages.some((m) => m.includes("「物資補給」"))).toBe(false); // 一般申請不列入告警
  });
});

describe("CSV", () => {
  it("跳脫逗號、引號、換行並防止公式注入", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });

  it("加上 BOM 與 CRLF", () => {
    expect(toCsv([["a", "b"], [1, 2]])).toBe("﻿a,b\r\n1,2\r\n");
  });
});
