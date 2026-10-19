import { expect, type Page } from "@playwright/test";

const AUTH_EMULATOR = "http://127.0.0.1:9099";

/** 在 Auth 模擬器以 Google 帳號登入，取得 ID token（模擬器接受未簽章的假 Google token） */
export async function googleIdToken(email: string, name = email.split("@")[0]) {
  const res = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postBody: `id_token=${encodeURIComponent(JSON.stringify({ sub: email, email, name, email_verified: true }))}&providerId=google.com`,
      requestUri: "http://localhost",
      returnSecureToken: true,
    }),
  });
  const data = (await res.json()) as { idToken?: string };
  if (!data.idToken) throw new Error(`模擬器登入失敗：${JSON.stringify(data)}`);
  return data.idToken;
}

/** 以指定的 Google 帳號登入網站（預設為系統擁有者），回傳登入 API 的回應狀態 */
export async function login(page: Page, email = "owner@example.com") {
  const res = await page.request.post("/api/session", { data: { idToken: await googleIdToken(email) } });
  return res.status();
}

/** 從首頁點「站點人員」→ 點選救護站 */
export async function enterStation(page: Page, stationName: string) {
  await login(page);
  await page.goto("/");
  await page.getByRole("link", { name: "站點人員" }).click();
  await page.getByRole("link", { name: new RegExp(`^${stationName}`) }).click();
  await expect(page.getByRole("heading", { name: stationName, exact: true })).toBeVisible();
}

/** 從首頁點「指揮中心」 */
export async function enterCommand(page: Page) {
  await login(page);
  await page.goto("/");
  await page.getByRole("link", { name: "指揮中心" }).click();
  await expect(page).toHaveURL(/\/command$/);
}

/** 點選大按鈕單選選項（radio 本身是隱藏的） */
export async function choose(page: Page, group: string, label: string) {
  await page.locator(`[role=radiogroup]#${group}`).getByText(label, { exact: true }).click();
}
