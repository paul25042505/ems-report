# 救護站資訊回報系統（國防知性之旅）

國防知性之旅活動現場救護站的即時回報網站：站點人員用手機登記傷患、回報物資與申請支援，指揮中心在看板上即時掌握各站狀況，活動結束後一鍵產出成果報告。

| 站點人員（手機） | 指揮中心看板 |
|---|---|
| <img src="docs/screenshots/02-station-home.png" width="260"> | <img src="docs/screenshots/05-dashboard.png" width="520"> |

**正式網址：** https://ems-report--ems-report-29cc5.asia-east1.hosted.app

## 使用方式

不需要登入。打開網址後首頁有兩個按鈕：

- **站點人員** → 點選所屬救護站 → 進入該站的回報頁
- **指揮中心** → 直接進入看板；「系統管理」也在這裡

> ⚠ 沒有登入機制，知道網址的人都能看到並修改資料，網址請只提供給工作人員。

## 功能

**站點人員**
- 登記傷患：到站時間、身分（民眾／國軍官兵／工作人員）、性別、年齡層、傷病類別、主訴、處置、去向（留觀／離站／後送／拒絕就醫）、後送醫院與車號
- 留觀中的傷患置頂，可隨時更新去向
- 切換站點狀態（開設／暫停／撤站）、「回報平安」
- 物資存量 ± 調整，低於安全存量自動通知指揮中心
- 支援申請（人力／物資／救護車），可標示緊急，並看到指揮中心回覆

**指揮中心**
- 即時看板（每 10 秒自動更新）：累計人次、留觀、後送、待處理申請
- 告警：緊急申請、近 30 分鐘後送、物資不足、站點超過 60 分鐘未回報
- 各站狀態卡片、站點地圖、每小時人次、傷病類別／身分分布
- 傷患紀錄查詢與篩選、匯出 CSV（Excel 可直接開啟）
- 支援申請處理與回覆
- 成果報告頁（可列印或存成 PDF）
- 系統管理：活動場次、救護站、操作紀錄

傷患資料**不收姓名、身分證、電話**。所有資料只由網站伺服器讀寫 Firestore，瀏覽器不能直接存取資料庫。

## 技術架構

Next.js 15（App Router、Server Actions）＋ TypeScript ＋ **Cloud Firestore**（firebase-admin）＋ Tailwind CSS 4，部署在 **Firebase App Hosting**。測試使用 Vitest（單元）與 Playwright（端對端，搭配 Firestore 模擬器）。

- 所有資料都由網站伺服器透過 Admin SDK 讀寫，瀏覽器不直接連 Firestore；`firestore.rules` 禁止所有用戶端存取
- 查詢只用單一欄位條件，不需要建立任何 Firestore 複合索引

Firestore 集合：`events`（場次）、`stations`（救護站）、`users`（帳號）、`patients`（傷患）、`supplies`（物資）、`requests`（支援申請）、`auditLogs`（操作紀錄）。

```
src/app/station/   站點人員：選擇救護站、各站回報頁面（手機版）
src/app/command/   指揮中心：看板、傷患紀錄、支援申請、成果報告
src/app/admin/     系統管理：場次、救護站、操作紀錄
src/lib/repo.ts    Firestore 資料存取
src/lib/           權限、session、驗證、統計與告警邏輯、選項定義
scripts/seed.ts    建立示範資料
tests/unit/        單元測試
tests/e2e/         端對端測試
apphosting.yaml    App Hosting 設定
```

> 要調整表單的選項（例如對齊既有的 Google 表單），修改 `src/lib/constants.ts` 即可。

## 部署到 Firebase（App Hosting + Firestore）

Firebase 專案 `ems-report-29cc5` 已建立 Firestore（`asia-east1`）與 App Hosting 後端 `ems-report`。更新網站：

```bash
npx firebase login
npx firebase deploy --only apphosting,firestore:rules
```

也可以在 Firebase 主控台 App Hosting 把後端連上 GitHub，之後推送到 `main` 就會自動部署。

### 備份

在指揮中心「傷患紀錄」匯出 CSV；或用 Firestore 的匯出／排程備份功能。

## 本機開發

需要 Node.js 22 與 Java 11 以上（Firestore 模擬器）。

```bash
npm install
npm run dev                     # 啟動 Firestore 模擬器、寫入示範資料，http://localhost:3000
```

本機資料存在模擬器的記憶體中，停止後即清除，不會動到正式的 Firestore。

## 測試

```bash
npm run lint
npm run typecheck
npm test                        # 單元測試
npm run test:e2e                # 端對端測試（自動啟動 Firestore 模擬器、build 並啟動服務）
```

## 環境變數

| 變數 | 說明 |
|---|---|
| `FIRESTORE_DATABASE_ID` | 選填，非預設的 Firestore 資料庫 ID |

## 後續可擴充

- 離線暫存（PWA）：收訊不佳時先存在手機，恢復連線自動上傳
- 告警推播（LINE／Telegram）
- 對齊既有 Google 表單欄位
