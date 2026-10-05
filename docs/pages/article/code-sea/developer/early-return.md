---
title: 'Early Return：把巢狀的 then 拉平，順便小心收尾邏輯'
image: ''
description: '用一段實際的刪除流程，示範怎麼用 async/await 加 early return，把旗標變數和層層 then 拉成一條直線，以及 early return 最容易漏掉的「收尾程式碼被跳過」。'
keywords: ''
author: Opshell
createdAt: '2024-10-17'
categories:
  - Developer
tags:
  - JavaScript
  - TypeScript
  - 可讀性
  - 重構
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的重構前後兩段程式碼寫成全文，另外指出重構後收尾邏輯的行為差異並補上修正版。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：一個「刪除」按鈕，要先跳確認視窗、再打 API、成功了才把畫面上的資料拿掉，失敗要顯示錯誤。用 `.then()` 一層一層接下去，再加一個旗標變數記錄「到底要不要刪」，程式碼就開始往右邊長。這篇用一段實際的程式碼示範怎麼用 early return 把它拉平。
:::

## 懶人包
- Early return（提早返回）：不符合條件就先 `return`，讓主要流程不用包在 `if` 裡面。
- 搭配 `async`／`await`，可以把巢狀的 `.then()` 和旗標變數一起拿掉。
- 重構後要檢查一件事：**原本「不管怎樣都會執行」的收尾程式碼，有沒有被提早的 `return` 跳過**。
- 收尾邏輯放進 `try...finally`，就能同時享受 early return 又不漏掉收尾。

## 技術拆解

### 重構前：旗標變數加上層層 then
```ts
let shouldDeleteFlag = false;

if (relayData.value[index].surgery_id !== 0) {
    await proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true).then(async (flag) => {
        if (!flag) { return; }

        await sendRequest(`/api/surgery/clinic/${surgeryId.value}`, 'DELETE').then((res) => {
            // [-]狀態通知
            const notifyType = res?.status ? 'success' : 'error';
            const notifyData = {
                duration: res?.status ? 2000 : 0,
                showClose: !res?.status
            };

            proxy.$notify(notifyType, '結果！', res?.msg, notifyData.duration, notifyData.showClose);

            if (!res?.status) { return false; }

            shouldDeleteFlag = true;
        }).catch((err) => {
            console.error('Self Error：', err);

            proxy.$notify('error', '結果！', '未知錯誤!!', 3000);
        });
    });
} else {
    shouldDeleteFlag = true;
}

console.log('shouldDeleteFlag：', shouldDeleteFlag);
if (shouldDeleteFlag) {
    console.log('deleteOrCancelHandel -> index', index);
    relayData.value.splice(index, 1);

    nextTick(() => {
        console.log('update');
        swiperInstance.value?.update();
    });
}

outpatientSurgeryModel.value = 'view';
```

這段程式碼能動，但讀起來很累，原因有三個：

1. **`return` 只跳出 callback**：`.then()` 裡面的 `return` 只結束那個箭頭函式，外面的流程照樣往下跑，所以才需要 `shouldDeleteFlag` 這個旗標把結果「傳出去」。
2. **狀態散在各處**：要知道「最後會不會刪」，得追 `shouldDeleteFlag` 在三個地方被改了什麼。
3. **`await` 加 `.then()` 混著用**：兩種寫法混在一起，讀的人要一直切換腦袋。

這就像去餐廳點餐，服務生不直接告訴你「這道賣完了」，而是在你的單子上偷偷畫個記號，等你吃完才說「喔對了，剛剛那道沒有」。

### 重構後：一條直線讀到底
```ts
if (relayData.value[index].surgery_id !== 0) {
    const confirmed = await proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true);
    if (!confirmed) return;

    try {
        const res = await sendRequest(`/api/surgery/clinic/${surgeryId.value}`, 'DELETE');
        const notifyType = res?.status ? 'success' : 'error';
        const notifyData = {
            duration: res?.status ? 2000 : 0,
            showClose: !res?.status
        };

        proxy.$notify(notifyType, '結果！', res?.msg, notifyData.duration, notifyData.showClose);

        if (!res?.status) return;
    } catch (err) {
        console.error('Self Error：', err);
        proxy.$notify('error', '結果！', '未知錯誤!!', 3000);
        return;
    }
}

relayData.value.splice(index, 1);
nextTick(() => swiperInstance.value?.update());
outpatientSurgeryModel.value = 'view';
```

旗標不見了，每一個「不用繼續」的情況都在發生的當下直接 `return`。讀的人只要從上往下看：沒確認就結束、API 失敗就結束、出錯就結束，**能走到最下面的就是要刪的**。

### 小心：收尾邏輯被跳過了
仔細比對兩段程式碼，會發現一個行為差異：

- 重構前：不管使用者有沒有確認、API 有沒有成功，最後一行 `outpatientSurgeryModel.value = 'view'` **一定會執行**。
- 重構後：使用者按取消、API 失敗、出錯，都會提早 `return`，**那一行就被跳過了**。

如果「切回檢視模式」本來就應該在每一種情況都發生，重構後就多了一個 Bug ~~（而且是那種測試時剛好都按確定，所以沒發現的 Bug）~~。

這是 early return 最常見的陷阱：提早離開很爽，但要記得有沒有東西「本來在出口等你」。

## 例子與對比

### 修正版：收尾交給 finally
把整段包成一個函式，收尾放進 `finally`，不管從哪個 `return` 離開都會執行：

```ts
async function deleteOrCancelHandler(index: number): Promise<void> {
    try {
        if (relayData.value[index].surgery_id !== 0) {
            const confirmed = await proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true);
            if (!confirmed) { return; }

            const isDeleted = await deleteSurgery(surgeryId.value);
            if (!isDeleted) { return; }
        }

        relayData.value.splice(index, 1);
        nextTick(() => swiperInstance.value?.update());
    } finally {
        // 不管刪除成功、取消或失敗，都切回檢視模式
        outpatientSurgeryModel.value = 'view';
    }
}

async function deleteSurgery(id: number): Promise<boolean> {
    try {
        const res = await sendRequest(`/api/surgery/clinic/${id}`, 'DELETE');

        proxy.$notify(
            res?.status ? 'success' : 'error',
            '結果！',
            res?.msg,
            res?.status ? 2000 : 0,
            !res?.status
        );

        return Boolean(res?.status);
    } catch (err) {
        console.error('Self Error：', err);
        proxy.$notify('error', '結果！', '未知錯誤!!', 3000);

        return false;
    }
}
```

順手把「打 API + 通知」抽成 `deleteSurgery`，主流程就只剩下「確認 → 刪除 → 更新畫面」三件事，一眼就看完。

### 三個版本比一比

| | 旗標 + then | early return | early return + finally |
| :--- | :--- | :--- | :--- |
| 縮排深度 | 4 層 | 2 層 | 2 層 |
| 狀態追蹤 | 要追旗標在哪裡被改 | 不用 | 不用 |
| 收尾邏輯 | 一定執行 | 可能被跳過 | 一定執行 |
| 讀起來 | 跳來跳去 | 一條直線 | 一條直線 |

## 結論
Early return 的精神很簡單：**不行就早點說**，不要把壞消息藏到最後。搭配 `async`／`await`，巢狀的 `.then()` 和旗標變數都可以一起丟掉。

只是提早離場之前，記得回頭看看門口有沒有人在等你收尾，交給 `finally` 就不會忘了。
