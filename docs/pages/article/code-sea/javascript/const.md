---
title: 'const 不是常數，是「不能改指向」'
image: ''
description: 'const 宣告的物件還是可以改內容，因為 const 鎖的是變數的參考，不是值本身。整理 const 到底鎖了什麼、要真的不可變該用什麼，以及 Object.freeze 和 as const 的差別。'
keywords: ''
author: Opshell
createdAt: '2024-10-14'
categories:
  - JavaScript
tags:
  - JavaScript
  - TypeScript
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的 MDN 摘錄寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
很多人學 `const` 的第一印象是「常數，宣告了就不能改」。然後某天寫了 `const user = { name: 'A' }`，接著 `user.name = 'B'` 居然沒報錯，就開始懷疑人生。

這篇從 [MDN 對 const 的說明](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Statements/const) 出發，把 `const` 到底鎖了什麼講清楚，寫給剛從 `var` 換到 `let`／`const` 的人。
:::

## 懶人包
- `const` 建立的是**唯讀的參考**：變數不能再被指定成別的東西，但它指向的物件內容可以改。
- 原始型別（數字、字串、布林）本來就不可變，所以 `const` 用起來就像常數；物件、陣列就不是了。
- 要物件內容也不能改，用 `Object.freeze`，但它只凍**第一層**。
- TypeScript 的 `as const`、`readonly` 只在編譯時擋，執行時一樣改得動。
- 預設用 `const`，真的需要重新指定才用 `let`，`var` 就讓它退休吧。

## 技術拆解

### const 鎖的是「指向」
MDN 的原話是這樣的：

> 宣告 const 會對於它的值建立一個唯讀的參考。並不是說這個值不可變更，而是這個變數不能再一次指定值。例如，假設常數的內容(值)是個物件，那麼此物件的內容(物件的參數)是可以更改的。

用生活比喻：`const` 是把你家的**門牌**用水泥封死，你不能把門牌改成別人家的地址；但你家裡的家具要怎麼搬，`const` 管不著。

```ts
const user = { name: 'Opshell' };

user.name = 'Ops';          // 可以，改的是家裡的家具
user = { name: 'Other' };   // TypeError: Assignment to constant variable.
```

陣列也一樣：

```ts
const list = [1, 2, 3];

list.push(4);   // 可以
list[0] = 99;   // 可以
list = [];      // TypeError
```

### 那為什麼數字看起來就是常數
因為原始型別（`number`、`string`、`boolean`…）本身就是不可變的，`'abc'` 不能被改成 `'abd'`，只能產生一個新字串再指定給變數。既然唯一能改的方式就是「重新指定」，而 `const` 剛好禁止這件事，數字和字串用 `const` 宣告就真的改不了了。

### 一些順便要知道的規矩
- **一定要初始化**：`const a;` 直接語法錯誤。
- **區塊作用域**：跟 `let` 一樣，只活在最近的 `{}` 裡。
- **暫時性死區（TDZ）**：宣告之前就使用會丟 `ReferenceError`，不像 `var` 會給你 `undefined`。
- **迴圈**：`for (const item of list)` 可以，因為每一圈都是新的綁定；`for (const i = 0; i < 3; i++)` 不行，因為 `i++` 要重新指定。

## 例子與對比

### 要真的不能改：Object.freeze
```ts
const config = Object.freeze({
    apiBase: '/api',
    retry: { times: 3 }
});

config.apiBase = '/v2';    // 嚴格模式下 TypeError，非嚴格模式默默失敗
config.retry.times = 10;   // 可以！freeze 只凍第一層
```

`Object.freeze` 是**淺凍結**，巢狀的物件要自己遞迴凍：

```ts
function deepFreeze<T extends object>(target: T): Readonly<T> {
    Object.values(target).forEach((value) => {
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    });

    return Object.freeze(target);
}
```

ES module 預設就是嚴格模式，所以在現在的專案裡，改凍結物件會直接丟錯，這反而是好事，錯誤越早爆越好抓。

### TypeScript 的 as const 與 readonly
```ts
const STATUS = {
    ENABLE: 1,
    DISABLE: 0
} as const;

STATUS.ENABLE = 2; // 編譯錯誤：Cannot assign to 'ENABLE' because it is a read-only property.
```

`as const` 還會把型別收窄成字面值（`1` 而不是 `number`），拿來當 enum 的替代品很好用。但要記得：-|它只活在編譯時|-，編譯成 JavaScript 之後就是普通物件，執行時被改了也不會有人攔。

### 一張表整理

| 寫法 | 擋重新指定 | 擋改內容 | 深層 | 什麼時候生效 |
|---|---|---|---|---|
| `let` | 否 | 否 | – | – |
| `const` | 是 | 否 | – | 執行時 |
| `Object.freeze` | 否（要搭 `const`） | 是 | 只有第一層 | 執行時 |
| `deepFreeze` | 否（要搭 `const`） | 是 | 是 | 執行時 |
| `as const`／`readonly` | – | 是 | `as const` 是深層的 | 只在編譯時 |

### 那平常要怎麼選
- 預設全部用 `const`，看到 `let` 就知道「這個變數等一下會被改」，讀程式的人會感謝你。
- 設定檔、對照表這種寫死的資料：`as const` 擋開發時手滑，真的怕執行時被改再加 `Object.freeze`。
- Vue 的 `ref`、`reactive` 也是用 `const` 宣告：`const count = ref(0)`，改的是 `count.value`，不是 `count` 本身，道理完全一樣。

## 結論
`const` 不是常數，是「這個變數不會再指去別的地方」的承諾。原始型別剛好因此變成常數，物件就只是門牌封死、家具照搬。

想要家具也不能動，就請 `Object.freeze` 出馬，~~然後記得它只顧客廳，不顧房間~~。
