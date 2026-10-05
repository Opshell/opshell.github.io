---
title: 'try...catch 還是 then...catch？處理 Promise 的兩種寫法'
image: ''
description: '同一個刪除流程，用 async/await 搭 try...catch 寫一次、用 then...catch 寫一次，比較語法、可讀性與錯誤處理，順便抓出 then 版本「失敗了還是照刪」的隱藏 bug。'
keywords: ''
author: Opshell
createdAt: '2024-10-30'
categories:
  - JavaScript
tags:
  - JavaScript
  - Promise
  - async
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：保留原本兩段程式碼與差異點，補上脈絡、懶人包、then 版本的隱藏 bug 與修正。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
在 處理Promise 的兩種方式比較。

常見的情況是：同一個專案裡，有人寫 `async/await` 搭 `try...catch`，有人寫 `.then().catch()`，兩種混著用，讀的人要一直切換腦袋。這篇拿同一個「確認後刪除文章」的流程各寫一次，比較兩種寫法的差異，寫給還在猶豫要統一成哪一種的人。
:::

## 懶人包
- 兩種寫法都能處理 Promise 的成功與失敗，差在**長相**：`try...catch` 像同步程式，`then...catch` 是方法鏈。
- 有多個要依序等待的非同步步驟，`async/await` + `try...catch` 比較好讀。
- 混用最容易出錯：`then` 版本算出了 `result` 卻沒拿來判斷，失敗了還是照樣往下刪。
- 選哪一種不是重點，**同一個專案統一一種**、每條失敗路徑都有 `return` 才是重點。

## 技術拆解

### try... catch...
第一種是使用 try catch 處理
```ts
async function deleteHandeler() {
    if (relayData.value[index].article_id !== 0) {
        const confirmed = await proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true);
        if (!confirmed) { return; }

        try {
            const res = await sendRequest(`/api/article/${articleId.value}`, 'DELETE');
            const notifyType = res?.status ? 'success' : 'error';
            const notifyData = {
                duration: res?.status ? 2000 : 0,
                showCloseBtn: !res?.status
            };

            proxy.$notify(notifyType, '結果！', res?.msg, notifyData.duration, notifyData.showCloseBtn);

            if (!res?.status) { return; }
        } catch (err) {
            console.error('Self Error：', err);
            proxy.$notify('error', '結果！', '未知錯誤!!', 3000);
            return;
        }
    }

    relayData.value.splice(index, 1);
    nextTick(() => swiperInstance.value?.update());
}
```

### then... catch...
第二種是使用 then catch 處理
```ts
async function deleteHandeler() {
    if (relayData.value[index].article_id !== 0) {
        const confirmed = await proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true);
        if (!confirmed) { return; }

        const result = await sendRequest(`/api/orders/${orderId.value}`, 'DELETE')
            .then((res) => {
                const notifyType = res?.status ? 'success' : 'error';
                const notifyData = {
                    duration: res?.status ? 2000 : 0,
                    showClose: !res?.status
                };

                proxy.$notify(notifyType, '結果！', res?.msg, notifyData.duration, notifyData.showClose);

                if (!res?.status) { return false; }
                return true;
            }).catch((err) => {
                console.error('Self Error：', err);
                proxy.$notify('error', '結果！', '未知錯誤!!', 3000);

                return false;
            });
    }

    relayData.value.splice(index, 1);
    nextTick(() => swiperInstance.value?.update());
}
```

### 差異點
1. 語法結構：

- then 和 catch 是基於 Promise 的方法鏈，適合處理簡單的異步操作。
- try...catch 結合 async/await，使異步代碼看起來更像同步代碼，更易於閱讀和維護。
2. 可讀性：

- async/await 和 try...catch 通常被認為更具可讀性，特別是當有多個異步操作需要順序執行時。
- then 和 catch 方法鏈在處理多個異步操作時可能會變得複雜和難以閱讀。
3. 錯誤處理：

- 在 then 和 catch 中，錯誤處理是通過 catch 方法來實現的。
- 在 try...catch 中，錯誤處理是通過 catch 塊來實現的，這使得錯誤處理邏輯更集中。

### then 版本藏了一個 bug
仔細看 `then` 版本：`.then()` 失敗時回傳 `false`、`.catch()` 也回傳 `false`，結果存進了 `result`，但**後面沒有任何地方用到 `result`**。所以不管 API 成功或失敗，程式都會走到最下面的 `relayData.value.splice(index, 1)`，畫面上的資料照刪不誤，後端的卻還在。

`try...catch` 版本沒有這個問題，因為每條失敗的路徑都直接 `return` 了。這就是兩種寫法混用時最常見的坑：-|`then` 裡的 `return` 只是結束那個 callback，不會結束外面的函式|-。

## 例子與對比

### 修正 then 版本
把結果拿來判斷就好：

```ts
async function deleteHandeler() {
    if (relayData.value[index].article_id !== 0) {
        const confirmed = await proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true);
        if (!confirmed) { return; }

        const result = await sendRequest(`/api/orders/${orderId.value}`, 'DELETE')
            .then((res) => {
                // ...同上
                return Boolean(res?.status);
            })
            .catch((err) => {
                console.error('Self Error：', err);
                proxy.$notify('error', '結果！', '未知錯誤!!', 3000);
                return false;
            });

        if (!result) { return; } // 關鍵：失敗就不要往下刪
    }

    relayData.value.splice(index, 1);
    nextTick(() => swiperInstance.value?.update());
}
```

### 兩種寫法一張表

| 比較 | `async/await` + `try...catch` | `then...catch` |
|---|---|---|
| 長相 | 像同步程式，由上往下讀 | 方法鏈，一段接一段 |
| 多個依序的步驟 | 一行一個 `await`，很直覺 | 要記得每一段都 `return` 下一個 Promise |
| 失敗時中止外層函式 | `catch` 裡 `return` 就結束 | `then`／`catch` 裡的 `return` 只結束 callback |
| 錯誤處理範圍 | `try` 區塊裡的同步錯誤也一起接 | 只接鏈上的錯誤 |
| 適合 | 大部分的商業邏輯 | 簡單的一次性呼叫、需要回傳 Promise 給別人時 |

## 結論
選擇使用 then 和 catch 還是 try...catch 主要取決於你的代碼風格和具體需求。對於簡單的異步操作，then 和 catch 可能已經足夠；但對於更複雜的異步邏輯，async/await 和 try...catch 可能會使代碼更易於理解和維護。

我的建議是：同一個專案統一一種，而且失敗的路徑一定要確認有 `return`，不然 API 說不要刪，畫面還是幫你刪了，~~使用者還以為自己手很快~~。
