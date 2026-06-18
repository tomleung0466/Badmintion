# +1

香港羽毛球場次報名 PWA。**一齊打波。**

球友可在大廳瀏覽場次、報名留位；場主可發佈公開、私人或社群限定球局，管理報名、代報名與收款資料。

**目前版本：** v1.33.2 · [更新紀錄](js/app-version.js) · [產品規格](docs/product-spec.md) · [API 流程](docs/api-flows.md) · [測試清單](docs/testing-checklist.md) · [UI 設計規格](docs/design-spec.md)

---

## 功能概覽

| 角色 | 功能 |
|------|------|
| **球友** | 依地區／日期篩選場次、報名留位／後補／取消、查看場主資料與付款 QR |
| **場主** | 發佈場次（公開／私人／社群限定）、選擇是否親自參加、管理待批准名單、批准／拒絕、代報名、收款設定 |
| **社群** | 建立球群、邀請連結、搜尋邀請（需對方 opt-in）、社群限定場次、成員離開／建立者移除成員 |
| **共用** | Google 登入、個人資料、我的場次、多語言、深色模式、設定頁版本紀錄與意見回饋 |

### 發佈與名額

- **場主參與**：預設「我會參加（佔 1 位）」；可改為「我只約球，不參加」
- **代報名**：可允許場主或「場主 + 已批准參加者」幫無 App 波友留位（佔名額，顯示「代報」）
- **批准制**：報名先入待審名單，場主批准後才計入正式名額

### 社群四階段（Phase 1–4，均已完成）

詳見 [docs/product-spec.md](docs/product-spec.md#一實作階段phase-14)。

---

## 技術架構

| 項目 | 說明 |
|------|------|
| 前端 | 靜態 HTML + JavaScript（PWA，MUJI 極簡風格） |
| 後端 | Firebase Authentication、Cloud Firestore、Storage |
| 部署 | Firebase Hosting + Firestore 規則；push 到 `main` 由 GitHub Actions 自動部署 |
| 專案 ID | `badminton-app-b08cc` |

> 專案根目錄的 `index.html` + `js/` 為**正式使用版本**。  
> `app/`、`components/` 為早期 Next.js 原型，目前不作主要部署（`firebase.json` 已 ignore）。

---

## 專案結構

```
badminton/
├── index.html              # 主頁面
├── css/style.css           # MUJI 風格樣式
├── js/
│   ├── app.js              # 分頁、設定、地區篩選
│   ├── matches.js          # 場次、報名、發佈表單
│   ├── communities.js      # 社群建立、邀請、成員管理
│   ├── auth.js             # Firebase 登入與 Firestore 橋接（ES Module）
│   ├── app-version.js      # 版本號與更新紀錄
│   ├── i18n.js + locales/  # 繁體／簡體
│   ├── pwa.js              # PWA / Service Worker 註冊
│   └── overlay-transition.js
├── docs/
│   ├── product-spec.md     # 產品與資料模型規格
│   ├── api-flows.md        # API、架構與流程圖（接手必讀）
│   ├── testing-checklist.md # 補測／發版驗收清單
│   └── design-spec.md      # UI 字級、顏色、類名規格
├── sw.js                   # Service Worker 快取
├── firestore.rules         # Firestore 安全規則
├── firebase.json           # Firebase Hosting + Firestore 設定
├── .github/workflows/      # CI/CD（push main → 自動部署）
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

### 1. 自動部署（推薦）

Push 到 GitHub `main` 分支後，[`.github/workflows/firebase-deploy.yml`](.github/workflows/firebase-deploy.yml) 會自動部署：

- Firestore 規則（`firestore.rules`）
- Firebase Hosting（靜態網站）

**首次設定：** 在 GitHub Repo → Settings → Secrets → Actions 新增 `FIREBASE_TOKEN`：

```bash
npx firebase-tools login:ci
```

把輸出的 token 貼到 Secret 即可。可在 GitHub → Actions 查看每次部署狀態。

> **重要：** 本地手動 deploy 後，若再 push 含舊版 `firestore.rules` 的 commit，CI 會覆蓋雲端規則。請確保 repo 與已部署版本一致。

### 2. 手動部署（備用）

```bash
npx firebase-tools deploy --only firestore:rules,hosting --project badminton-app-b08cc
```

僅規則或僅網站：

```bash
npx firebase-tools deploy --only firestore:rules --project badminton-app-b08cc
npx firebase-tools deploy --only hosting --project badminton-app-b08cc
```

### 3. PWA 快取

用戶若已安裝 PWA，更新後需重載 App 以取得新版 Service Worker（`sw.js` 內 `CACHE_NAME` 會遞增）。

### 4. 版本號

每次對外更新建議同步修改：

1. `js/app-version.js` — `version`、`build`、`changelog`
2. `sw.js` — `CACHE_NAME`（例如 `plus1-pwa-v58` → `v59`）

用戶可在 App **設定 → 版本與更新** 查看紀錄。

---

## Firebase 集合（簡要）

| 集合 / 路徑 | 用途 |
|-------------|------|
| `activities` | 場次（報名、待審、代報名、可見度） |
| `users` | 個人資料、頭像冷卻、`directoryOptIn` |
| `users/{uid}/communityMemberships` | 我的社群索引 |
| `users/{uid}/communityInvites` | 搜尋邀請通知 |
| `communities` | 社群基本資料 |
| `communities/{id}/members` | 成員與角色（owner / member） |
| `userDirectory` | 可被搜尋邀請的公開索引（opt-in） |
| `hostPublicProfile` | 場主公開名字與頭像（大廳卡片） |
| `hostPublicPayment` | 場主收款 QR（報名頁顯示） |
| `feedback` | 用戶意見（僅後台 Console 查看） |

完整欄位與業務規則見 [docs/product-spec.md](docs/product-spec.md#七firestore-資料模型摘要)。  
流程圖與 `window.db*` API 見 [docs/api-flows.md](docs/api-flows.md)。  
發版前驗收見 [docs/testing-checklist.md](docs/testing-checklist.md)。

---

## 文件索引（接手同事）

| 文件 | 內容 |
|------|------|
| [product-spec.md](docs/product-spec.md) | 功能、Phase、資料模型、規則摘要 |
| [api-flows.md](docs/api-flows.md) | 模組架構、API 表、Mermaid 流程圖 |
| [testing-checklist.md](docs/testing-checklist.md) | 手動測試與迴歸清單 |
| [design-spec.md](docs/design-spec.md) | UI 區塊、類名、字級 |

---

## 開發備忘

| 主題 | 說明 |
|------|------|
| **頭像** | 每 3 日只可更換一次（`avatarUpdatedAt`） |
| **重複發佈** | 同場主、同日期／地點／時段／球技，最多 3 場 |
| **場次過期** | 開場後 30 分鐘起隱藏於大廳，不可再報名 |
| **搜尋邀請** | 被邀請者須在設定開啟「允許被搜尋邀請」；搜尋為名字**字首**匹配 |
| **Firestore 規則** | `activities` update 分獨立 allow 路徑；改規則後必須 deploy |
| **上線前** | 持續檢查 `activities` update 權限，見 `.cursor/rules/firebase-rules-launch-check.mdc` |
| **依賴** | `node_modules` 僅本機工具用，已列入 `.gitignore`，不隨 Hosting 部署 |

---

## 授權

私人專案。未另行標明時，保留所有權利。
