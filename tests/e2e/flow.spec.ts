import { expect, test } from "@playwright/test";
import { choose, enterCommand, enterStation, login } from "./helpers";

test("未登入時導向 Google 登入頁，API 也擋下", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "使用 Google 帳號登入" })).toBeVisible();
  await page.goto("/command");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/export/patients")).status()).toBe(401);
});

test("不在名單上的帳號無法登入；加入名單後可以登入，移出後失效", async ({ browser }) => {
  const outsider = await browser.newPage();
  expect(await login(outsider, "outsider@example.com")).toBe(403);
  await outsider.goto("/");
  await expect(outsider).toHaveURL(/\/login$/);

  const owner = await browser.newPage();
  await enterCommand(owner);
  await owner.getByRole("link", { name: "系統管理" }).click();
  await owner.getByRole("link", { name: "登入名單" }).click();
  await expect(owner.getByText("owner@example.com")).toBeVisible();
  await owner.getByLabel("Google 帳號（Email）").fill("Medic@Example.com");
  await owner.getByLabel("備註").fill("主站醫務士");
  await owner.getByRole("button", { name: "加入名單" }).click(); // 角色預設為站點人員
  await expect(owner.getByText("已加入 medic@example.com（站點人員）")).toBeVisible();

  // 站點人員：可以進救護站，點「指揮中心」被擋下
  const medic = await browser.newPage();
  expect(await login(medic, "medic@example.com")).toBe(200);
  await medic.goto("/");
  await expect(medic.getByText("medic@example.com")).toBeVisible();
  await medic.getByRole("link", { name: "站點人員" }).click();
  await medic.getByRole("link", { name: /^主站/ }).click();
  await expect(medic.getByRole("heading", { name: "主站", exact: true })).toBeVisible();
  await medic.goto("/");
  await medic.getByRole("link", { name: "指揮中心" }).click();
  await expect(medic.getByRole("heading", { name: "您沒有指揮中心的權限" })).toBeVisible();
  await medic.goto("/admin/users");
  await expect(medic.getByRole("heading", { name: "您沒有指揮中心的權限" })).toBeVisible();
  expect((await medic.request.get("/api/export/patients")).status()).toBe(403);

  // 指揮中心角色：可以進指揮中心
  await owner.getByLabel("Google 帳號（Email）").fill("leader@example.com");
  await owner.getByLabel("角色").selectOption("COMMAND");
  await owner.getByRole("button", { name: "加入名單" }).click();
  await expect(owner.getByText("已加入 leader@example.com（指揮中心）")).toBeVisible();
  const leader = await browser.newPage();
  expect(await login(leader, "leader@example.com")).toBe(200);
  await leader.goto("/command");
  await expect(leader.getByRole("link", { name: "系統管理" })).toBeVisible();

  // 名單上可以切換角色
  const medicRow = owner.locator("li", { hasText: "medic@example.com" });
  await medicRow.getByRole("button", { name: "改為指揮中心" }).click();
  await expect(medicRow.getByRole("button", { name: "改為站點人員" })).toBeVisible();

  await owner.locator("li", { hasText: "medic@example.com" }).getByRole("button", { name: "移出" }).click();
  await expect(owner.locator("li", { hasText: "medic@example.com" })).toHaveCount(0);
});

test("登出後回到登入頁", async ({ page }) => {
  await enterCommand(page);
  await page.getByRole("button", { name: "登出" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/command");
  await expect(page).toHaveURL(/\/login$/);
});

test("首頁兩個入口", async ({ page }) => {
  await login(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "站點人員" })).toBeVisible();
  await expect(page.getByRole("link", { name: "指揮中心" })).toBeVisible();
  await page.getByRole("link", { name: "站點人員" }).click();
  await expect(page.getByRole("heading", { name: "選擇救護站" })).toBeVisible();
  for (const name of ["主站", "分站A", "分站B"]) {
    await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  }
});

test("站點登記傷患 → 指揮中心看到紀錄、後送警告並匯出 CSV", async ({ browser }) => {
  const reporter = await browser.newPage();
  await enterStation(reporter, "分站A");

  await reporter.getByRole("link", { name: "＋ 登記傷患" }).click();
  await expect(reporter.getByLabel("姓名")).toHaveCount(0); // 選身分前不顯示姓名
  await choose(reporter, "patientType", "民眾");
  await reporter.getByLabel("姓名").fill("測試王小明");
  await choose(reporter, "sex", "女");
  await reporter.getByLabel("年齡", { exact: true }).fill("70");
  await expect(reporter.getByText("已依年齡自動判斷：長者(65+)")).toBeVisible();
  await choose(reporter, "category", "熱傷害（中暑/熱衰竭）");
  await reporter.getByLabel("主訴／症狀描述").fill("E2E測試：意識不清");
  await reporter.getByRole("button", { name: "送出登記" }).click();

  await expect(reporter).toHaveURL(/\/station\/[^/]+\?saved=created/);
  await expect(reporter.getByText("✓ 已完成登記")).toBeVisible();
  await expect(reporter.getByText("E2E測試：意識不清")).toBeVisible();

  const command = await browser.newPage();
  await enterCommand(command);
  await command.goto("/command/patients");
  await expect(command.getByText("E2E測試：意識不清")).toBeVisible();
  await expect(command.getByRole("cell", { name: "測試王小明" })).toBeVisible();
  await expect(command.getByText("民眾／女／70 歲")).toBeVisible();
  const csv = await command.request.get("/api/export/patients");
  expect(csv.status()).toBe(200);
  const body = await csv.text();
  expect(body.charCodeAt(0)).toBe(0xfeff);
  expect(body).toContain("E2E測試：意識不清");
  expect(body).toContain("民眾,,測試王小明,女,70,長者(65+)");

  // 改為後送 → 指揮中心出現後送警告
  await reporter.getByText("E2E測試：意識不清").click();
  await choose(reporter, "disposition", "後送醫院");
  await reporter.getByRole("button", { name: "儲存修改" }).click();
  await expect(reporter.getByText("後送請填寫醫院")).toBeVisible();
  await expect(reporter.getByLabel("主訴／症狀描述")).toHaveValue("E2E測試：意識不清"); // 驗證失敗不清空欄位
  await reporter.getByRole("textbox", { name: "後送醫院" }).fill("E2E醫院");
  await reporter.getByRole("button", { name: "儲存修改" }).click();
  await expect(reporter.getByText("✓ 紀錄已更新")).toBeVisible();

  await command.goto("/command");
  await expect(command.getByText(/分站A：後送 E2E醫院/)).toBeVisible();
});

test("國軍官兵在姓名左邊選擇階級", async ({ browser }) => {
  const reporter = await browser.newPage();
  await enterStation(reporter, "主站");
  await reporter.getByRole("link", { name: "＋ 登記傷患" }).click();
  await choose(reporter, "patientType", "民眾");
  await expect(reporter.getByLabel("階級")).toHaveCount(0);
  await choose(reporter, "patientType", "國軍官兵");
  await reporter.getByLabel("階級").selectOption("上士");
  await reporter.getByLabel("姓名").fill("測試陳大華");
  await choose(reporter, "sex", "男");
  await choose(reporter, "ageGroup", "成人(18-64)");
  await choose(reporter, "category", "扭傷");
  await reporter.getByRole("button", { name: "送出登記" }).click();
  await expect(reporter.getByText("上士 測試陳大華・扭傷")).toBeVisible();

  const command = await browser.newPage();
  await enterCommand(command);
  await command.goto("/command/patients");
  await expect(command.getByRole("cell", { name: "上士 測試陳大華" })).toBeVisible();
});

test("刪除傷患紀錄（需確認）", async ({ browser }) => {
  const reporter = await browser.newPage();
  await enterStation(reporter, "分站B");
  await reporter.getByRole("link", { name: "＋ 登記傷患" }).click();
  await choose(reporter, "patientType", "民眾");
  await reporter.getByLabel("姓名").fill("待刪除測試");
  await choose(reporter, "sex", "男");
  await choose(reporter, "ageGroup", "成人(18-64)");
  await choose(reporter, "category", "其他");
  await reporter.getByRole("button", { name: "送出登記" }).click();
  await reporter.getByText("待刪除測試・其他").click();

  // 取消確認 → 不刪除
  reporter.once("dialog", (d) => d.dismiss());
  await reporter.getByRole("button", { name: "刪除此筆紀錄" }).click();
  await expect(reporter.getByRole("heading", { name: "更新傷患紀錄" })).toBeVisible();

  // 確認 → 刪除並回站點首頁
  reporter.once("dialog", (d) => d.accept());
  await reporter.getByRole("button", { name: "刪除此筆紀錄" }).click();
  await expect(reporter.getByText("✓ 紀錄已刪除")).toBeVisible();
  await expect(reporter.getByText("待刪除測試・其他")).toHaveCount(0);

  const command = await browser.newPage();
  await enterCommand(command);
  await command.goto("/command/patients");
  await expect(command.getByText("待刪除測試")).toHaveCount(0);
  await command.goto("/admin/audit");
  await expect(command.getByRole("cell", { name: "刪除傷患紀錄" })).toBeVisible();
  await expect(command.getByText("分站B／owner（owner@example.com）").first()).toBeVisible(); // 記錄操作的 Google 帳號
});

test("表單缺漏欄位時顯示錯誤，保留已填內容", async ({ page }) => {
  await enterStation(page, "主站");
  await page.getByRole("link", { name: "＋ 登記傷患" }).click();
  await page.getByLabel("主訴／症狀描述").fill("只填了主訴");
  await page.getByRole("button", { name: "送出登記" }).click();
  await expect(page.getByText("請修正標示的欄位")).toBeVisible();
  await expect(page.getByLabel("主訴／症狀描述")).toHaveValue("只填了主訴");
  await expect(page).toHaveURL(/\/patients\/new$/);
});

test("緊急支援申請 → 指揮中心回覆 → 站點看到回覆", async ({ browser }) => {
  const reporter = await browser.newPage();
  await enterStation(reporter, "主站");
  await reporter.getByRole("link", { name: "支援申請" }).click();
  await choose(reporter, "type", "救護車");
  await reporter.getByLabel("需求內容").fill("E2E：需要救護車");
  await reporter.getByLabel("緊急").check();
  await reporter.getByRole("button", { name: "送出申請" }).click();
  await expect(reporter.getByText("已送出，指揮中心會盡快處理")).toBeVisible();
  await expect(reporter.getByLabel("需求內容")).toHaveValue(""); // 成功後清空

  const command = await browser.newPage();
  await enterCommand(command);
  await expect(command.getByText("主站：緊急申請「救護車」待處理 — E2E：需要救護車")).toBeVisible();
  await command.goto("/command/requests");
  const card = command.locator("li", { hasText: "E2E：需要救護車" });
  await card.getByLabel("處理狀態").selectOption("IN_PROGRESS");
  await card.getByLabel("回覆內容").fill("救護車已出發");
  await card.getByRole("button", { name: "更新" }).click();
  await expect(card.locator("span").getByText("處理中", { exact: true })).toBeVisible();

  await reporter.reload();
  await expect(reporter.getByText("救護車已出發")).toBeVisible();
});

test("物資低於安全存量 → 指揮中心警告", async ({ browser }) => {
  const reporter = await browser.newPage();
  await enterStation(reporter, "主站");
  await reporter.getByRole("link", { name: "物資" }).click();
  await reporter.getByLabel("飲用水 數量").fill("1");
  const row = reporter.locator("li", { hasText: "飲用水" });
  await row.getByRole("button", { name: "儲存" }).click();
  await expect(row.getByText("⚠ 不足")).toBeVisible();
  await expect(row.getByRole("button", { name: "儲存" })).toHaveCount(0);

  const command = await browser.newPage();
  await enterCommand(command);
  await expect(command.getByText("主站：飲用水 剩 1箱（低於安全存量 3）")).toBeVisible();
});

test("系統管理新增救護站 → 站點清單出現並可進入", async ({ page }) => {
  await enterCommand(page);
  await page.getByRole("link", { name: "系統管理" }).click();
  await page.getByLabel("站名").fill("E2E分站");
  await page.getByLabel("位置描述").fill("測試位置");
  await page.getByRole("button", { name: "新增救護站" }).click();
  await expect(page.getByText("已新增「E2E分站」，並建立預設物資品項")).toBeVisible();
  await expect(page.getByRole("cell", { name: "E2E分站" })).toBeVisible();

  await enterStation(page, "E2E分站");
  await page.getByRole("link", { name: "物資" }).click();
  await expect(page.getByText("飲用水")).toBeVisible();
});

test("成果報告頁顯示統計", async ({ page }) => {
  await enterCommand(page);
  await page.getByRole("link", { name: "成果報告" }).click();
  await expect(page.getByRole("heading", { name: "醫療救護成果報告" })).toBeVisible();
  await expect(page.getByText(/本場次共設置救護站/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "合計" })).toBeVisible();
});
