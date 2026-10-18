# 救護站資訊回報系統（國防知性之旅）

國防知性之旅活動現場救護站的即時回報網站：站點人員用手機掃 QR Code 登記傷患、回報物資與申請支援，指揮中心在看板上即時掌握各站狀況，活動結束後一鍵產出成果報告。

| 站點人員（手機） | 指揮中心看板 |
|---|---|
| <img src="docs/screenshots/02-station-home.png" width="260"> | <img src="docs/screenshots/05-dashboard.png" width="520"> |

## 功能

**站點人員**（掃描站點 QR Code 登入，不需帳號）
- 登記傷患：到站時間、身分（民眾／國軍官兵／工作人員）、性別、年齡層、TTAS 檢傷 1–5 級、傷病類別、主訴、處置、去向（留觀／離站／後送／拒絕就醫）、後送醫院與車號
- 留觀中的傷患置頂，可隨時更新去向
- 切換站點狀態（開設／暫停／撤站）、「回報平安」
- 物資存量 ± 調整，低於安全存量自動通知指揮中心
- 支援申請（人力／物資／救護車），可標示緊急，並看到指揮中心回覆

**指揮中心**
- 即時看板（每 10 秒自動更新）：累計人次、留觀、後送、1–2 級重症、待處理申請
- 告警：重症留站、緊急申請、近 30 分鐘後送、物資不足、站點超過 60 分鐘未回報
- 各站狀態卡片、站點地圖（OpenStreetMap）、每小時人次、檢傷／傷病類別／身分分布
- 傷患紀錄查詢與篩選、匯出 CSV（Excel 可直接開啟）
- 支援申請處理與回覆
- 成果報告頁（可列印或存成 PDF）

**系統管理員**
- 活動場次管理（可重複用於不同營區）
- 救護站管理、列印站點 QR Code、QR Code 外流時一鍵重新產生（舊的立即失效）
- 指揮中心／管理員帳號管理
- 操作紀錄（誰在什麼時間做了什麼）

## 個資與安全

- 傷患資料**不收姓名、身分證、電話**，只記錄統計所需欄位
- 密碼以 bcrypt 雜湊；登入失敗 5 次鎖 10 分鐘
- Session 為簽章的 HttpOnly Cookie；每次請求都向資料庫確認帳號仍有效、QR Code 未被重新產生
- 伺服器端逐一檢查角色與站點歸屬：站點人員只能看到、修改自己站的資料
- CSV 匯出防公式注入，匯出動作寫入操作紀錄
- 正式環境請務必使用 HTTPS

## 技術架構

Next.js 15（App Router、Server Actions）＋ TypeScript ＋ Prisma ＋ SQLite ＋ Tailwind CSS 4，前後端在同一個專案。測試使用 Vitest（單元）與 Playwright（端對端）。

SQLite 對單一活動的資料量綽綽有餘，部署只要保留一個資料檔；之後若要改用 PostgreSQL，修改 `prisma/schema.prisma` 的 `provider` 並重新產生 migration 即可。

```
prisma/            資料模型、migration、seed（初始管理員與示範資料）
src/app/station/   站點人員頁面（手機版）
src/app/command/   指揮中心：看板、傷患紀錄、支援申請、成果報告
src/app/admin/     系統管理：場次、救護站、QR Code、帳號、操作紀錄
src/app/join/      QR Code 登入
src/lib/           權限、session、驗證、統計與告警邏輯、選項定義
tests/unit/        單元測試
tests/e2e/         端對端測試
```

> 要調整表單的選項（例如對齊既有的 Google 表單），修改 `src/lib/constants.ts` 即可。

## 本機開發

需要 Node.js 22。

```bash
npm install
cp .env.example .env            # 編輯 ADMIN_PASSWORD
npx prisma migrate deploy       # 建立資料庫
npm run db:seed:demo            # 建立管理員與示範資料（含 3 個救護站）
npm run dev                     # http://localhost:3000
```

示範帳號：
- 管理員：`admin` ／ `.env` 中的 `ADMIN_PASSWORD`
- 指揮中心：`command` ／ `command1234`
- 站點人員：seed 會印出各站的 `/join/...` 網址，也可以在「系統管理 → 救護站 → 編輯／QR Code」取得

## 測試

```bash
npm run lint
npm run typecheck
npm test                        # 單元測試
npm run test:e2e                # 端對端測試（自動建立獨立的 prisma/e2e.db、build 並啟動服務）
```

## 部署

### Docker（自有主機或任何支援 Docker 的平台）

```bash
cat > .env <<'EOF'
SESSION_SECRET=請用 openssl rand -base64 32 產生
ADMIN_PASSWORD=初始管理員密碼
PUBLIC_URL=https://你的網域
EOF
docker compose up -d --build
```

- 資料存在 Docker volume `ems-data`（`/data/ems.db`），重建容器不會遺失
- 容器啟動時自動套用資料庫遷移，若沒有任何帳號會建立初始管理員
- 前面請放 HTTPS 反向代理（Caddy、Nginx 或平台內建）。Session Cookie 在正式環境設為 Secure，純 HTTP 連線無法登入；若只在內網用 HTTP 測試，可設 `INSECURE_COOKIE=1`
- `PUBLIC_URL` 是 QR Code 內的網址，沒設定時以瀏覽器存取的網址產生

### Render 一鍵部署

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/paul25042505/ems-report)

依 `render.yaml` 建立服務與 1GB 永久磁碟（Starter 方案），過程中只需填 `ADMIN_PASSWORD`；`SESSION_SECRET` 會自動產生。

### 其他雲端平台（如 Zeabur、Fly.io）

用 Dockerfile 部署，設定上面三個環境變數，並掛載一個持久化磁碟到 `/data`。

### 備份

資料就是 `/data/ems.db` 一個檔案，活動結束後複製保存即可；也可以在指揮中心匯出 CSV。

## 環境變數

| 變數 | 說明 |
|---|---|
| `DATABASE_URL` | SQLite 路徑，Docker 預設 `file:/data/ems.db` |
| `SESSION_SECRET` | Session 簽章金鑰，正式環境必填、至少 32 字元 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 資料庫沒有任何帳號時建立的初始管理員 |
| `PUBLIC_URL` | 選填，QR Code 使用的對外網址 |
| `INSECURE_COOKIE` | 選填，設為 `1` 允許在 HTTP 下登入（僅限測試） |

## 後續可擴充

- 離線暫存（PWA）：收訊不佳時先存在手機，恢復連線自動上傳
- 告警推播（LINE／Telegram）
- 對齊既有 Google 表單欄位
