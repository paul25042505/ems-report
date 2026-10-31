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

test("LINE 內建瀏覽器自動改用外部瀏覽器；其他 App 內建瀏覽器顯示提示", async ({ browser }) => {
  const line = await browser.newPage({ userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile Safari/537.36 Line/14.0.0" });
  await line.goto("/");
  await expect(line).toHaveURL(/\/login\?openExternalBrowser=1$/);

  const fb = await browser.newPage({ userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/450.0]" });
  await fb.goto("/login");
  await expect(fb.getByText("請用 Chrome 或 Safari 開啟")).toBeVisible();

  const normal = await browser.newPage();
  await normal.goto("/login");
  await expect(normal.getByRole("button", { name: "使用 Google 帳號登入" })).toBeVisible();
  await expect(normal.getByText("請用 Chrome 或 Safari 開啟")).toHaveCount(0);
});

test("畫面固定不能縮放，並提供加入主畫面的 App 設定", async ({ page }) => {
  await page.goto("/login");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("maximum-scale=1");
  expect(viewport).toContain("user-scalable=no");
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).display).toBe("standalone");
  expect((await page.request.get("/apple-icon")).headers()["content-type"]).toContain("image/png");
});

test("不在名單上的帳號無法登入；加入名單後可以登入，移出後失效", async ({ browser }) => {
  // 不在名單上：登入後只能進申請帳號頁
  const outsider = await browser.newPage();
  expect(await login(outsider, "outsider@example.com")).toBe(200);
  await outsider.goto("/command");
  await expect(outsider).toHaveURL(/\/apply$/);
  expect((await outsider.request.get("/api/export/patients")).status()).toBe(403);

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

  // 只勾「指揮中心」：可以進指揮中心，進不了救護站
  await owner.getByLabel("Google 帳號（Email）").fill("leader@example.com");
  await owner.locator("#allowed-role-command").check();
  await owner.locator("#allowed-role-station").uncheck();
  await owner.getByRole("button", { name: "加入名單" }).click();
  await expect(owner.getByText("已加入 leader@example.com（指揮中心）")).toBeVisible();
  const leader = await browser.newPage();
  expect(await login(leader, "leader@example.com")).toBe(200);
  await leader.goto("/command");
  await expect(leader.getByRole("link", { name: "系統管理" })).toBeVisible();
  await leader.goto("/station");
  await expect(leader.getByRole("heading", { name: "您沒有站點人員的權限" })).toBeVisible();

  // 兩個都不勾會被擋下
  await owner.getByLabel("Google 帳號（Email）").fill("nobody@example.com");
  await owner.locator("#allowed-role-command").uncheck();
  await owner.locator("#allowed-role-station").uncheck();
  await owner.getByRole("button", { name: "加入名單" }).click();
  await expect(owner.getByText("請至少勾選一個角色")).toBeVisible();

  // 名單上可以複選角色並儲存
  const medicRow = owner.locator("li", { hasText: "medic@example.com" });
  await medicRow.getByLabel("指揮中心").check();
  await medicRow.getByRole("button", { name: "儲存" }).click();
  await expect(medicRow.getByText("已儲存")).toBeVisible();
  await expect(medicRow.getByLabel("指揮中心")).toBeChecked();
  await expect(medicRow.getByLabel("站點人員")).toBeChecked();

  await owner.locator("li", { hasText: "medic@example.com" }).getByRole("button", { name: "移出" }).click();
  await expect(owner.locator("li", { hasText: "medic@example.com" })).toHaveCount(0);
});

test("申請帳號 → 後台核准後可以使用；拒絕後可重新申請", async ({ browser }) => {
  const applicant = await browser.newPage();
  expect(await login(applicant, "newbie@example.com")).toBe(200);
  await applicant.goto("/");
  await expect(applicant).toHaveURL(/\/apply$/);
  await applicant.getByLabel("單位").fill("國軍測試醫院");
  await applicant.getByLabel("級職").fill("上士／醫務士");
  await applicant.getByLabel("姓名").fill("張申請");
  await applicant.getByRole("button", { name: "送出申請" }).click();
  await expect(applicant.getByRole("heading", { name: "審核中" })).toBeVisible();

  const rejectee = await browser.newPage();
  await login(rejectee, "reject@example.com");
  await rejectee.goto("/apply");
  await rejectee.getByLabel("單位").fill("某單位");
  await rejectee.getByLabel("級職").fill("下士");
  await rejectee.getByLabel("姓名").fill("李拒絕");
  await rejectee.getByRole("button", { name: "送出申請" }).click();
  await expect(rejectee.getByRole("heading", { name: "審核中" })).toBeVisible();

  const owner = await browser.newPage();
  await enterCommand(owner);
  await owner.goto("/admin/users");
  await expect(owner.getByRole("heading", { name: "帳號申請（待審核 2）" })).toBeVisible();
  const req = owner.locator("li", { hasText: "newbie@example.com" });
  await expect(req.getByText("國軍測試醫院　上士／醫務士　張申請")).toBeVisible();
  await req.getByRole("button", { name: "核准" }).click(); // 預設站點人員
  await expect(owner.getByRole("heading", { name: "帳號申請（待審核 1）" })).toBeVisible();
  await expect(owner.getByText("國軍測試醫院 上士／醫務士 張申請")).toBeVisible(); // 已加入名單，備註帶入資料
  await owner.locator("li", { hasText: "reject@example.com" }).getByRole("button", { name: "拒絕" }).click();
  await expect(owner.getByRole("heading", { name: "帳號申請（待審核 0）" })).toBeVisible();

  // 核准：重新整理即可使用站點，但沒有指揮中心權限
  await applicant.goto("/");
  await expect(applicant.getByRole("link", { name: "站點人員" })).toBeVisible();
  await applicant.goto("/command");
  await expect(applicant.getByRole("heading", { name: "您沒有指揮中心的權限" })).toBeVisible();

  // 拒絕：看到未通過，可以重新申請
  await rejectee.reload();
  await expect(rejectee.getByText("上次的申請未通過")).toBeVisible();
  await expect(rejectee.getByLabel("姓名")).toHaveValue("李拒絕");
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
  // 先選科別才出現症狀；切換科別會清空症狀
  await expect(reporter.locator("[role=radiogroup]#category")).toHaveCount(0);
  await choose(reporter, "department", "外科");
  await choose(reporter, "category", "扭傷／拉傷");
  await choose(reporter, "department", "內科");
  await expect(reporter.getByText("扭傷／拉傷")).toHaveCount(0);
  await choose(reporter, "category", "熱傷害（中暑／熱衰竭／熱痙攣）");
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
  expect(body).toContain("民眾,,測試王小明,女,70,長者(65+),內科,熱傷害（中暑／熱衰竭／熱痙攣）");
  await expect(command.getByRole("cell", { name: "內科・熱傷害" }).first()).toBeVisible();

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
  await choose(reporter, "department", "外科");
  await choose(reporter, "category", "扭傷／拉傷");
  await reporter.getByRole("button", { name: "送出登記" }).click();
  await expect(reporter.getByText("上士 測試陳大華・外科・扭傷")).toBeVisible();

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
  await choose(reporter, "department", "外科");
  await choose(reporter, "category", "其他外科");
  await reporter.getByRole("button", { name: "送出登記" }).click();
  await reporter.getByText("待刪除測試・外科・其他外科").click();

  // 取消確認 → 不刪除
  reporter.once("dialog", (d) => d.dismiss());
  await reporter.getByRole("button", { name: "刪除此筆紀錄" }).click();
  await expect(reporter.getByRole("heading", { name: "更新傷患紀錄" })).toBeVisible();

  // 確認 → 刪除並回站點首頁
  reporter.once("dialog", (d) => d.accept());
  await reporter.getByRole("button", { name: "刪除此筆紀錄" }).click();
  await expect(reporter.getByText("✓ 紀錄已刪除")).toBeVisible();
  await expect(reporter.getByText("待刪除測試・外科・其他外科")).toHaveCount(0);

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
  await expect(page.getByRole("cell", { name: "E2E分站", exact: true })).toBeVisible();

  await enterStation(page, "E2E分站");
  await page.getByRole("link", { name: "物資" }).click();
  await expect(page.getByText("飲用水")).toBeVisible();
});

test("系統管理調整救護站順序，站點清單跟著改變", async ({ page }) => {
  await enterCommand(page);
  await page.getByRole("link", { name: "系統管理" }).click();
  await expect(page.getByRole("button", { name: "主站 上移" })).toBeDisabled();
  await page.getByRole("button", { name: "分站B 上移" }).click();
  await expect(page.locator("tbody tr").nth(1)).toContainText("分站B");
  await page.getByRole("button", { name: "分站B 上移" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("分站B");
  await expect(page.getByRole("button", { name: "分站B 上移" })).toBeDisabled();

  await page.goto("/station");
  const names = await page.locator("ul li a span.text-xl").allTextContents();
  expect(names.slice(0, 3)).toEqual(["分站B", "主站", "分站A"]);
});

test("成果報告頁顯示統計", async ({ page }) => {
  await enterCommand(page);
  await page.getByRole("link", { name: "成果報告" }).click();
  await expect(page.getByRole("heading", { name: "醫療救護成果報告" })).toBeVisible();
  await expect(page.getByText(/本場次共設置救護站/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "合計" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "傷病類別（內外科）" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "內科 小計" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "外科 小計" })).toBeVisible();
  await expect(page.getByText(/依科別分，內科 \d+ 人/)).toBeVisible();
});

test("輪椅借用：借出、全部借出警告、在別站歸還", async ({ browser }) => {
  const main = await browser.newPage();
  await enterStation(main, "主站");
  await expect(main.getByRole("heading", { name: "♿ 輪椅借用" })).toBeVisible();

  // 電話格式錯誤
  await main.getByRole("button", { name: "＋ 借出輪椅" }).click();
  await main.getByLabel("借用人姓名").fill("錯誤電話");
  await main.getByLabel("電話").fill("abc");
  await main.getByRole("button", { name: "確認借出" }).click();
  await expect(main.getByText("請輸入正確的電話")).toBeVisible();

  // 借出 3 台（主站配置 3 台）
  for (const [i, name] of ["借用甲", "借用乙", "借用丙"].entries()) {
    if (i > 0) await main.getByRole("button", { name: "＋ 借出輪椅" }).click();
    await main.getByLabel("借用人姓名").fill(name);
    await main.getByLabel("電話").fill(`0912-000-00${i}`);
    await main.getByRole("button", { name: "確認借出" }).click();
    await expect(main.getByText(`已借出輪椅給 ${name}`)).toBeVisible();
  }
  await expect(main.getByRole("button", { name: "目前沒有可借的輪椅" })).toBeDisabled();

  const command = await browser.newPage();
  await enterCommand(command);
  await expect(command.getByText("主站：輪椅已全部借出（借出中 3 台）")).toBeVisible();
  const todayTile = command.locator(".card", { hasText: "今日輪椅借出" });
  await expect(todayTile.locator("p").nth(1)).toHaveText("3");
  await expect(todayTile.getByText("借出中 3 台")).toBeVisible();
  await expect(command.getByRole("heading", { name: "♿ 輪椅" })).toBeVisible();

  // 沒有配置輪椅的站不顯示
  const b = await browser.newPage();
  await enterStation(b, "分站B");
  await expect(b.getByRole("heading", { name: "♿ 輪椅借用" })).toHaveCount(0);

  // 在分站A 歸還主站借出的輪椅
  const a = await browser.newPage();
  await enterStation(a, "分站A");
  await expect(a.getByText("主站借出・", { exact: false }).first()).toBeVisible();
  await a.getByRole("button", { name: "借用乙 歸還" }).click();
  await expect(a.getByRole("button", { name: "借用乙 歸還" })).toHaveCount(0);
  const aStats = a.locator("section", { hasText: "♿ 輪椅借用" });
  await expect(aStats.locator("dd").nth(2)).toHaveText("3"); // 分站A 配置 2，收到 1 台 → 可借 3

  // 選擇救護站清單顯示輪椅數量；沒有輪椅的站不顯示
  await a.goto("/station");
  await expect(a.getByRole("link", { name: /^主站/ })).toContainText("♿ 可借 0／共 3");
  await expect(a.getByRole("link", { name: /^分站A/ })).toContainText("♿ 可借 3／共 2");
  await expect(a.getByRole("link", { name: /^分站B/ })).not.toContainText("♿");

  await main.reload();
  const mStats = main.locator("section", { hasText: "♿ 輪椅借用" });
  await expect(mStats.locator("dd").nth(1)).toHaveText("2"); // 主站借出中剩 2
  await expect(mStats.locator("dd").nth(2)).toHaveText("0"); // 輪椅在分站A，主站仍沒有可借
});

test("手機寬度下各頁面不會左右撐開", async ({ browser }) => {
  const phone = await browser.newPage({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
  await enterCommand(phone);
  for (const path of ["/", "/command", "/command/patients", "/command/summary", "/admin", "/admin/users", "/station"]) {
    await phone.goto(path);
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

// 會清空資料，必須放在最後
test("清除測試資料：需輸入「清除」，執行後傷患與申請歸零、物資恢復預設", async ({ page }) => {
  await enterCommand(page);
  await page.goto("/command/patients");
  await expect(page.getByText(/共 [1-9]\d* 筆/)).toBeVisible();

  await page.goto("/admin");
  page.on("dialog", (d) => d.accept());
  await page.getByLabel("請輸入「清除」以確認").fill("刪除");
  await page.getByRole("button", { name: "清除測試資料" }).click();
  await expect(page.getByText("請在欄位中輸入「清除」兩個字才會執行")).toBeVisible();

  await page.getByLabel("請輸入「清除」以確認").fill("清除");
  await page.getByRole("button", { name: "清除測試資料" }).click();
  await expect(page.getByText(/已清除：傷患紀錄 \d+ 筆、支援申請 \d+ 筆、輪椅借用 \d+ 筆/)).toBeVisible();

  await page.goto("/command/patients");
  await expect(page.getByText("共 0 筆")).toBeVisible();
  await page.goto("/command/requests");
  await expect(page.getByText("目前沒有申請")).toBeVisible();
  await page.goto("/command");
  await expect(page.getByText("✓ 目前無警告")).toBeVisible();

  await page.goto("/station");
  await page.getByRole("link", { name: /^主站/ }).click();
  await expect(page.getByText("最後回報：尚未回報")).toBeVisible();
  await page.getByRole("link", { name: "物資" }).click();
  await expect(page.getByLabel("飲用水 數量")).toHaveValue("10");

  await page.goto("/admin/audit");
  await expect(page.getByRole("cell", { name: "清除測試資料" })).toBeVisible();
});
