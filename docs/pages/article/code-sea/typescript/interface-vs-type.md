---
title: interface vs type：能合併的只有 interface
image: ''
description: 'interface 和 type 不能畫上等號：同名的 interface 會自動合併，type 是別名，重複宣告就報錯。這個差別決定了「對外開放擴充」的型別該用哪個，也是面試很愛問的題目。'
keywords: ''
author: Opshell
createdAt: '2025-06-25'
categories:
  - TypeScript
tags:
  - TypeScript
  - 面試題
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的筆記寫成全文，補上宣告合併的實際用途（擴充 Vue 的型別）、type 獨有的能力與選用原則；錯誤訊息改成實測 TS 5.9 的版本。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
「`interface` 跟 `type` 差在哪？」是 `TypeScript` 面試的經典題，也是剛開始寫 `TS` 的人最常困惑的地方：兩個好像都能定義物件的形狀，那到底該用哪個？常見的回答是「差不多啦」，但它們從底層設計就不一樣。這篇寫給想把這題答清楚的人。
:::

## 懶人包
- `interface` 可以同名合併、`type` 不行，他們兩個不能畫上等號。
- `type` 從底層設計開始就是 alias（別名），編譯器不允許對同名的 alias 做合併，重複宣告會直接報錯。
- 宣告合併最大的用途是「擴充別人的型別」：套件開一個 `interface` 給你，你用 `declare module` 補欄位。
- `type` 能做 `interface` 做不到的事：聯集、元組、對已有型別做集合運算。
- 實務上通常是混用：需要對外開放擴充的用 `interface`，其他用 `type`。

## 技術拆解

### 同名的 interface 會自動合併
`TS` 語言設計上有個特徵：同一個 scope 裡，同名的 `interface` 宣告了兩次，編譯器不會報錯，而是自動把它們合併成一個。

```ts
interface User {
    id: number;
}

interface User {
    name: string;
}

const user: User = { id: 1, name: 'Opshell' }; // 兩個欄位都要有
```

換成 `type`：

```ts
type User = { id: number };
type User = { name: string }; // ❌ Duplicate identifier 'User'.
```

`type` 就像幫一個型別取綽號，綽號只能指向一個人；`interface` 比較像一份可以多人共同編輯的文件，誰都能在後面補一段。

### 宣告合併拿來做什麼：擴充別人的型別
同一個檔案裡寫兩次 `interface User`，實務上很少見。合併真正好用的地方，是-|跨檔案、跨模組|-擴充型別：別人（套件或另一個模組）定義了一個 `interface`，你在自己的地方用 `declare module` 再寫一次同名的 `interface`，編譯器就會幫你合併。

例如這個是 `Vue` 的某個你設計得很潮的 Button：

```ts
// FancyButton.vue 的 <script setup lang="ts">
export interface FancyButtonProps {
    label: string;
}

const props = defineProps<FancyButtonProps>();
```

為了擴充，你想多加個 `icon` 欄位上去。如果在外層元件或者模組之間，你還有定義這個：

```ts
declare module './FancyButton.vue' {
    interface FancyButtonProps {
        icon?: () => VNode;
    }
}
```

編譯器可以幫你把兩份 `FancyButtonProps` 合併成 `{ label: string; icon?: () => VNode }`。

但如果原本用的是 `type`：

```ts
export type FancyButtonProps = {
    label: string;
};
```

一樣的 `declare module` 寫法改成 `type`，就會得到 `Duplicate identifier 'FancyButtonProps'`。`type` 從底層設計開始就是 alias 別名，編譯器不允許對同名的 alias 去處理合併。

::: warning
上面的 Button 是用來說明型別層的合併。`defineProps<...>()` 的型別是 `Vue` 編譯器在編譯 SFC 時靜態分析的，別的檔案用 `declare module` 合併進來的欄位，不保證會被產生成真正的 runtime prop，實際行為以 `Vue` 官方文件為準。要擴充元件的 props，比較穩的做法還是在元件自己的檔案裡改。
:::

### 更常見的例子：擴充 Vue 本身
宣告合併在 `Vue` 生態系最常見的用法，是幫全域屬性補型別。假設你用 `app.config.globalProperties` 掛了一個 `$formatPrice`，模板裡用得到，型別卻不知道它存在：

```ts
// types/vue.d.ts
declare module 'vue' {
    interface ComponentCustomProperties {
        $formatPrice: (value: number) => string;
    }
}

export {};
```

`ComponentCustomProperties` 是 `Vue` 特地開出來的 `interface`，就是為了讓你合併。外來套件沒提供的型別，也常用同樣的方式在全域層或模組層再做一次 `declare` 封裝，把我們需要但它沒有的加進去。如果它當初寫成 `type`，這條路就整個被堵死了。

### type 能做、interface 做不到的
反過來，`type` 只能用集合的邏輯去操作（聯集、交集等等），但這也正是它的強項：

```ts
// 聯集：interface 無法表達「這個或那個」
type Status = 'idle' | 'loading' | 'success' | 'error';

// 元組
type Point = [number, number];

// 從既有型別算出新型別
type UserPreview = Pick<User, 'id' | 'name'>;
type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };
```

`interface` 只能描述「一個物件長什麼樣子」，`type` 能描述「任何型別長什麼樣子」。

### 介面裡面可以由 type 組成
兩者不是互斥的。常見的寫法是定義一個 `interface` 對外部溝通使用，但這個 `interface` 裡面的欄位是由 `type alias` 組成的：

```ts
type Status = 'idle' | 'loading' | 'success' | 'error';
type Size = 'small' | 'medium' | 'large';

export interface ButtonProps {
    status: Status;
    size: Size;
    label: string;
}
```

介面裡面可以由好幾個型別組成，但能被編譯器 merge 的只有 `interface`。

## 例子與對比

### 繼承 vs 交集
兩者都能「從既有的型別延伸」，寫法不同：

```ts
interface Animal {
    name: string;
}

interface Dog extends Animal {
    bark: () => void;
}

type Cat = Animal & {
    meow: () => void;
};
```

效果很接近。差別是 `extends` 遇到同名欄位型別衝突時會直接報錯，`&` 則會默默把衝突的欄位交集成 `never`，等你用到才發現。

### 一張表

| | `interface` | `type` |
| :--- | :--- | :--- |
| 描述物件形狀 | 可以 | 可以 |
| 同名合併 | 會自動合併 | 報錯 |
| 聯集、元組、原始型別別名 | 不行 | 可以 |
| 延伸 | `extends` | `&` 交集 |
| 用 `declare module` 擴充別人的型別 | 可以 | 不行 |

### 怎麼選
通常是混用。我的原則是：

- 會被別人擴充、要對外開放合併的（套件的設定、全域屬性、外掛的選項），用 `interface`。
- 其他的，包括聯集、工具型別算出來的、只在專案內部用的物件，用 `type`。

~~如果團隊已經有規範，那就照規範，吵這個不如去修 bug。~~

## 結論
`interface` 跟 `type` 的差別，面試時可以濃縮成一句話：-|能被編譯器合併的只有 `interface`，因為 `type` 只是別名|-。其他的差異幾乎都是從這一點長出來的。

還沒開始寫 `TS` 的時候很容易被 `interface` or `type` 搞得很困惑，但寫下去、邊參考大專案的做法，很快就知道該怎麼運用了。
