import { expect, test } from "@playwright/test";
import { choose, joinAs, loginAs, stationToken } from "./helpers";

test("站點登記重症傷患 → 指揮中心看到告警並匯出 CSV", async ({ browser }) => {
  const reporter = await browser.newPage();
  await joinAs(reporter, "分站A", "測試醫務士");
  await expect(reporter.getByRole("heading", { name: "分站A" })).toBeVisible();

  await reporter.getByRole("link", { name: "＋ 登記傷患" }).click();
  await choose(reporter, "sex", "女");
  await choose(reporter, "ageGroup", "長者(65+)");
  await choose(reporter, "triage", "2級");
  await choose(reporter, "category", "熱傷害（中暑/熱衰竭）");
  await reporter.getByLabel("主訴／症狀描述").fill("E2E測試：意識不清");
  await reporter.getByRole("button", { name: "送出登記" }).click();

  await expect(reporter).toHaveURL(/\/station\?saved=created/);
  await expect(reporter.getByText("✓ 已完成登記")).toBeVisible();
  await expect(reporter.getByText("E2E測試：意識不清")).toBeVisible();

  const command = await browser.newPage();
  await loginAs(command, "command", "command1234");
  await expect(command.getByText("分站A：2級 危急傷患（熱傷害（中暑/熱衰竭））留站中")).toBeVisible();

  await command.goto("/command/patients");
  await expect(command.getByText("E2E測試：意識不清")).toBeVisible();
  const csv = await command.request.get("/api/export/patients");
  expect(csv.status()).toBe(200);
  const body = await csv.text();
  expect(body.charCodeAt(0)).toBe(0xfeff);
  expect(body).toContain("E2E測試：意識不清");
  expect(body).toContain("測試醫務士");

  // 回報員把傷患改為後送 → 留站告警消失，出現後送告警
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
  await expect(command.getByText("分站A：2級 危急傷患（熱傷害（中暑/熱衰竭））留站中")).toHaveCount(0);
});

test("表單缺漏欄位時顯示錯誤，保留已填內容", async ({ page }) => {
  await joinAs(page, "主站", "測試員");
  await page.goto("/station/patients/new");
  await page.getByLabel("主訴／症狀描述").fill("只填了主訴");
  await page.getByRole("button", { name: "送出登記" }).click();
  await expect(page.getByText("請修正標示的欄位")).toBeVisible();
  await expect(page.getByLabel("主訴／症狀描述")).toHaveValue("只填了主訴");
  await expect(page).toHaveURL(/\/station\/patients\/new$/);
});

test("緊急支援申請 → 指揮中心回覆 → 站點看到回覆", async ({ browser }) => {
  const reporter = await browser.newPage();
  await joinAs(reporter, "主站", "申請人");
  await reporter.goto("/station/requests");
  await choose(reporter, "type", "救護車");
  await reporter.getByLabel("需求內容").fill("E2E：需要救護車");
  await reporter.getByLabel("緊急").check();
  await reporter.getByRole("button", { name: "送出申請" }).click();
  await expect(reporter.getByText("已送出，指揮中心會盡快處理")).toBeVisible();
  await expect(reporter.getByLabel("需求內容")).toHaveValue(""); // 成功後清空

  const command = await browser.newPage();
  await loginAs(command, "command", "command1234");
  await expect(command.getByText("主站：緊急申請「救護車」待處理 — E2E：需要救護車")).toBeVisible();
  await command.goto("/command/requests");
  const card = command.locator("li", { hasText: "E2E：需要救護車" });
  await card.getByLabel("處理狀態").selectOption("IN_PROGRESS");
  await card.getByLabel("回覆內容").fill("救護車已出發");
  await card.getByRole("button", { name: "更新" }).click();
  await expect(card.locator("span").getByText("處理中", { exact: true })).toBeVisible();
  await expect(card.getByText("最後處理：指揮官（示範）")).toBeVisible();

  await reporter.reload();
  await expect(reporter.getByText("救護車已出發")).toBeVisible();
});

test("物資低於安全存量 → 指揮中心告警", async ({ browser }) => {
  const reporter = await browser.newPage();
  await joinAs(reporter, "主站", "物資員");
  await reporter.goto("/station/supplies");
  await reporter.getByLabel("飲用水 數量").fill("1");
  const row = reporter.locator("li", { hasText: "飲用水" });
  await row.getByRole("button", { name: "儲存" }).click();
  await expect(row.getByText("⚠ 不足")).toBeVisible();
  await expect(row.getByRole("button", { name: "儲存" })).toHaveCount(0);

  const command = await browser.newPage();
  await loginAs(command, "command", "command1234");
  await expect(command.getByText("主站：飲用水 剩 1箱（低於安全存量 3）")).toBeVisible();
});

test("權限：未登入與站點人員無法進入指揮中心與管理頁", async ({ page }) => {
  await page.goto("/command");
  await expect(page).toHaveURL(/\/login$/);

  const res = await page.request.get("/api/export/patients");
  expect(res.status()).toBe(403);

  await joinAs(page, "主站", "越權測試");
  await page.goto("/command");
  await expect(page).toHaveURL(/\/station$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/station$/);
  expect((await page.request.get("/api/export/patients")).status()).toBe(403);
});

test("登入失敗顯示錯誤；指揮中心不能進入管理頁", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("帳號").fill("command");
  await page.getByLabel("密碼").fill("wrong-password");
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page.getByText("帳號或密碼錯誤")).toBeVisible();
  await expect(page.getByLabel("帳號")).toHaveValue("command");

  await loginAs(page, "command", "command1234");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/command$/);
});

test("管理員新增救護站、重新產生 QR Code 後舊登入失效", async ({ browser }) => {
  const admin = await browser.newPage();
  await loginAs(admin, "admin", "admin1234");
  await admin.goto("/admin");
  await admin.getByLabel("站名").fill("E2E分站");
  await admin.getByLabel("位置描述").fill("測試位置");
  await admin.getByRole("button", { name: "新增救護站" }).click();
  await expect(admin.getByText("已新增「E2E分站」，並建立預設物資品項")).toBeVisible();
  await expect(admin.getByRole("cell", { name: "E2E分站" })).toBeVisible();

  const reporter = await browser.newPage();
  const oldToken = await stationToken("E2E分站");
  await joinAs(reporter, "E2E分站", "新站人員");
  await reporter.goto("/station/supplies");
  await expect(reporter.getByText("飲用水")).toBeVisible();

  await admin.locator("tr", { hasText: "E2E分站" }).getByRole("link", { name: "編輯／QR Code" }).click();
  await expect(admin.getByAltText("E2E分站 登入 QR Code")).toBeVisible();
  await admin.getByRole("button", { name: "重新產生 QR Code" }).click();
  await expect.poll(() => stationToken("E2E分站")).not.toBe(oldToken);

  await reporter.goto("/station");
  await expect(reporter).toHaveURL(/\/login$/);
  await reporter.goto(`/join/${oldToken}`);
  await expect(reporter.getByText("此 QR Code 已失效或不存在。")).toBeVisible();
});

test("成果報告頁顯示統計", async ({ page }) => {
  await loginAs(page, "command", "command1234");
  await page.goto("/command/summary");
  await expect(page.getByRole("heading", { name: "醫療救護成果報告" })).toBeVisible();
  await expect(page.getByText(/本場次共設置救護站/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "合計" })).toBeVisible();
});
