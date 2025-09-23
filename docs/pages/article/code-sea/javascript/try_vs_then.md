---
title: try vs then
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-10-30'
categories: 
tags: 
editLink: true
isPublished: false
---
在 處理Promise 的兩種方式比較

## try... catch...
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

## then... catch...
第一種是使用 then catch 處理
```ts
async function deleteHandeler() {
    if (relayData.value[index].article_id !== 0) {
        const confirmed = await proxy.$notify('warning', '警告！', '確定要刪除嗎？', 0, true);
        if (!confirmed) { return; }

        const result = await sendRequest(`/api/surgery/clinic/${surgeryId.value}`, 'DELETE')
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

## 差異點
1. 語法結構：

- then 和 catch 是基於 Promise 的方法鏈，適合處理簡單的異步操作。
- try...catch 結合 async/await，使異步代碼看起來更像同步代碼，更易於閱讀和維護。
2. 可讀性：

- async/await 和 try...catch 通常被認為更具可讀性，特別是當有多個異步操作需要順序執行時。
- then 和 catch 方法鏈在處理多個異步操作時可能會變得複雜和難以閱讀。
3. 錯誤處理：

- 在 then 和 catch 中，錯誤處理是通過 catch 方法來實現的。
- 在 try...catch 中，錯誤處理是通過 catch 塊來實現的，這使得錯誤處理邏輯更集中。

總結
選擇使用 then 和 catch 還是 try...catch 主要取決於你的代碼風格和具體需求。對於簡單的異步操作，then 和 catch 可能已經足夠；但對於更複雜的異步邏輯，async/await 和 try...catch 可能會使代碼更易於理解和維護。
