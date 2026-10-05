---
title: 'JavaScript 沒有 enum，那 1、2、3 到底代表什麼？'
image: ''
description: 'if (xxx === 1) 這種魔術數字，過三個月連自己都看不懂。JavaScript 原生沒有 enum，整理幾種替代做法：常數物件、Object.freeze、JSDoc 提示、物件映射取代 if/switch，以及 TypeScript 的選擇。'
keywords: ''
author: Opshell
createdAt: '2024-09-12'
categories:
  - JavaScript
tags:
  - JavaScript
  - TypeScript
  - enum
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把原本群組討論的對話改寫成文章（拿掉對話者名字，保留每個人提出的做法）。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
這篇來自一段社群群組裡的討論。起頭是一個很常見的問題：

```js
if (xxx = 1) { ... } else if (xxx = 2) { ... }
```

用數字當條件，但其他人可能根本不知道 1、2 是什麼。短短十幾分鐘，大家丟出了好幾種解法，從修 bug 到 enum 替代方案都有，整理下來剛好是一篇。寫給還在程式裡到處寫 `=== 1`、`=== 2` 的人。
:::

## 懶人包
- 先修 bug：條件裡的 `=` 是指定不是比較，要用 `===`；`xxx = 1` 這個運算式的值是 `1`，所以永遠成立。
- `1`、`2` 這種沒有名字的數字叫「魔術數字」，三個月後連自己都看不懂。
- JavaScript 原生沒有 enum，替代做法是**常數物件**：key 放名字、value 放數字（或直接用字串）。
- 加上 `Object.freeze` 防止被改，加上 JSDoc 或 TypeScript 的 `as const` 讓編輯器有提示。
- 條件很多層的時候，用**物件映射**取代 if／switch，記得處理找不到的情況。

## 技術拆解

### 先修 bug：= 不是 ===
```js
if (xxx = 1) { ... }
```

這不是比較，是把 `1` 指定給 `xxx`，而整個運算式的結果是 `1`，轉成布林是 `true`，所以這個 if 永遠會進去。順帶 `xxx` 的值也被你改掉了，一次兩個 bug。

比較要用 `===`（嚴格相等）。`==` 會先轉型再比，`'1' == 1` 是 `true`，坑比較多，大部分團隊的 ESLint 規則（`eqeqeq`）會直接擋掉。

### 魔術數字
修好之後還有另一個問題：

```js
if (status === 1) { ... } else if (status === 2) { ... }
```

`1` 是什麼？啟用？審核中？已付款？這種沒有名字、只有作者知道意思的數字，叫做[魔術數字](https://zh.wikipedia.org/wiki/%E9%AD%94%E8%A1%93%E6%95%B8%E5%AD%97_(%E7%A8%8B%E5%BC%8F%E8%A8%AD%E8%A8%88))。就像電視遙控器上的按鈕沒有字，只寫 1 到 9，每次都要猜。

這時候就需要 enum：幫每個值取名字。但很遺憾 JavaScript 原生沒有，於是就有了下面這些替代做法。

## 例子與對比

### 做法一：常數物件
最直覺的做法：設一個物件，key 用名字、value 用數字。

```js
const ORDER_STATUS = {
    PENDING: 1,
    PAID: 2,
    SHIPPED: 3
};

if (status === ORDER_STATUS.PAID) { ... }
```

或者乾脆用字串名字替代數字，值本身就看得懂，log 出來、存進資料庫都好讀：

```js
const ORDER_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    SHIPPED: 'shipped'
};
```

### 做法二：Object.freeze
常數物件的問題是它還是可以被改，`ORDER_STATUS.PAID = 99` 不會有人攔你。用 `Object.freeze` 凍起來：

```js
const SYSTEM_LOCK = Object.freeze({
    ON: true,
    OFF: false
});

if (systemIsLock === SYSTEM_LOCK.ON) { ... }
```

值不一定要是數字，`true`／`false` 也可以，想寫成 `xxx.ENABLE`／`xxx.DISABLE` 就照這個格式寫。物件定義得夠明確，IDE 就抓得到，打 `SYSTEM_LOCK.` 就會跳出選項。

### 做法三：JSDoc，讓純 JavaScript 也有提示
還不能上 TypeScript 的專案，可以直接用物件配合 JSDoc，在 `jsconfig.json` 設定一下（打開 `checkJs`），編輯器就會幫你做型別檢查：

```js
/** @enum {number} */
const ORDER_STATUS = Object.freeze({
    PENDING: 1,
    PAID: 2,
    SHIPPED: 3
});

/**
 * @param {ORDER_STATUS} status
 */
function getLabel(status) { ... }
```

```json
{
    "compilerOptions": {
        "checkJs": true
    }
}
```

### 做法四：物件映射取代 if／switch
條件一多，if／else if 會長成一條長長的梯子，有人會改用 `switch`，但更優雅的做法是物件映射：把「值」對應到「要做的事」。

```js
const handlers = {
    [ORDER_STATUS.PENDING]: () => showPayButton(),
    [ORDER_STATUS.PAID]: () => showShippingInfo(),
    [ORDER_STATUS.SHIPPED]: () => showTracking()
};

const handler = handlers[status];

if (!handler) {
    throw new Error(`未知的訂單狀態：${status}`);
}

handler();
```

記得加上**找不到對應時的錯誤處理**，不然 `handlers[status]()` 遇到沒定義的值就是 `undefined is not a function`。相比 `switch`，物件映射簡潔滿多，新增一種狀態也只是多一行。

### 做法五：TypeScript
用 TypeScript 的話，原生就有 `enum`，也可以用 `as const` 物件：

```ts
const ORDER_STATUS = {
    PENDING: 1,
    PAID: 2,
    SHIPPED: 3
} as const;

type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]; // 1 | 2 | 3

function getLabel(status: OrderStatus) { ... }

getLabel(ORDER_STATUS.PAID); // OK
getLabel(4);                 // 編譯錯誤
```

TypeScript 5.8 之後有個 `erasableSyntaxOnly` 選項，會擋掉 `enum` 這類「編譯後會產生程式碼」的語法，因為 Node 直接執行 TypeScript 的模式不支援它。新專案越來越多人改用 `as const` 物件，詳細的 enum 用法可以看 [Enum 使用實例](../typescript/enum)。

### 一張表整理

| 做法 | 有名字 | 防竄改 | 編輯器提示 | 型別檢查 |
|---|---|---|---|---|
| 魔術數字 | 否 | – | 否 | 否 |
| 常數物件 | 是 | 否 | 是 | 否 |
| `Object.freeze` | 是 | 是（執行時） | 是 | 否 |
| JSDoc `@enum` + `checkJs` | 是 | 看有沒有 freeze | 是 | 是 |
| TypeScript `as const` | 是 | 編譯時 | 是 | 是 |

## 結論
起點只是一個 `=` 打成 `===` 的小 bug，背後真正的問題是**數字沒有名字**。JavaScript 沒有 enum，但一個凍起來的常數物件就能解決九成的情況，再配上 JSDoc 或 TypeScript，連打錯都會被編輯器抓出來。

遙控器的按鈕，還是要寫字比較好。
