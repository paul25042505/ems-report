import { describe, expect, it } from "vitest";
import { SYMPTOMS, categoryText, departmentOf, symptomsOf } from "@/lib/constants";

describe("內外科與症狀", () => {
  it("症狀歸入正確科別，舊資料代碼沿用", () => {
    expect(departmentOf("HEAT")).toBe("MEDICAL");
    expect(departmentOf("GI")).toBe("MEDICAL");
    expect(departmentOf("INSECT")).toBe("SURGICAL");
    expect(departmentOf("SPRAIN")).toBe("SURGICAL");
    expect(departmentOf("OTHER")).toBe("UNKNOWN");
  });

  it("列表顯示文字", () => {
    expect(categoryText("HEAT")).toBe("內科・熱傷害");
    expect(categoryText("FRACTURE")).toBe("外科・骨折／脫臼");
    expect(categoryText("OTHER")).toBe("未分科・其他");
  });

  it("每個症狀都屬於內科或外科，且代碼不重複", () => {
    expect(symptomsOf("MEDICAL").length + symptomsOf("SURGICAL").length).toBe(SYMPTOMS.length);
    expect(new Set(SYMPTOMS.map((s) => s.value)).size).toBe(SYMPTOMS.length);
  });
});
