---
title: 為什麼要寫測試：不是為了老闆，是為了接手的人
image: ''
description: '測試不只是抓 bug：它讓接手的人知道自己有沒有改壞東西、逼程式碼長得更單純，還是一份永遠不會過期的說明文件。整理寫測試的三個目的，附上 Vitest 範例。'
keywords: ''
author: Opshell
createdAt: '2024-10-07'
categories:
  - vue
tags:
  - 測試
  - vitest
  - 單元測試
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：保留原本三個目的的筆記，補上脈絡、懶人包、範例與結論。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
「寫測試」常常被當成額外的工作：功能都做完了，還要再寫一份程式來證明它是對的？常見的情況是，等到接手一個沒有測試的專案，改一行不知道會壞哪裡，才開始懂測試的價值。

這篇整理寫測試的目的，參考的是 [這支影片](https://www.youtube.com/watch?v=OIpfWTThrK8)，寫給還在說服自己（或說服團隊）要不要開始寫測試的人。工具怎麼裝見 [在 Vue + Vite 專案裝好 Vitest](./vitest)；方法論的吐槽見 [TDD 在台灣行得通嗎](./what%20test)。
:::

## 懶人包
- **維護穩定性**：改了程式碼，跑一次測試就知道有沒有把既有功能弄壞，接手的人最需要這個。
- **提高程式碼品質**：難寫測試的程式，通常就是職責太多、耦合太高的程式。
- **活的說明文件**：測試寫出了使用方式、輸入輸出、邊界情況，而且只要測試會過，它就不會過期。
- 測試不是為了證明你沒寫錯，而是讓下一個人（包括三個月後的你）敢改。

## 技術拆解

### 測試的目的

#### 維護龐大系統的穩定性
當我是新接手人員的時候，有了測試，我可以知道我新撰寫的程式碼有沒有對現有功能造成破壞，或產生未預見的影響。

系統越大，「改這裡會不會壞那裡」就越難靠腦袋記。測試把這些記憶寫成可以執行的檢查，改完跑一次，紅燈就是在告訴你：這裡有你不知道的依賴。

#### 提高程式碼品質
好的測試程式可以讓邏輯更遵循 `單一職責原則`，並在寫測試時釐清程式的核心功能，確保低耦合。

道理很簡單：一個函式如果又打 API、又改 DOM、又算金額，你根本不知道要從哪裡測起。為了好測，你自然會把「算金額」拆成一個純函式，這就是測試反過來推著設計變好。

#### 說明文件
好的測試程式可以當成說明文件來看待：使用方式、核心邏輯、輸入及輸出格式等。

`README` 會過期、註解會說謊，但測試只要還會過，就代表它描述的行為是真的。想知道一個函式遇到空陣列會怎樣？去看測試，比翻原始碼快。

## 例子與對比

### 難測的寫法
邏輯、API、狀態全部攪在一起：

```ts
async function checkout() {
    const { data } = await axios.get('/api/cart');
    let total = 0;
    for (const item of data.items) {
        total += item.price * item.quantity;
    }
    if (data.coupon === 'VIP') {
        total = total * 0.9;
    }
    totalText.value = `NT$ ${Math.round(total)}`;
}
```

要測「VIP 打九折」，得先 mock `axios`、再準備一個 `ref`，測一個乘法要搭一整個舞台。

### 拆開之後
把「算金額」抽成純函式：

```ts
// utils/cart.ts
export type CartItem = { price: number; quantity: number };

export function calcTotal(items: CartItem[], coupon?: string) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return Math.round(coupon === 'VIP' ? subtotal * 0.9 : subtotal);
}
```

測試同時就是說明文件：

```ts
// utils/cart.spec.ts
import { describe, it, expect } from 'vitest';
import { calcTotal } from './cart';

describe('calcTotal', () => {
    it('把每項的單價乘數量加總', () => {
        expect(calcTotal([{ price: 100, quantity: 2 }, { price: 50, quantity: 1 }])).toBe(250);
    });

    it('VIP 折價券打九折並四捨五入', () => {
        expect(calcTotal([{ price: 333, quantity: 1 }], 'VIP')).toBe(300);
    });

    it('空購物車是 0 元', () => {
        expect(calcTotal([])).toBe(0);
    });
});
```

三支測試讀完，不用看實作就知道：它怎麼算、VIP 怎麼折、空的會怎樣。下一個人要改折扣規則，改完跑一次，就知道有沒有把加總弄壞。

| | 沒有測試 | 有測試 |
|---|---|---|
| 接手改程式 | 改一行，祈禱一次 | 改一行，跑一次 |
| 程式碼結構 | 什麼都塞在一起也能動 | 被迫拆成好測的小單元 |
| 想知道怎麼用 | 翻原始碼、問人 | 看測試 |

## 結論
寫測試的成本是現在付的，回報是之後每一次修改都拿得到的。它保護的不只是程式碼，還有接手的人的心臟。

沒有測試的重構，就像沒有安全網的走鋼索，能走過去是本事，掉下去是常態。
