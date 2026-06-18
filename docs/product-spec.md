# +1 產品規格

功能、資料模型與業務規則說明。UI 字級與類名見 [design-spec.md](./design-spec.md)。流程與 API 見 [api-flows.md](./api-flows.md)。測試見 [testing-checklist.md](./testing-checklist.md)。

**目前版本：** v1.33.2（見 `js/app-version.js`）

---

## 一、實作階段（Phase 1–4）

社群與代報名功能分四階段完成：

| 階段 | 內容 | 狀態 |
|------|------|------|
| **Phase 1** | 建立社群、邀請連結（`?community=`）、成員列表、我的社群 | ✅ |
| **Phase 2** | 發佈「社群限定」場次；大廳不顯示；社群頁列出場次；非成員不可報名 | ✅ |
| **Phase 3** | 代報名（無 App 波友）：場主在場次管理「幫朋友留位」，佔用名額 | ✅ |
| **Phase 4** | 參加者也可代報（發佈時選「場主與已批准參加者」）；參加者只能移除自己代報的人 | ✅ |

後續獨立功能（非 Phase 編號）：

- **搜尋邀請進社群**：`userDirectory` + 設定 opt-in（v1.30.0）
- **Firestore 規則加固**：`activities` 建立／更新路徑收緊（v1.32.0 起，持續修正）
- **場主發佈自報名**：預設場主佔 1 位，可選不參加（v1.33.1）
- **CI/CD**：push `main` → 自動部署 Hosting + Firestore 規則

---

## 二、角色與權限

| 角色 | 能力 |
|------|------|
| **訪客** | 瀏覽大廳公開場次（不可報名） |
| **球友** | 報名／後補／取消、查看場主收款 QR、我的場次 |
| **場主** | 發佈場次、管理待批准名單、批准／拒絕、代報名、刪除自己場次 |
| **社群建立者** | 建立社群、邀請連結、搜尋邀請、移除成員、發佈社群限定場次 |
| **社群成員** | 加入社群、在社群頁看場次與報名、離開社群 |

---

## 三、場次可見度（`audience`）

發佈時三選一（向下相容舊欄位 `isPrivate`）：

| 模式 | `audience` | 大廳 | 誰能報名 |
|------|------------|------|----------|
| 公開球局 | `public` | ✅ 顯示 | 任何登入用戶 |
| 私人球局 | `private` | ❌ | 有連結的登入用戶（`?invite=`） |
| 社群限定 | `community` | ❌ | 該社群 `members` 內的登入用戶 |

社群限定需填 `communityId`、`communityName`（冗餘顯示用）。

---

## 四、發佈場次

### 4.1 場主參與（v1.33.1）

| 選項 | `currentPlayers` | 寫入 |
|------|------------------|------|
| **我會參加（佔 1 位）**（預設） | `1` | `participantUids` 含場主 UID；`participants.{uid}` 為 `reserved` |
| **我只約球，不參加** | `0` | 空名單 |

Firestore 建立規則只允許上述兩種起始狀態，**不可**任意預填多人名額。

### 4.2 代報名（`allowGuestSignupBy`）

| 值 | 誰可代報 |
|----|----------|
| `none` | 不允許（預設） |
| `host_only` | 僅場主 |
| `host_and_participants` | 場主 + 已批准參加者 |

代報名寫入 `guestParticipants.{guestId}`，佔用 `currentPlayers` 與 `maxSlots`。無 Firebase 帳號的球友用顯示名稱代表。

**限制（MVP）：**

- 每位用戶每場最多代報 **2** 人
- 同場不可重複名稱
- Guest 無法自行取消，需由代報者或場主移除

### 4.3 其他發佈規則

- 不能發佈已過去的開場時間
- 同場主、同日期／地點／時段／球技最多 **3** 場（重複提示或阻擋）
- 社群限定：發佈者須為該社群成員（規則以 `members/{uid}` 驗證）

---

## 五、報名與批准

1. 球友按「確認留位」→ `pendingParticipantUids` + `participants.{uid}`（`status: pending`）
2. 場主在「管理」→ **批准** 或 **拒絕**
3. 批准：移出 pending、加入 `participantUids`、`currentPlayers + 1`（若尚未在名單內）
4. 拒絕：移出 pending、刪除 `participants.{uid}`

名額計算：`currentPlayers` + `pendingParticipantUids.length` 不得超過 `maxSlots`（報名時檢查）。

---

## 六、社群

### 6.1 加入方式

| 方式 | 說明 |
|------|------|
| **邀請連結** | `?community={communityId}`，登入後加入 |
| **搜尋邀請** | 建立者在社群詳情搜尋；對方須在設定開啟「允許被搜尋邀請進社群」 |

搜尋使用 `userDirectory` 集合，以 `displayNameLower` **字首**匹配（至少 2 字）。未 opt-in 的用戶不會出現在搜尋結果。

### 6.2 成員管理

- 成員可離開（建立者若為唯一成員可刪除社群）
- 建立者可移除其他成員
- 建立者不可被踢

---

## 七、Firestore 資料模型（摘要）

```
activities/{activityId}
  hostUid, audience, communityId?, communityName?
  maxSlots, currentPlayers
  participantUids[], pendingParticipantUids[], waitlist[]
  participants.{uid}     → displayName, status, joinedAt, ...
  guestParticipants.{id} → displayName, addedByUid, status, ...
  allowGuestSignupBy: none | host_only | host_and_participants
  sessionStartsAt, sessionEndsAt, playDate, region, venue, ...

communities/{communityId}
  name, description, ownerUid, createdAt, updatedAt

communities/{communityId}/members/{uid}
  uid, displayName, photoURL?, role: owner | member, joinedAt

users/{uid}
  displayName, directoryOptIn?, hostSessionCount, ...
  communityMemberships/{communityId}  → 我的社群索引
  communityInvites/{communityId}      → 搜尋邀請通知

userDirectory/{uid}   → 僅 opt-in 用戶；displayName, displayNameLower, photoURL?

hostPublicProfile/{uid}
hostPublicPayment/{uid}
feedback/{id}         → 僅 create，後台 Console 查看
```

---

## 八、Firestore 安全規則（摘要）

`firestore.rules` 對 `activities` 的 `update` 分多條獨立 `allow`，避免單一 OR 鏈評估錯誤導致場主操作失敗：

1. 場主拒絕待審
2. 場主批准待審
3. 報名／後補／取消／代報名／移除代報

建立（`create`）驗證：host 為本人、欄位白名單、場次未開始、可見度合法、起始人數僅 0 或「場主自報 1 人」。

**上線前提醒：** 持續檢查 `activities` update 是否僅允許必要欄位，見 `.cursor/rules/firebase-rules-launch-check.mdc`。

---

## 九、部署與版本

| 項目 | 說明 |
|------|------|
| **自動部署** | `.github/workflows/firebase-deploy.yml`；Secret：`FIREBASE_TOKEN` |
| **手動部署** | `npx firebase-tools deploy --only firestore:rules,hosting --project badminton-app-b08cc` |
| **版本同步** | `js/app-version.js` + `sw.js` 的 `CACHE_NAME` |
| **規則與前端** | 改 `firestore.rules` 後必須 deploy 規則；改 `js/` 後 deploy Hosting 或等 CI |

詳細流程圖見 [api-flows.md](./api-flows.md)；發版驗收見 [testing-checklist.md](./testing-checklist.md)。

---

## 十、產品邊界（刻意不做或 MVP 簡化）

- 無 Email／推播通知（邀請靠連結或 App 內橫幅）
- 無付款審核流程（MVP 為確認留位）
- 一場次只屬於一個社群
- 搜尋邀請為字首匹配，非全文模糊搜尋
- `app/`、`components/` 為早期 Next.js 原型，**不作正式部署**

---

*最後更新：2026-06-04 · v1.33.2*
