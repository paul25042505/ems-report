import { describe, expect, it } from "vitest";
import { parseForm, patientSchema, requestSchema, stationSchema } from "@/lib/validation";

function fd(obj: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.append(k, v);
  return f;
}

const basePatient = {
  arrivedAt: "2026-10-18T10:00",
  patientType: "PUBLIC",
  sex: "F",
  ageGroup: "ADULT",
  category: "HEAT",
  disposition: "OBSERVING",
};

describe("傷患表單驗證", () => {
  it("必填欄位齊全即通過", () => {
    const r = parseForm(patientSchema, fd(basePatient));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.arrivedAt.toISOString()).toBe("2026-10-18T02:00:00.000Z");
      expect(r.data.departedAt).toBeNull();
    }
  });

  it("缺少選項時回報對應欄位", () => {
    const rest: Record<string, string> = { ...basePatient };
    delete rest.sex;
    delete rest.ageGroup;
    const r = parseForm(patientSchema, fd({ ...rest, age: "" })); // 表單沒填年齡時送出空字串
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.state.fieldErrors?.sex).toBeTruthy();
      expect(r.state.fieldErrors?.ageGroup).toBeTruthy();
    }
  });

  it("不合法的選項值被拒絕", () => {
    const r = parseForm(patientSchema, fd({ ...basePatient, category: "HACK", sex: "X" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.state.fieldErrors?.category).toBeTruthy();
      expect(r.state.fieldErrors?.sex).toBeTruthy();
    }
  });

  it("有填實際年齡時自動判斷年齡層，覆蓋快速選擇", () => {
    const r = parseForm(patientSchema, fd({ ...basePatient, name: "王小明", age: "70", ageGroup: "CHILD" }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("王小明");
      expect(r.data.age).toBe(70);
      expect(r.data.ageGroup).toBe("SENIOR");
    }
    const kid = parseForm(patientSchema, fd({ ...basePatient, age: "12" }));
    expect(kid.success && kid.data.ageGroup).toBe("CHILD");
  });

  it("沒填年齡時用快速選擇，姓名可留空", () => {
    const r = parseForm(patientSchema, fd(basePatient));
    expect(r.success && r.data.age).toBeNull();
    expect(r.success && r.data.ageGroup).toBe("ADULT");
    expect(r.success && r.data.name).toBe("");
  });

  it("年齡與年齡層都沒填、或年齡超出範圍時報錯", () => {
    const rest: Record<string, string> = { ...basePatient };
    delete rest.ageGroup;
    const none = parseForm(patientSchema, fd(rest));
    expect(!none.success && none.state.fieldErrors?.ageGroup).toBe("請輸入年齡或選擇年齡層");
    const bad = parseForm(patientSchema, fd({ ...basePatient, age: "150" }));
    expect(!bad.success && bad.state.fieldErrors?.age).toBeTruthy();
  });

  it("後送必須填醫院", () => {
    const r = parseForm(patientSchema, fd({ ...basePatient, disposition: "TRANSFERRED" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.state.fieldErrors?.hospital).toBe("後送請填寫醫院");
    expect(parseForm(patientSchema, fd({ ...basePatient, disposition: "TRANSFERRED", hospital: "台大醫院" })).success).toBe(true);
  });

  it("離站時間不可早於到站時間", () => {
    const r = parseForm(patientSchema, fd({ ...basePatient, disposition: "RELEASED", departedAt: "2026-10-18T09:00" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.state.fieldErrors?.departedAt).toBeTruthy();
  });
});

describe("其他表單", () => {
  it("緊急勾選框轉成布林", () => {
    const on = parseForm(requestSchema, fd({ type: "SUPPLY", content: "水 2 箱", urgent: "on" }));
    const off = parseForm(requestSchema, fd({ type: "SUPPLY", content: "水 2 箱" }));
    expect(on.success && on.data.urgent).toBe(true);
    expect(off.success && off.data.urgent).toBe(false);
  });

  it("站點經緯度可留空，填寫時需在範圍內", () => {
    const empty = parseForm(stationSchema, fd({ name: "主站", lat: "", lng: "", status: "OPEN" }));
    expect(empty.success && empty.data.lat).toBeUndefined();
    const bad = parseForm(stationSchema, fd({ name: "主站", lat: "123", lng: "121.5", status: "OPEN" }));
    expect(bad.success).toBe(false);
  });
});
