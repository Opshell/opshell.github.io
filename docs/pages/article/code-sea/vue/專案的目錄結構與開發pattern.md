---
title:  '基本的 Vue3 + Vite + Typescript 的基本專案結構'
author: 'Opshell'
createdAt: '2024/09/05'
categories: 'Project Structure'
tags:
  - structure
  - pattern
editLink: true
isPublished: false
refer:
  -
---

## 基本的 Vue3 + Vite + Typescript 的基本專案結構
在基本的專案中，大部分的專案結構都會長得像(或類似)這樣：
```sh
src/
├── assets/           # 靜態資源
│   ├── images/
│   ├── icons/
│   └── scss/
│
├── api/              # api 相關方式 及設定
│   ├── images/
│   ├── icons/
│   └── scss/
│
├── components/       # 全域共用元件
│   ├── el/
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


## 關於 components 的結構
在 `/components` 中有幾種常見的分類方式：

### 原子型 (Atomic Design)
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

### 類別型 (Categorical)
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

### 頁面型 (Page-based)
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

### 域型 (Domain-based)
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

主要看團隊怎麼界定，只要習慣就可以了。

