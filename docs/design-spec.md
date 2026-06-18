# +1 App 設計規格（MUJI 風）

修改 UI 時，可直接引用本文件的**區域名稱**、**類名**或**變數名**告訴開發者要改什麼。

功能與業務規則見 [product-spec.md](./product-spec.md)。流程與 API 見 [api-flows.md](./api-flows.md)。

---

## 一、全局基礎

| 項目 | 值 | 定義位置 | 說明 |
|------|-----|----------|------|
| **字體** | `Helvetica Neue`, Arial, `Hiragino Kaku Gothic ProN`, `PingFang HK`, sans-serif | `css/style.css` → `html, body` | 全站 MUJI 無襯線 |
| **行高** | `1.6` | `html, body` | 全局預設 |
| **字距** | `0.02em` | `html, body` | 全局預設 |
| **按鈕字距** | `0.05em` | `button` | 所有按鈕繼承 |

### 顏色變數（`css/style.css` → `:root`）

| 變數名 | 色碼 | 用途 |
|--------|------|------|
| `--muji-bg` | `#F9F9F9` | 頁面背景 |
| `--muji-card` | `#FFFFFF` | 卡片、PWA 白底 |
| `--muji-text` | `#333333` | 主文字（炭灰） |
| `--muji-muted` | `#777777` | 次要文字、標籤 |
| `--muji-border` | `#E5E5E5` | 邊框、分隔線 |
| `--muji-soft` | `#F4F4F2` | 按鈕／膠囊灰底 |
| `--muji-hover` | `#E9E9E6` | 按鈕 hover |

### 字體大小檔位（設定頁可調）

| 檔位 | `html` 基準 | 定義位置 |
|------|-------------|----------|
| 標準 | `16px` | `html` |
| 較大 | `18px` | `html[data-font-size="large"]` |
| 特大 | `20px` | `html[data-font-size="xlarge"]` |

> 使用 `rem` / `0.875rem` 的元素會跟著縮放；寫死 `px` 的（如 Tailwind `text-[10px]`）不會跟著變。

---

## 二、樣式來源（修改時要指明哪一類）

| 類型 | 位置 | 怎麼說 |
|------|------|--------|
| **CSS 類** | `css/style.css` | 「改 `.match-card-capsule` 字號」 |
| **CSS 變數** | `:root` 的 `--muji-*` | 「改 `--muji-muted` 顏色」 |
| **Tailwind 內聯** | `index.html` 的 `class="text-[11px]..."` | 「改首頁 Hero 副標題」 |
| **JS 動態 HTML** | `js/matches.js` 等 | 「改場次卡片地點那一行」 |

---

## 三、區域代號速查

| 你說的區域 | 對應類名／檔案 |
|------------|----------------|
| 場次卡片頂部 | `.match-card-capsule`、`.match-slots-pill`／`js/matches.js` |
| 場主行 | `.host-publisher-row`、`.host-publisher-line` |
| 場次詳情區 | `matches.js` 裡 `border-y` 那段 |
| 報名按鈕 | `.match-book-btn` |
| 已報名波友 | `.participants-block`、`.participant-avatar` |
| 設定頁帳戶區 | `.settings-card--account` |
| 設定頁一般區 | `.settings-card--general` |
| 地區篩選 | `.region-filter-btn` |
| 底部導航 | `.app-footer` |
| 彈窗 | `.confirm-dialog-*`、`.language-modal-option` |
| 發佈頁可見度 | `.session-visibility-field`、`.session-visibility-option` |
| 發佈頁場主參與 | `.publish-host-participate-field` |
| 發佈頁代報名 | `.publish-guest-signup-option`、`.publish-guest-signup-modes` |
| 社群列表 | `.community-list-item`／`js/communities.js` |
| 社群詳情 | `.community-detail-card`、`.community-search-*` |
| 場次管理彈窗 | `.session-manage-*`、`#host-manage-modal` |
| 代報標籤 | `.session-manage-guest-tag` |

---

## 四、各頁面規格

### 1. 啟動畫面 & 首頁 Header

| 位置 | 字號 | 顏色 | 字重 | 字距 | 類名／位置 |
|------|------|------|------|------|-----------|
| 啟動 Logo「+1」 | `text-4xl`≈36px／`md:text-5xl` | `#333333` | bold | `0.05em` | `#splash-screen h1` |
| 首頁 Logo「+1」 | `text-2xl`≈24px | `#333333` | bold | `0.05em` | `#page-match` header |
| 副標題「一齊打波」 | `text-xs`≈12px | `#777777` | normal | `0.04em` | `app.tagline` |
| 登入按鈕 | `11px` | 字 `#333`／底 `#F4F4F2`／邊 `#E5E5E5` | medium | — | `#loginBtn` |
| 已登入郵箱 | `10px` | `gray-600` | normal | — | `#auth-user-email` |
| 登出按鈕 | `10px` | 同登入按鈕 | medium | — | `#auth-logout-btn` |

### 2. 首頁 — 地區篩選 & 日曆

| 位置 | 字號 | 顏色 | 類名 |
|------|------|------|------|
| 地區膠囊（未選） | `11px` | 字 `#777`／底 `#F9FAFB` | `.region-filter-btn` |
| 地區膠囊（選中） | `11px` | 字 `#166534`／底 `#F0FDF4`／邊 `#BBF7D0` | `.region-filter-btn.is-active` |
| 「打球日期」標題 | `12px` | `#333333` | Tailwind `text-xs` |
| 「顯示全部」 | `10px` | `#777777` | `#home-calendar-clear` |
| 日曆星期 | `10px` | `gray-400` | `.calendar-weekday` |
| 日曆月份標題 | `14px` | 預設黑 | `#home-calendar-title` |

### 3. 場次卡片（`js/matches.js` + `css/style.css`）

| 位置 | 字號 | 顏色 | 字重 | 類名 |
|------|------|------|------|------|
| **日期膠囊** | `0.875rem`≈14px* | `#333333` | 500 | `.match-card-capsule` |
| **時間膠囊** | `0.875rem`≈14px* | `#777777` | 500 | `.match-card-capsule--time` |
| 膠囊邊框／底 | — | 邊 `#E5E5E5`／底 `#FFF` | — | 同上 |
| **名額膠囊**（右上） | `10px` | `#777777` | 500 | `.match-slots-pill` |
| 「你發佈的」標籤 | `9px` | 字 `#333`／底 `#F4F4F2` | — | `.match-host-owned-badge` |
| 「私人」標籤 | `9px` | `#777777` | — | `.session-private-badge` |
| **場主行**「由 xxx 發佈」 | `10px` | `#777777` | 500 | `.host-publisher-line` |
| 場主頭像（卡片內） | 頭像 `22×22px`／首字 `9px` | 邊 `--muji-border`／底 `--muji-soft` | — | `.match-card .host-publisher-avatar` |
| **地點／費用／名額 標籤** | `text-sm`≈14px* | `#777777` | normal | Tailwind in `matches.js` |
| **地點／費用／名額 內容** | `text-sm`≈14px* | `#333333` | medium | Tailwind in `matches.js` |
| 卡片內分隔線 | — | `#E5E5E5` | — | `border-[#E5E5E5]` |
| **報名按鈕** | `11px` | 字 `#333`／底 `#F4F4F2` | 500 | `.match-book-btn` |
| 已預約按鈕 | `11px` | 字 `#777`／底 `#FFF` | 500 | `.match-book-btn-reserved` |
| 取消預約連結 | `10px` | `#777777` | — | `.match-cancel-link` |

\* 14px 在「標準」檔位；較大／特大時會按 `rem` 放大。

### 4. 已報名波友（場次卡片內）

| 位置 | 字號 | 顏色 | 類名 |
|------|------|------|------|
| 「已報名波友」標題 | `10px` | `--muji-muted` | `.participants-label` |
| 波友頭像 | `32×32px`／首字 `11px` | 字 `#333` | `.participant-avatar` |
| 波友名字 | `9px` | `#777777` | `.participant-name` |

### 5. 底部導航

| 位置 | 字號 | 顏色 | 類名 |
|------|------|------|------|
| 導航文字 | `9px` | `gray-400` | `.app-footer` |
| 導航圖標 | `text-base`≈16px | — | emoji span |
| 導航底欄 | — | 底 `white/90`／頂邊 `gray-100` | `.app-footer` |

### 6. 我的場次頁

| 位置 | 字號 | 顏色 | 類名 |
|------|------|------|------|
| 頁標題 | `text-3xl` | `gray-900` | `#page-profile h1` |
| 副標題 | `12px` | `gray-400` | Tailwind |
| 出席紀錄主文 | `14px` | `gray-800`／分數 `amber-600` | Tailwind |
| 區塊標題 | `14px` | `gray-900` | `font-extrabold` |
| 區塊說明 | `10px` | `gray-400` | Tailwind |
| 空狀態 | `12px` | `gray-400` | Tailwind |

### 7. 設定頁

| 位置 | 字號 | 顏色 | 類名 |
|------|------|------|------|
| 頁標題「設定」 | `1.5rem`≈24px* | `--muji-text` | `.settings-page-title` |
| 頁副標題 | `11px` | `--muji-muted` | `.settings-page-subtitle` |
| 會員標籤（訪客／會員） | `10px` | `--muji-muted` | `.settings-member-kicker` |
| 會員名字 | `1.125rem`≈18px* | `--muji-text`（訪客 `#777`） | `.settings-member-name` |
| 訪客頭像「＋」 | `1.25rem` | `--muji-muted`／底 `--muji-soft` | `.profile-avatar-display.is-guest` |
| 編輯資料／場主收款按鈕 | `11px` | 字 `#333`／底 `#F4F4F2` | `.profile-action-btn` |
| 語言／字體大小按鈕標題 | `11px` | `--muji-text` | `.settings-about-btn-label` |
| 語言／字體當前值 | `9px` | `--muji-muted` | `.settings-about-btn-value` |
| 提示小字 | `10px` | `--muji-muted` | `.profile-field-hint` |
| 表單標籤 | `10px` | `--muji-muted` | `.profile-field-label` |
| 表單輸入 | `0.875rem` | `--muji-text`／底 `--muji-bg` | `.profile-field-input` |
| 登出按鈕 | `11px` | `#B91C1C` | `.settings-logout-btn` |

### 8. 彈窗（語言／字體／版本／意見／付款等）

| 位置 | 字號 | 顏色 | 類名 |
|------|------|------|------|
| 彈窗標題 | `1rem` | `--muji-text` | `.confirm-dialog-title` |
| 彈窗說明 | `11px` | `--muji-muted` | `.confirm-dialog-text`、`.version-modal-current` |
| 選項按鈕（語言／字體） | `12px` | 字 `#333`／底 `#F4F4F2` | `.language-modal-option` |
| 選項選中 | — | 邊 `#C8C8C4`／底 `#FFF` | `.is-active-profile-action` |
| 主操作按鈕 | `12px` | 字 `#333`／底 `#F4F4F2` | `.confirm-dialog-primary-btn` |
| 取消連結 | `10px` | `--muji-muted` | `.confirm-dialog-cancel-btn` |

### 9. 發佈場次頁（`#page-publish`）

| 位置 | 字號 | 顏色 | 類名／說明 |
|------|------|------|-----------|
| 表單標籤 | `12px` | `gray-500` | `label`、`.block.text-gray-500` |
| 數字輸入（名額、費用） | `14px` | 預設黑 | `.publish-number-input` |
| 滾筒選擇器按鈕 | `14px` | 字 `#333`／底 `#F4F4F2` | `.publish-picker-btn` |
| 時段預覽 | `12px` | `--muji-muted` | `#timePreview`、`.time-preview` |
| **球局可見度** | 標題 `12px` | `--muji-text`／`--muji-muted` | `.session-visibility-legend`、`.session-visibility-label`、`.session-visibility-desc` |
| 可見度選中態 | — | 邊 `#C8C8C4`／底 `#FFF` | `.session-visibility-option:has(:checked)` |
| 社群選擇區 | `12px` | `gray-500` | `#publish-community-wrap`、`.publish-community-hint` |
| **場主參與** | 同可見度區塊樣式 | 同上 | `.publish-host-participate-field` |
| **代報名勾選** | 標題 `12px`／說明 `10px` | `--muji-text`／`--muji-muted` | `.publish-guest-signup-label`、`.publish-guest-signup-desc` |
| 代報名模式（單選） | `11px` | `--muji-text` | `.publish-guest-signup-mode` |
| 確認發佈 | `12px` | 字 `#333`／底 `#F4F4F2` | `.publish-submit-btn` |

### 10. 社群頁（`js/communities.js` + `css/style.css`）

| 位置 | 字號 | 顏色 | 類名 |
|------|------|------|------|
| 建立社群按鈕 | `12px` | 字 `#333`／底 `#F4F4F2` | `.community-create-btn` |
| 社群列表項 | 名稱 `14px`／meta `10px` | `--muji-text`／`--muji-muted` | `.community-list-item__name`、`.community-list-item__meta` |
| 詳情卡片 | 名稱 `1.125rem`／簡介 `12px` | `--muji-text`／`--muji-muted` | `.community-detail-name`、`.community-detail-desc` |
| 搜尋邀請區 | 標題 `12px`／提示 `10px` | `--muji-text`／`--muji-muted` | `.community-search-title`、`.community-search-hint` |
| 搜尋結果列 | 名稱 `14px` | `--muji-text` | `.community-search-result__name` |
| 邀請橫幅 | `12px` | `--muji-text` | `.community-invite-card` |
| 成員列 | 名稱 `14px` | `--muji-text` | `.community-member-name` |
| 踢出按鈕 | `10px` | `#B91C1C` | `.community-member-kick-btn` |

### 11. 場次管理彈窗（場主）

| 位置 | 字號 | 顏色 | 類名 |
|------|------|------|------|
| 分組標題 | `10px` | `--muji-muted` | `.session-manage-group-label` |
| 待審／已批准列 | 名稱 `14px` | `--muji-text` | `.session-manage-name` |
| 批准／拒絕 | `11px` | 批准 `#166534`／拒絕 `#B91C1C` | `.session-manage-btn--approve`、`.session-manage-btn--reject` |
| 已批准標籤 | `10px` | `#166534` | `.session-manage-approved-tag` |
| 代報標籤 | `9px` | `--muji-muted`／底 `--muji-soft` | `.session-manage-guest-tag` |
| 幫朋友留位 | `11px` | 字 `#333`／底 `#F4F4F2` | `.host-manage-add-guest-btn` |

### 12. 場次卡片標籤（補充）

| 位置 | 字號 | 顏色 | 類名 |
|------|------|------|------|
| 社群限定 | `9px` | `--muji-muted` | `.session-community-badge` |
| 待場主批准（球友視角） | `10px` | 琥珀色系 | `.match-compact-status--pending` |
| 代報（參加者列表） | `9px` | `--muji-muted` | `.session-manage-guest-tag` |

---

## 五、修改範例（直接複製改寫）

```
把場次卡片日期膠囊 .match-card-capsule 字號改成 12px
把全局次要文字 --muji-muted 從 #777 改成 #888
場主發佈行 .host-publisher-line 改成 11px，顏色跟地點標籤一樣
設定頁 .settings-about-btn-label 加大到 12px
發佈頁場主參與區 .publish-host-participate-field 選中邊框加深
社群搜尋結果 .community-search-result__name 改成 13px
```

---

*最後更新：2026-06-04 · 對應 App v1.33.1*
