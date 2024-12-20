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
├── components/       # 全域共用元件
│   ├── Table/
│   │   ├── DataTable.vue
│   │   └── TableFilter.vue
│   ├── Form/
│   │   ├── SearchForm.vue
│   │   └── FilterForm.vue
│   └── Common/
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
│   ├── menu.ts     # 選單配置
│   └── settings.ts # 全域設定
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
├── plugins/         # 插件
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
├── types/          # TypeScript 類型
│   ├── api.d.ts
│   ├── components.d.ts
│   └── global.d.ts
│
├── utils/          # 工具函數
│   ├── format.ts
│   ├── validator.ts
│   └── helper.ts
│
├── views/          # 頁面
│   ├── futures/    # 期貨管理
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
在 `/components` 中有幾種分割方式，

### 原子型

### 類別型
```sh
components/
├── Table/
│   ├── dataTable.vue
│   └── tableFilter.vue
├── Form/
│   ├── searchForm.vue
│   └── filterForm.vue
└── Common/
    ├── btn.vue
    ├── confirmDialog.vue
    └── statusBadge.vue
```