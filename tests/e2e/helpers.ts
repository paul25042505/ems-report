import { expect, type Page } from "@playwright/test";

/** 從首頁點「站點人員」→ 點選救護站 */
export async function enterStation(page: Page, stationName: string) {
  await page.goto("/");
  await page.getByRole("link", { name: "站點人員" }).click();
  await page.getByRole("link", { name: new RegExp(`^${stationName}`) }).click();
  await expect(page.getByRole("heading", { name: stationName, exact: true })).toBeVisible();
}

/** 從首頁點「指揮中心」 */
export async function enterCommand(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "指揮中心" }).click();
  await expect(page).toHaveURL(/\/command$/);
}

/** 點選大按鈕單選選項（radio 本身是隱藏的） */
export async function choose(page: Page, group: string, label: string) {
  await page.locator(`[role=radiogroup]#${group}`).getByText(label, { exact: true }).click();
}
