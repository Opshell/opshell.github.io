---
title: 'forEach 錦囊：邊跑邊刪會漏、配 await 不會等'
image: ''
description: '在 forEach 裡 splice 刪元素，會有元素被跳過；在 forEach 裡 await，外面根本不會等。整理這兩個坑的原因，以及倒著跑的 for、filter、for...of、Promise.all 這些替代做法。'
keywords: ''
author: Opshell
createdAt: '2025-06-09'
categories:
  - JavaScript
tags:
  - JavaScript
  - array
  - async
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的筆記整理成全文（邊刪邊跑、搭配 await 兩個坑），補了 filter、Promise.all 的對比。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`forEach` 很順手，順手到常常忘了它其實有脾氣。這篇收了兩個在 `forEach` 裡踩過的坑：一個是在迴圈裡刪陣列元素，有元素會被跳過；一個是在迴圈裡 `await`，外面根本沒在等。

寫給會用 `forEach`、但還沒被它咬過的人。~~被咬過的應該已經在看了~~
:::

## 懶人包
- 在 `forEach` 裡 `splice` 刪元素，後面的元素會往前補位，但索引照樣往前走，**緊接在被刪元素後面的那個會被跳過**。
- 要邊跑邊刪，就**從後往前**跑 `for` 迴圈；或乾脆用 `filter` 產生新陣列。
- `forEach` 不會等 callback 裡的 `await`，外面的程式會直接往下跑。
- 要依序等，改用 `for...of` 搭配 `await`；要一起跑、全部完成再繼續，用 `Promise.all`。

## 技術拆解

### 坑一：邊跑邊刪，有人被跳過
原本的情況是：有 1、2 加到 5 個標記，清除的時候，第 4 個會被跳過。

```ts
markList.value.forEach((mark) => {
    console.log('mark', mark.id, mark.order);
    if (mark.id === 0) {
        markList.value.splice(markList.value.indexOf(mark), 1);
    }
});
```

原因是 `forEach` 內部其實就是一個「索引從 0 往上加」的迴圈，而 `splice` 會讓陣列當場變短、後面的元素全部往前補一格：

1. 跑到索引 `i`，這個元素符合條件，被刪掉。
2. 原本在 `i + 1` 的元素往前補到 `i`。
3. `forEach` 下一圈跑 `i + 1`，**剛剛補上來的那個元素就被跳過了**。

陣列越跑越短、索引卻照樣往前走，兩邊不同步，最後還會提早結束。用排隊比喻：隊伍裡有人離開，後面的人往前一步，但點名的人照樣往下一個位置點，剛好站上來的那個人就沒被點到。

### 解法：從後面往前跑
```ts
for (let i = markList.value.length - 1; i >= 0; i--) {
    const mark = markList.value[i];
    console.log('mark', mark.id, mark.order);
    if (mark.id === 0) {
        markList.value.splice(i, 1);
    }
}
```

從後往前跑的時候，刪掉一個元素只會影響**已經跑過的**後半段，前面還沒跑到的元素索引完全不變，所以不會跳過任何人。

### 坑二：forEach 不會等 await
```ts
async function saveAll(items: Item[]) {
    items.forEach(async (item) => {
        await api.save(item);
    });

    console.log('全部存好了'); // 騙人，一個都還沒存完
}
```

`forEach` 只負責「呼叫 callback」，callback 回傳什麼它完全不理，就算回傳的是 `Promise` 也一樣。所以每個 `async` callback 都只是被啟動，`forEach` 自己馬上就結束了，`saveAll` 也跟著往下跑。更麻煩的是，裡面任何一個失敗，外面的 `try...catch` 也接不到。

-|你需要將 forEach 迴圈改為 for...of 迴圈並加上 await，因為 forEach 不能與 await 一起使用。|-

## 例子與對比

### 刪除：三種寫法

```ts
const list = [{ id: 1 }, { id: 0 }, { id: 0 }, { id: 2 }];

// 錯誤示範 forEach + splice：結果是 [{ id: 1 }, { id: 0 }, { id: 2 }]，有一個 0 沒刪到
list.forEach((item) => {
    if (item.id === 0) {
        list.splice(list.indexOf(item), 1);
    }
});
```

| 做法 | 改原陣列 | 適合 |
|---|---|---|
| 倒著跑的 `for` + `splice` | 是 | 一定要保留同一個陣列參考的時候 |
| `filter` | 否，產生新陣列 | 大部分情況，最好讀 |
| `forEach` + `splice` | 是 | 不適合，會漏 |

在 Vue 裡，`markList.value = markList.value.filter((mark) => mark.id !== 0)` 直接換掉整個陣列，響應式一樣會更新，通常是最乾淨的寫法；只有在別的地方握著同一個陣列參考、不能換掉的時候，才需要倒著跑的 `for`。

### await：依序跑還是一起跑

```ts
// 依序：存完一個才存下一個，順序有保證，但總時間是加總
async function saveInOrder(items: Item[]) {
    for (const item of items) {
        await api.save(item);
    }
    console.log('全部存好了'); // 這次是真的
}

// 一起跑：同時送出，全部完成才往下，總時間約等於最慢的那一個
async function saveTogether(items: Item[]) {
    await Promise.all(items.map((item) => api.save(item)));
    console.log('全部存好了');
}

// 一起跑，但有人失敗也要知道其他人的結果
async function saveAndReport(items: Item[]) {
    const results = await Promise.allSettled(items.map((item) => api.save(item)));
    const failed = results.filter((result) => result.status === 'rejected');
    console.log(`失敗 ${failed.length} 筆`);
}
```

| 需求 | 寫法 |
|---|---|
| 後一個要用前一個的結果、或後端怕被同時打 | `for...of` + `await` |
| 彼此無關，想快 | `Promise.all` |
| 彼此無關，而且要知道每一筆成功或失敗 | `Promise.allSettled` |
| 一定要用 `forEach` | 沒有，換掉吧 |

### 順便一提：forEach 也停不下來
`forEach` 裡的 `return` 只是結束這一圈，沒有 `break` 可以用。要「找到就停」，用 `for...of` 搭 `break`，或是 `some`、`find` 這類一找到就收工的方法。

## 結論
`forEach` 是個好用的老實人：每一圈都跑、不回頭、不等人。所以要邊跑邊刪就倒著跑或改用 `filter`，要等非同步就換 `for...of` 或 `Promise.all`。

選對迴圈，就不用在 console 裡數「咦，怎麼少了一個」。
