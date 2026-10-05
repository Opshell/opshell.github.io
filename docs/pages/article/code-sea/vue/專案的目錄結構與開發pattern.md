---
title: Vue 3 + Vite + TypeScript 專案的目錄結構：先照技術分類就好
author: Opshell
createdAt: '2024-09-05'
categories:
  - Project Structure
tags:
  - structure
  - pattern
editLink: true
isPublished: false
refer:
  - null
image: ''
description: '一個中小型 Vue 3 + Vite + TypeScript 專案的資料夾該怎麼放：先照技術類型分、頁面專用的東西跟著頁面走，再看 components 常見的四種分類法怎麼選。'
keywords: ''
---
::: warning 草稿
Claude 於 2026-10-05 補完：補了脈絡、懶人包、各資料夾的說明、四種 components 分類的對比與結論；目錄樹裡 `api/` 底下原本誤貼成 `images/icons/scss`，改成 `index.ts`、`interceptors.ts`，`components/el/` 改成 `atom/` 跟下面的原子型一致。「Opshell 的[這篇]筆記」原本就沒有連結，請補上。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
開新專案時，常見的情況是 `src/` 底下一開始只有 `components/` 和 `views/`，東西越加越多才發現 API、型別、工具函式不知道該放哪，每個人放的地方都不一樣。這篇整理一個中小型 Vue 3 + Vite + TypeScript 專案「大部分會長的樣子」，寫給要開新專案、或想幫舊專案整理資料夾的人。專案變大、功能之間開始互相依賴之後的做法，接在 part2。
:::

## 懶人包

- 中小型專案先照**技術類型**分資料夾（`components`、`composables`、`stores`、`services`…），新人最好上手。
- 頁面專用的元件與邏輯放在 `views/某頁/` 底下，**用得到的人在哪，東西就放哪**；兩個以上頁面用到才升級到全域。
- `api/` 與 `services/` 這類職責重疊的資料夾，團隊挑一個就好，不要兩個都有。
- `components/` 的分類法（原子型、類別型、頁面型、域型）沒有對錯，主要看團隊怎麼界定，只要習慣就可以了。
- 專案大到改一個功能要在五個資料夾之間跳，就是該往 feature 切分（part2、FSD）走的時候。

## 技術拆解

### 基本的 Vue3 + Vite + Typescript 的基本專案結構
在基本的專案中，大部分的專案結構都會長得像(或類似)這樣：
```sh
src/
├── assets/           # 靜態資源
│   ├── images/
│   ├── icons/
│   └── scss/
│
├── api/              # api 相關方式 及設定
│   ├── index.ts
│   └── interceptors.ts
│
├── components/       # 全域共用元件
│   ├── atom/
│   │   ├── btn.vue
│   │   ├── select.vue
│   │   └── input.vue
│   ├── mole/
│   │   ├── listBar.vue
│   │   ├── modal.vue
│   │   └── notify.vue
│   └── orga/
│       ├── ConfirmDialog.vue
│       └── StatusBadge.vue
│
├── composables/      # 可複用邏輯
│   ├── table/
│   │   ├── useSort.ts
│   │   ├── useFilter.ts
│   │   └── usePagination.ts
│   ├── form/
│   │   ├── useValidation.ts
│   │   └── useFormState.ts
│   ├── auth/
│   │   ├── usePermission.ts
│   │   └── useRole.ts
│   └── ui/
│       ├── useModal.ts
│       └── useToast.ts
│
├── config/          # 配置文件
│   ├── menu.ts      # 選單配置
│   └── settings.ts  # 全域設定
│
├── constants/       # 常量定義
│   ├── api.ts
│   ├── enums.ts
│   └── permission.ts
│
├── middleware/      # 中間件
│   ├── auth.ts
│   └── error.ts
│
├── plugins/         # 套件
│   ├── axios.ts
│   ├── permission.ts
│   └── element-plus.ts
│
├── services/        # API 服務
│   ├── api/
│   │   ├── futures.ts
│   │   └── users.ts
│   ├── request.ts
│   └── types.ts
│
├── stores/          # 狀態管理
│   ├── permission.ts
│   └── user.ts
│
├── types/           # TypeScript 類型
│   ├── api.d.ts
│   ├── components.d.ts
│   └── global.d.ts
│
├── utils/           # 工具函數
│   ├── format.ts
│   ├── validator.ts
│   └── helper.ts
│
├── views/           # 頁面
│   ├── futures/     # 期貨管理
│   │   ├── composables/     # 期貨相關邏輯
│   │   │   ├── useGamePlay.ts
│   │   │   └── useOrderRecords.ts
│   │   ├── components/      # 期貨頁面專用元件
│   │   │   └── OrderTable.vue
│   │   ├── GamePlaySettings.vue
│   │   ├── OrderRecords.vue
│   │   └── TradingPair.vue
│   │
│   └── users/     # 用戶管理
│       ├── composables/
│       │   └── useUserList.ts
│       ├── components/
│       │   └── UserForm.vue
│       ├── UserList.vue
│       └── Login.vue
│
├── App.vue
└── main.ts
```

### 每個資料夾在放什麼

這棵樹是「照技術類型分」（Technical Splitting）：同一種東西放一起。幾個比較容易搞混的：

- `components/` vs `views/`：`views/` 是路由對應的頁面，`components/` 是**兩個以上頁面**會用到的元件。只有一頁用到的，放 `views/那一頁/components/`。
- `composables/` vs `utils/`：有用到 Vue 響應式（`ref`、`watch`、生命週期）的放 `composables/`，命名用 `useXxx`；純函式（格式化、驗證）放 `utils/`，可以單獨測試、也可以搬到別的專案。
- `config/` vs `constants/`：`config/` 是「可能會改的設定」（選單、全域參數），`constants/` 是「不會變的定義」（列舉、權限代碼、API 路徑）。
- `api/` vs `services/`：這兩個在很多專案裡做的是同一件事，-|團隊挑一個名字就好|-，不要讓新人猜「這支 API 到底在哪」。
- `middleware/`：路由守衛、錯誤處理這類「每次都要過一遍」的邏輯。權限相關的則分散在 `composables/auth/`、`plugins/permission.ts`、`stores/permission.ts`，各管一段（判斷、註冊、狀態）。

### 頁面專用的東西跟著頁面走

`views/futures/` 底下又有自己的 `composables/` 和 `components/`，這是整棵樹最重要的一個習慣：**東西放在最靠近使用者的地方**（colocation）。

好處是改「期貨管理」時，八成的檔案都在同一個資料夾裡；哪天這個功能下架，整個資料夾刪掉就乾淨了，不會在全域 `components/` 裡留下一堆沒人敢刪的孤兒。

等到第二個頁面也要用 `OrderTable.vue`，再把它搬到全域 `components/`。先局部、再升級，比一開始就全部丟全域好管得多。

## 例子與對比

### 關於 components 的結構
在 `/components` 中有幾種常見的分類方式：

#### 原子型 (Atomic Design)
根據原子設計方法論來分類，分為原子 (Atoms)、分子 (Molecules)、有機體 (Organisms) 等，詳細可以參考 Opshell 的[這篇]筆記。
```sh
components/
├── atom/
│   ├── btn.vue
│   ├── select.vue
│   └── input.vue
├── mole/
│   ├── listBar.vue
│   ├── notify.vue
│   └── modal.vue
└── orga/
    ├── list.vue
    ├── header.vue
    └── registerForm.vue
```

#### 類別型 (Categorical)
根據元件的類別來分類，例如表格、表單、通用元件等。
```sh
components/
├── table/
│   ├── dataTable.vue
│   └── tableFilter.vue
├── form/
│   ├── searchForm.vue
│   └── filterForm.vue
└── common/
    ├── btn.vue
    ├── confirmDialog.vue
    └── statusBadge.vue
```

#### 頁面型 (Page-based)
根據頁面來分類，每個頁面有自己的元件目錄。
```sh
components/
├── home/
│   ├── newsList.vue
│   └── banner.vue
├── about/
│   ├── timeLine.vue
│   └── aboutContent.vue
└── product/
    ├── productCart.vue
    ├── searchBar.vue
    └── productInfo.vue
```

#### 域型 (Domain-based)
根據需求來分類，例如會員管理、產品管理等。
```sh
components/
├── user/
│   ├── register.vue
│   └── login.vue
├── news/
│   ├── listBar.vue
│   └── listItem.vue
└── product/
    ├── productCart.vue
    ├── searchBar.vue
    └── productInfo.vue
```


### 四種分法怎麼選

| 分法 | 分類依據 | 好處 | 要小心 |
|---|---|---|---|
| 原子型 | 元件的大小與組合層級 | 跟設計系統對得起來，UI 元件複用度高 | 「這個算分子還是有機體」會吵很久 |
| 類別型 | 元件的用途類型 | 直覺，找表格就去 `table/` | `common/` 很容易變成什麼都丟的垃圾桶 |
| 頁面型 | 用到它的頁面 | 改頁面時東西都在一起 | 其實就是 `views/某頁/components/`，放全域反而重複 |
| 域型 | 業務領域 | 跟後端、需求單對得起來 | 已經是 feature 切分的前身，元件以外的東西也會想跟著搬 |

我自己的習慣是：全域 `components/` 用原子型或類別型放「跟業務無關」的 UI 元件；跟業務有關的，跟著頁面走。主要看團隊怎麼界定，只要習慣就可以了。

## 結論

中小型專案不用一開始就上大架構：照技術類型分、頁面專用的東西跟著頁面走、職責重疊的資料夾只留一個，就能撐很久。等到功能之間開始互相依賴、改一個地方要跳五個資料夾，再看 part2 講的 feature 切分，或者更嚴格的 FSD（Feature-Sliced Design）。

資料夾結構就像衣櫃，重點不是收納法多高級，是全家人都知道襪子放哪一格。
