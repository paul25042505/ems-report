import { expect, type Page } from "@playwright/test";
import { firestore } from "../../src/lib/firestore";

export async function stationToken(name: string) {
  const snap = await firestore.collection("stations").where("name", "==", name).limit(1).get();
  if (snap.empty) throw new Error(`找不到站點 ${name}`);
  return snap.docs[0].get("joinToken") as string;
}

export async function joinAs(page: Page, stationName: string, reporter: string) {
  await page.goto(`/join/${await stationToken(stationName)}`);
  await page.getByLabel("您的稱呼或代號").fill(reporter);
  await page.getByRole("button", { name: "進入站點" }).click();
  await expect(page).toHaveURL(/\/station$/);
}

export async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("帳號").fill(username);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page).toHaveURL(/\/command$/);
}

/** 點選大按鈕單選選項（radio 本身是隱藏的） */
export async function choose(page: Page, group: string, label: string) {
  await page.locator(`[role=radiogroup]#${group}`).getByText(label, { exact: true }).click();
}
