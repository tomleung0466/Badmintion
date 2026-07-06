# +1 TestFlight 上架逐步 Checklist

給第一次（或隔了很久）上 Apple TestFlight 用。本專案為 **Capacitor iOS shell + 遠端載入 Firebase Hosting**。

**相關文件：** [功能測試清單](./testing-checklist.md) · [API 流程](./api-flows.md)

**專案識別：**

| 項目 | 值 |
|------|-----|
| Bundle ID | `hk.plusone.badminton` |
| App 顯示名稱 | +1 |
| 線上網址（App 內載入） | https://badminton-app-b08cc.web.app |
| Firebase 專案 | `badminton-app-b08cc` |
| iOS 最低版本 | 14.0 |

> **重要：** App 內容主要來自 **Hosting**，改 `js/` 並 deploy 後，朋友多數 **唔使重新安裝 TestFlight** 就會見到新功能（可能要關 App 重開或清快取）。只有改原生設定（權限、Bundle、Capacitor 插件）先需要出新 build。

---

## 階段 0：帳號與一次性設定

### Apple Developer

- [ ] 已加入 [Apple Developer Program](https://developer.apple.com/programs/)（USD 99/年）
- [ ] 用與開發者帳號相同 Apple ID 登入 [App Store Connect](https://appstoreconnect.apple.com/)
- [ ] Mac 已安裝 **Xcode**（建議最新穩定版）

### Firebase（登入與後端）

- [ ] [Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/badminton-app-b08cc/authentication/settings) 包含：
  - `badminton-app-b08cc.web.app`
  - `badminton-app-b08cc.firebaseapp.com`
  - （本機測試用）`localhost`
- [ ] Google 登入 provider 已啟用
- [ ] 已 deploy 最新 **Hosting + Firestore rules + Storage rules**（見下方「階段 1」）

### App Store Connect 建立 App（首次）

- [ ] App Store Connect → **我的 App** → **+** → 新建 App
- [ ] 平台：iOS
- [ ] 名稱：+1（或你想顯示的名稱）
- [ ] 主要語言：繁體中文
- [ ] Bundle ID：選 `hk.plusone.badminton`（若未登記，先到 [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) 建立 App ID）
- [ ] SKU：自訂即可（例如 `plus1-badminton`）

---

## 階段 1：上傳 TestFlight 前 — 後端與版本

### Deploy 線上後端（朋友測到嘅係呢個）

```bash
cd /path/to/badminton
npx firebase-tools deploy --only firestore:rules,storage,hosting --project badminton-app-b08cc
```

- [ ] 部署成功
- [ ] 瀏覽器開 https://badminton-app-b08cc.web.app → **設定** 確認版本（例如 v1.34.4）
- [ ] 手機 Safari 開同上網址 → **Google 登入** 成功（跳轉登入，唔係彈窗）

### 同步 iOS 版本號（建議與 `js/app-version.js` 一致）

在 Xcode → 選專案 **App** → **General**：

| 欄位 | 建議 | 目前 repo 參考 |
|------|------|----------------|
| **Version**（`MARKETING_VERSION`） | 與 `APP_VERSION.version` 一致 | web: 1.34.4 · Xcode 可能仍為 1.34.0，請手動改 |
| **Build**（`CURRENT_PROJECT_VERSION`） | 每次上傳 TestFlight **必須遞增** | 目前 50 → 下次用 51 |

- [ ] Version / Build 已更新

### Capacitor 同步

```bash
npm run cap:sync
# 或
npx cap sync ios
```

- [ ] 無錯誤
- [ ] `capacitor.config.json` 內 `server.url` 仍指向 `https://badminton-app-b08cc.web.app`

---

## 階段 2：Xcode 簽名與建置

```bash
npm run cap:open
# 或
npx cap open ios
```

### 簽名（Signing & Capabilities）

- [ ] 選 target **App**
- [ ] **Signing & Capabilities** → 勾選 **Automatically manage signing**
- [ ] **Team**：選你的 Apple Developer Team
- [ ] **Bundle Identifier**：`hk.plusone.badminton`
- [ ] 無紅色簽名錯誤

### 建置設定

- [ ] 上方 scheme 選 **App**
- [ ] 裝置選 **Any iOS Device (arm64)**（Archive 用，唔好選模擬器）

### Archive

- [ ] 選單 **Product → Archive**
- [ ] Archive 成功（Organizer 視窗彈出）

若 Archive 灰色或失敗：

- 確認已選真機／Any iOS Device
- 確認 Team 與 Bundle ID 正確
- **Product → Clean Build Folder** 後再試

---

## 階段 3：上傳至 App Store Connect

在 **Organizer**（Xcode → Window → Organizer）：

- [ ] 選剛才的 Archive → **Distribute App**
- [ ] 選 **App Store Connect** → **Upload**
- [ ] 選項一般保持預設（含 bitcode／符號依 Xcode 提示）
- [ ] Upload 完成，無 error

或用 **Transporter** app 上傳 `.ipa`（備用，一般唔使）。

### 等候處理

- [ ] App Store Connect → **TestFlight** → 見到新 build（狀態：Processing，通常 5–30 分鐘）
- [ ] 狀態變 **Ready to Submit** 或可直接測試

---

## 階段 4：TestFlight 合規（首次常見）

### Export Compliance（加密）

`Info.plist` 已設 `ITSAppUsesNonExemptEncryption = false`（僅 HTTPS，無自訂加密）。

- [ ] TestFlight 問加密時選 **否**／使用標準加密 exempt（按 Apple 表單用語）

### Beta App Review（若 Apple 要求）

內部測試（Internal Testing）通常 **唔使** Beta 審核；**外部測試**（External，超過團隊成員）可能要：

- [ ] 填 **測試說明**（例如：羽毛球場次報名測試，需 Google 登入）
- [ ] 提供 **測試帳號**（若審核員無法自行 Google 登入 — 視 Apple 要求）

### 測試資訊建議文案（複製改）

```
+1 是香港羽毛球場次報名 App。測試者請用 Google 帳號登入，
可發佈公開場次、報名、批准名單。資料存於 Firebase。
無付款功能，場費由用戶自行與場主結算。
```

---

## 階段 5：邀請朋友測試

### 內部測試（最快，≤100 人，App Store Connect 團隊成員）

- [ ] App Store Connect → **用戶與存取** → 加朋友為 **Developer** 或 **App Manager**（視你信任程度）
- [ ] TestFlight → **內部測試** → 建立群組 → 勾選 build → 加測試員
- [ ] 朋友 iPhone 安裝 **TestFlight** app，接受邀請

### 外部測試（朋友唔使加入你的 Developer 團隊）

- [ ] TestFlight → **外部測試** → 建立群組
- [ ] 加測試員 email（朋友會收邀請信）
- [ ] 若需 Beta 審核，等候 Apple 批准（首次可能 24–48 小時）

### 朋友安裝後

- [ ] 開 TestFlight → 安裝 **+1**
- [ ] 首次開啟 → Google 登入成功
- [ ] 發佈一場測試波 → 另一帳號報名 → 批准

詳細功能驗收見 [testing-checklist.md](./testing-checklist.md) §9 冒煙測試。

---

## 階段 6：封測前安全快檢（5 分鐘）

| 檢查 | 做法 |
|------|------|
| Storage rules | Firebase Console → Storage → Rules，確認非 test mode 全開 |
| 登入 | 真機 TestFlight 實測，唔好用 Cursor 內建 browser |
| 私人場 | 知悉：Firestore `activities` 目前 `read: true`，私人連結非完全隱藏 |
| 意見回饋 | 設定 → 給我們意見 可送出 |

---

## 常見問題

### 登入：`missing initial state`

- 關閉 App 完全退出後重開
- 不要用內嵌／分區瀏覽器；用 TestFlight 真機
- 確認已 deploy 含 **跳轉登入** 的 web 版（v1.34.4+）

### Archive 失敗：Signing

- Xcode → Settings → Accounts → 重新登入 Apple ID
- 確認 Bundle ID 在 Developer Portal 已註冊

### 朋友見到舊版 UI

- App 載入遠端 web：確認 Hosting 已 deploy
- 關 App 再開；仍舊則卸載 TestFlight 版重装

### Upload 後 Build 不出現

- 等 30 分鐘；查 email 有無 Apple 拒絕說明
- 常見：版本號 Build 未遞增、簽名問題、Info.plist 缺權限描述

### 改 web 後要不要出新 TestFlight build？

| 改動 | 要新 build？ |
|------|-------------|
| `js/`、`css/`、Firestore（Hosting deploy） | 否 |
| `Info.plist`、圖示、Capacitor 插件、Bundle ID | 是 |
| `capacitor.config.json` 的 `server.url` | 是 |

---

## 每次出新 TestFlight build 的最短流程

```text
1. deploy hosting + rules（如有後端改動）
2. 更新 js/app-version.js + sw.js CACHE_NAME（如有對外版本更新）
3. Xcode：Version / Build +1
4. npm run cap:sync
5. Xcode：Product → Archive → Upload
6. TestFlight 加 build 到測試群組
7. 真機冒煙：登入 → 發佈 → 報名
```

---

## 檢查清單總覽（可列印）

```
□ Apple Developer 有效
□ App Store Connect 已建 App（Bundle: hk.plusone.badminton）
□ Firebase 已 deploy（hosting + rules）
□ 手機 Safari 登入測試通過
□ Xcode Team / 簽名 OK
□ Version + Build 已遞增
□ cap sync 完成
□ Archive + Upload 成功
□ TestFlight build Processing 完成
□ 邀請測試員
□ 真機：登入 + 發佈 + 報名
```

---

*最後更新：2026-07-06 · 對應 web v1.34.4 · Capacitor 遠端載入 Hosting*
