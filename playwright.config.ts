import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// e2e 使用獨立的資料庫，每次執行前重建並寫入示範資料
process.env.DATABASE_URL = "file:./e2e.db";

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
    command: `node -e "require('fs').rmSync('prisma/e2e.db',{force:true})" && npx prisma migrate deploy && npx tsx prisma/seed.ts --demo && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "file:./e2e.db",
      SESSION_SECRET: "e2e-test-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin1234",
    },
  },
});
