---
title: Enum 使用實例 Part.2：用策略模式處理 number-precision 精度
author: Opshell
createdAt: '2024-08-10'
categories:
  - 使用實例
tags:
  - TypeScript
  - composable
  - 策略模式
editLink: true
isPublished: false
image: ''
description: '上一篇用 enum + 策略模式處理快捷鍵，這篇把同一招用在數值精度：一張策略表管無條件捨去與四捨五入，包成 composable 隨處取用。順便踩一個 number-precision 的坑：strip 不是無條件捨去。'
keywords: ''
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的 composable 寫成全文，修掉程式碼裡的錯字與語法錯誤，並指出 `strip` 是「有效位數」不是「無條件捨去」，改用 `times` / `divide` 實作 floor（已實際跑過）。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
[Enum 使用實例](./enum) 裡提到，快捷鍵這種「一個 key 對應一個動作」的需求，很適合用策略模式 + `enum` 來寫。這篇是同一個思路的第二個例子：金額、數量、百分比這些數字，有的要無條件捨去、有的要四捨五入、小數位數還不一樣，常見的情況是專案裡到處散落著 `Math.floor(x * 100) / 100`。寫給想把這些散落的處理收成一個地方的人。
:::

## 懶人包
- 策略模式的核心是一張「名字 → 做法」的對照表，呼叫端只要說要哪一種，不用管怎麼做。
- 這次的 key 用字串聯集 `'floor' | 'round'` 而不是 `enum`，呼叫時直接傳 `'round'` 就好；表用 `satisfies` 確保每種策略都有實作。
- `number-precision` 的 `strip` 是修正浮點誤差、取「有效位數」，不是無條件捨去，拿來當 floor 會出錯。
- 無條件捨去要先用 `times` 放大、`Math.floor`、再用 `divide` 縮回去，才不會被 `0.29 * 100 = 28.999…` 坑到。
- 包成 composable 之後，`useNumberPrecision(4)` 就能拿到一組四位小數的處理函式。

## 技術拆解

### 第一版：優雅的 TS 策略模式
原本的想法是這樣：用一個物件把兩種捨入方式存起來，再用一個通用函式依照策略名稱去查表。

```ts
import { round, strip } from 'number-precision';

type RoundingStrategy = 'floor' | 'round';

export const useNumberPrecision =  (defaultPrecision: number = 2) => {
    // 數值處理策略
    const precisionStrategics = {
        floor: (value: number, precision: number) => strip(value, precision),
        round: (value: number, precision: number) => round(value, precision)
    } as const;

    /**
     * 通用的數值處理函式
     * @param value 要處理的數值
     * @param strategy 捨入策略
     * @param precision 小數位數
     */
    const numberPrecisionHandler = (
        value: number | undefined | string,
        strategy: RoundingStrategy = 'floor',
        precision = defaultPrecision
    ): number => {
        // 處理各種輸入情況
        const numValue = typeof value === 'string' ? Number(value) : value;
        if (numValue === undefined || isNaN(numValue)) return 0;

        return precisionStrategies[strategy](numValue, precision);
    }

    const floorHandler (value: numbber | undefined | string) => numberPrecisionHandler(value, 'floor');

    const roundHandler (value: numbber | undefined | string) => numberPrecisionHandler(value, 'round');

    return {
        numberPrecisionHandler,
        floorHandler,
        roundHandler
    }
}
```

架構是對的：`precisionStrategies` 是策略表，`numberPrecisionHandler` 是查表的人，`floorHandler`、`roundHandler` 是幫常用組合取好名字的捷徑。但這段在跑起來之前，有幾個地方要先修：

1. `precisionStrategics` 跟 `precisionStrategies` 拼字不一致，查表會找不到人。
2. `numbber` 多了一個 b。
3. `const floorHandler (value...) =>` 少了 `=`，這是語法錯誤。
4. `isNaN()` 會先偷偷轉型，換成 `Number.isNaN()` 比較誠實（這裡前面已經轉過數字，結果一樣，但養成習慣比較好）。

前三個是手滑，第四個是習慣。真正的坑在下一段。

### strip 不是無條件捨去
`number-precision` 的 `strip(num, precision)` 是用來修正浮點誤差的，它的 `precision` 指的是-|有效位數|-，不是小數位數：

```ts
strip(0.09999999999999998); // 0.1，這才是它的本業
strip(1.23456, 2); // 1.2，有效位數 2 位，不是小數 2 位
round(1.23456, 2); // 1.23，round 的第二個參數才是小數位數
```

所以第一版的 `floor` 策略其實是「取兩位有效數字」，`floorHandler(123.456)` 會得到 `120`。~~這種 bug 最可怕的地方是，測試資料剛好都小於 10 的時候它看起來很正常。~~

### 自己寫 floor：放大、捨去、縮回
直覺的寫法是 `Math.floor(value * 100) / 100`，但浮點數會在乘法這一步就出事：

```ts
0.29 * 100; // 28.999999999999996
Math.floor(0.29 * 100) / 100; // 0.28，少了一分錢
```

`number-precision` 的 `times` 和 `divide` 就是為了這個存在的，用它們做放大與縮回：

```ts
const base = 10 ** precision;
divide(Math.floor(times(value, base)), base); // 0.29 → 0.29
```

### 為什麼這次不用 enum
[上一篇](./enum) 的快捷鍵用 `enum Key`，因為 `event.key` 的值（`'ArrowUp'`）跟我們想在程式裡叫它的名字（`Key.UP`）不一樣，`enum` 剛好負責翻譯。

這次的策略名稱 `'floor'`、`'round'` 本身就是好名字，不需要翻譯。用字串聯集，呼叫端直接寫 `numberPrecisionHandler(price, 'round')`，不用先 import 一個 `enum`。策略表再用 `satisfies Record<RoundingStrategy, ...>` 約束，聯集多一種策略、表上沒補實作，編譯器就會擋下來，`enum` 的好處一樣拿得到。

## 例子與對比

### 修正版
```ts
import { divide, round, times } from 'number-precision';

type RoundingStrategy = 'floor' | 'round';
type NumberInput = number | string | undefined;

export const useNumberPrecision = (defaultPrecision = 2) => {
    // 數值處理策略：新增一種捨入方式，只要在這裡多一行
    const precisionStrategies = {
        floor: (value: number, precision: number) => {
            const base = 10 ** precision;
            return divide(Math.floor(times(value, base)), base);
        },
        round: (value: number, precision: number) => round(value, precision)
    } satisfies Record<RoundingStrategy, (value: number, precision: number) => number>;

    /**
     * 通用的數值處理函式
     * @param value 要處理的數值，字串會先轉成數字，無效值回傳 0
     * @param strategy 捨入策略
     * @param precision 小數位數
     */
    const numberPrecisionHandler = (
        value: NumberInput,
        strategy: RoundingStrategy = 'floor',
        precision = defaultPrecision
    ): number => {
        const numValue = typeof value === 'string' ? Number(value) : value;
        if (numValue === undefined || Number.isNaN(numValue)) { return 0; }

        return precisionStrategies[strategy](numValue, precision);
    };

    const floorHandler = (value: NumberInput) => numberPrecisionHandler(value, 'floor');
    const roundHandler = (value: NumberInput) => numberPrecisionHandler(value, 'round');

    return {
        numberPrecisionHandler,
        floorHandler,
        roundHandler
    };
};
```

### 用起來
```ts
const { floorHandler, roundHandler } = useNumberPrecision();

floorHandler(0.29); // 0.29（Math.floor 版本是 0.28）
floorHandler('2.675'); // 2.67
roundHandler(2.675); // 2.68（toFixed(2) 會給你 '2.67'）
floorHandler(undefined); // 0
floorHandler('abc'); // 0
```

需要指定位數的地方，就在建立的時候給參數，再用解構幫它取個有意義的名字：

```ts
const { floorHandler: parseSomeEventTo4 } = useNumberPrecision(4);
const { floorHandler: parseSomeEventTo6 } = useNumberPrecision(6);

parseSomeEventTo4(3.1415926); // 3.1415
```

### 散落寫法 vs 策略表

| | 到處 `Math.floor(x * 100) / 100` | 策略表 composable |
| :--- | :--- | :--- |
| 浮點誤差 | 每個地方都可能少一分錢 | 在一個地方處理掉 |
| 改規則（例如改成四捨五入） | 全專案搜尋取代 | 換一個策略名稱 |
| 新增捨入方式（例如無條件進位） | 再複製一種寫法 | 表上加一行 `ceil` |
| 無效輸入 | 得到 `NaN` 一路往下傳 | 統一回傳 `0` |

::: tip
`Math.floor` 對負數是往更小的方向走：`floorHandler(-1.234)` 會得到 `-1.24`。如果你要的是「直接砍掉多的位數」，策略表加一個用 `Math.trunc` 的 `truncate` 就好，這正是策略模式好擴充的地方。
:::

要套在模板上自動處理，弄成 directive 也可以就是了，核心一樣是呼叫這張策略表。

## 結論
策略模式說穿了就是「把 if/else 換成查表」，`enum` 只是其中一種寫 key 的方式，不是必要條件。key 本身就是好名字的時候，字串聯集 + `satisfies` 更輕巧。

至於數字精度，記得一句話：-|浮點數的世界裡，乘以 100 不一定會變成你想的那個數|-。把它關進一個 composable 裡，總比讓每個工程師各自去跟 IEEE 754 搏鬥好。
