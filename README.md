# +1

香港羽毛球場次報名 PWA。**一齊打波。**

球友可在大廳瀏覽場次、報名留位；場主可發佈公開或私人球局、管理報名與收款資料。

---

## 功能概覽

| 角色 | 功能 |
|------|------|
| 球友 | 依地區／日期篩選場次、報名／後補、查看場主資料與付款 QR |
| 場主 | 發佈場次（時段、球技、公開／私人）、管理待批准名單、收款設定 |
| 共用 | Google 登入、個人資料、我的場次、設定頁版本紀錄與意見回饋 |

---

## 技術架構

| 項目 | 說明 |
|------|------|
| 前端 | 靜態 HTML + JavaScript（PWA，MUJI 極簡風格） |
| 後端 | Firebase Authentication、Cloud Firestore、Storage |
| 部署 | GitHub Pages（靜態檔）；Firestore 規則須在 Firebase Console 手動發佈 |

> 專案根目錄的 `index.html` + `js/` 為**正式使用版本**。  
> `app/`、`components/` 為早期 Next.js 原型，目前不作主要部署。

---

## 專案結構

```
badminton/
├── index.html          # 主頁面
├── css/style.css       # MUJI 風格樣式
├── js/
│   ├── app.js          # 分頁、設定、地區篩選
│   ├── matches.js      # 場次、報名、發佈表單
│   ├── auth.js         # Firebase 登入與 Firestore 橋接（ES Module）
│   ├── app-version.js  # 版本號與更新紀錄
│   ├── pwa.js          # PWA / Service Worker 註冊
│   └── overlay-transition.js
├── sw.js               # Service Worker 快取
├── firestore.rules     # Firestore 安全規則（需手動發佈）
├── manifest.webmanifest
└── icons/
```

---

## 本機預覽

靜態網站，用任一本地伺服器即可：

```bash
# 例：Python
python3 -m http.server 8080

# 例：npx
npx serve .
```

瀏覽器打開 `http://localhost:8080`。  
Firebase 登入在 `localhost` 需在 Firebase Console → Authentication → 授權網域加入 `localhost`。

---

## 部署

### 1. 前端（GitHub Pages）

Push 到 GitHub 後，Pages 會從倉庫根目錄提供靜態檔。  
用戶若已安裝 PWA，更新後需重載 App 以取得新版 Service Worker（`sw.js` 內 `CACHE_NAME` 會遞增）。

### 2. Firestore 規則

修改 `firestore.rules` 後，**必須**到 [Firebase Console](https://console.firebase.google.com) → Firestore → **Rules** → 貼上並**發佈**，否則線上權限不會更新。

### 3. 版本號

每次對外更新建議同步修改：

1. `js/app-version.js` — `version`、`build`、`changelog`
2. `sw.js` — `CACHE_NAME`（例如 `plus1-pwa-v27` → `v28`）

用戶可在 App **設定 → 版本與更新** 查看紀錄。

---

## Firebase 集合（簡要）

| 集合 | 用途 |
|------|------|
| `activities` | 場次資料 |
| `users` | 個人資料、頭像冷卻時間等 |
| `hostPublicProfile` | 場主公開名字與頭像（大廳卡片顯示） |
| `hostPublicPayment` | 場主收款 QR（報名頁顯示） |
| `feedback` | 用戶意見（僅後台 Console 查看） |

---

## 開發備忘

- **頭像**：每 3 日只可更換一次（`avatarUpdatedAt`），減少 Storage 濫用。
- **重複發佈**：同場主、同日期／地點／時段／球技，最多 3 場；超出會提示或阻擋。
- **場次過期**：開場後 30 分鐘起隱藏於大廳，不可再報名。
- **上線前**：收緊 `activities` 的 update 規則，避免非預期欄位被篡改（見 `.cursor/rules/firebase-rules-launch-check.mdc`）。

---

## 授權

私人專案。未另行標明時，保留所有權利。
