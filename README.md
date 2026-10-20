# 救護站資訊回報系統（國防知性之旅）

國防知性之旅活動現場救護站的即時回報網站：站點人員用手機登記傷患、回報物資與申請支援，指揮中心在看板上即時掌握各站狀況，活動結束後一鍵產出成果報告。

| 站點人員（手機） | 指揮中心看板 |
|---|---|
| <img src="docs/screenshots/02-station-home.png" width="260"> | <img src="docs/screenshots/05-dashboard.png" width="520"> |

**正式網址：** https://ems-report--ems-report-29cc5.asia-east1.hosted.app

## 使用方式

1. 用 Chrome 或 Safari 打開網址，按「使用 Google 帳號登入」。只有**登入名單**上的帳號能進入，其他帳號會顯示「沒有使用權限」。從 LINE 點連結會自動改用手機瀏覽器開啟；Facebook、Instagram 等 App 內建瀏覽器無法使用 Google 登入，畫面會提示改用瀏覽器。
2. 登入後首頁有兩個按鈕：
   - **站點人員** → 點選所屬救護站 → 進入該站的回報頁
   - **指揮中心** → 直接進入看板；「系統管理」也在這裡
3. 登入名單在「指揮中心 → 系統管理 → 登入名單」新增、移除成員，角色可**複選**：
   - **指揮中心**：可以進入看板、傷患紀錄、支援申請、成果報告、系統管理
   - **站點人員**：可以進入救護站回報頁
   - 沒有對應角色時點下去會顯示「沒有權限」；`apphosting.yaml` 的 `OWNER_EMAILS` 是系統擁有者，擁有全部權限且不能被移除

## 功能

**站點人員**
- 登記傷患：到站時間、身分（民眾／國軍官兵／工作人員）、姓名（選填，國軍官兵另選階級）、性別、年齡（可輸入實際年齡，或快速選擇年齡層）、傷病類別、主訴、處置、去向（留觀／離站／後送／拒絕就醫）、後送醫院與車號
- 留觀中的傷患置頂，可隨時更新去向或刪除紀錄（刪除前會確認，內容保留在操作紀錄）
- 切換站點狀態（開設／暫停／撤站）、「回報平安」
- 物資存量 ± 調整，低於安全存量自動通知指揮中心
- 支援申請（人力／物資／救護車），可標示緊急，並看到指揮中心回覆

**指揮中心**
- 即時看板（每 10 秒自動更新）：累計人次、留觀、後送、待處理申請
- 警告：緊急申請、近 30 分鐘後送、物資不足、站點超過 60 分鐘未回報（從沒回報過的站不警告）
- 各站狀態卡片、站點地圖、每小時人次、傷病類別／身分分布
- 傷患紀錄查詢與篩選、匯出 CSV（Excel 可直接開啟）
- 支援申請處理與回覆
- 成果報告頁（可列印或存成 PDF）
- 系統管理：活動場次、救護站（可用 ↑↓ 調整順序）、登入名單、操作紀錄

傷患資料含姓名，屬於個人資料，請依個資法妥善保管匯出的檔案，活動結束後依規定保存或銷毀。所有資料只由網站伺服器讀寫 Firestore，瀏覽器不能直接存取資料庫。

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
src/lib/           權限、session、驗證、統計與警告邏輯、選項定義
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

需要 Node.js 22 與 Java 11 以上（Firebase 模擬器）。

```bash
npm install
npm run dev                     # 啟動 Firestore 與 Auth 模擬器、寫入示範資料，http://localhost:3000
```

本機的 Google 登入是模擬器的假帳號畫面，按「Add new account」並以 `dev@example.com` 登入即為擁有者（見 `.env.development`）。

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
| `OWNER_EMAILS` | 系統擁有者的 Google 帳號（逗號分隔），一定能登入且不能從名單移除 |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase 網頁設定（公開資訊），瀏覽器端 Google 登入使用 |
| `FIRESTORE_DATABASE_ID` | 選填，非預設的 Firestore 資料庫 ID |

## 後續可擴充

- 離線暫存（PWA）：收訊不佳時先存在手機，恢復連線自動上傳
- 警告推播（LINE／Telegram）
- 對齊既有 Google 表單欄位
