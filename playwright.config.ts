import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// e2e 使用 Firestore 模擬器（資料只在記憶體，每次執行都是全新的），並寫入示範資料。
// 測試程式本身也透過 Admin SDK 連到同一個模擬器查資料。
const EMULATOR = { FIRESTORE_EMULATOR_HOST: "127.0.0.1:8085", GCLOUD_PROJECT: "demo-ems" };
Object.assign(process.env, EMULATOR);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx firebase emulators:exec --only firestore --project demo-ems "npx tsx scripts/seed.ts && npx next build && npx next start -p ${PORT}"`,
    url: `http://localhost:${PORT}/`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      ...EMULATOR,
    },
  },
});
