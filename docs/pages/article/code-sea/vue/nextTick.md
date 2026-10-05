---
title: 'nextTick 之後還要 setTimeout？聊天室捲到底的那些事'
image: ''
description: 'nextTick 等的是 Vue 把 DOM 更新完，不是瀏覽器把畫面排版完、圖片載完。用聊天室「新訊息捲到底、載入舊訊息維持位置」的例子，看 nextTick 能做到哪、什麼時候還需要別的。'
keywords: ''
author: Opshell
createdAt: '2024-10-08'
categories:
  - Vue
tags:
  - Vue
  - nextTick
  - DOM
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的聊天室捲動程式碼寫成全文，補上原理、改寫版本與結論。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
做聊天室或訊息列表時，常見的需求是：送出訊息後捲到最底；往上載入舊訊息時，畫面要停在原本看的位置，不能跳。很多人第一次寫都會發現「改了資料馬上讀 `scrollHeight`，拿到的是舊的」，查一查學到 `nextTick`，結果有時候還是不準，最後在裡面再包一個 `setTimeout`。這篇把這件事講清楚，寫給在捲動位置上卡關的人。
:::

## 懶人包
- Vue 改資料後不會立刻更新 DOM，而是排進佇列、批次更新；`nextTick` 等的就是這次 DOM 更新完成。
- `nextTick` 之後 DOM 結構是新的，`scrollHeight` 通常就讀得到正確值。
- 但它不等圖片載入、不等 CSS transition、不等 `v-if` 裡的非同步元件；這些情況才需要 `requestAnimationFrame`、圖片 `load` 事件或 `ResizeObserver`。
- `setTimeout(fn, 1)` 能動，但它是在「賭時間夠」，不是在等某件事完成。
- 載入舊訊息維持位置的公式：`新的 scrollHeight - 舊的 scrollHeight`。

## 技術拆解

### Vue 為什麼不馬上更新 DOM
如果你在同一個函式裡改了 10 次資料，Vue 不會傻傻地更新 10 次 DOM。它會把更新排進佇列，等這一輪程式跑完再一次處理。就像洗衣機不會每丟一件衣服就洗一次，而是等你按下開始。

所以：

```ts
msgList.value.push(newMessage);
console.log(msgWrap.value?.scrollHeight); // 還是舊的高度
await nextTick();
console.log(msgWrap.value?.scrollHeight); // 新的高度
```

`nextTick` 回傳一個 Promise，可以 `await`，也可以傳 callback。

### nextTick 管不到的事
`nextTick` 只保證「Vue 已經把 DOM 改好了」，接下來的事它不管：

- **圖片**：訊息裡有圖，圖片還沒載完時高度是 0，載完才撐開。
- **transition**：元素用 `<Transition>` 進場，動畫期間的尺寸還在變。
- **非同步元件**：`v-if` 裡的元件要先下載才渲染。

原本程式碼裡的 `setTimeout(..., 1)`，多半就是在補這個縫：多等一個 macrotask，讓瀏覽器有機會先排版一次。它常常有效，但遇到圖片就不一定了。

## 例子與對比

### 原本的寫法
```ts
nextTick(() => {
    setTimeout(() => {
        const shouldScrollToBottom = sendFlag.value || (tempListHeight.value === 0);
        if (shouldScrollToBottom) {
            conlogHeight('shouldScrollToBottom');
            msgWrap.value?.scrollTo(0, msgWrap.value?.scrollHeight); // 捲動到底部
            sendFlag.value = false;
        } else {
            msgWrap.value?.scrollTo(0, msgWrap.value?.scrollHeight - tempListHeight.value); // 捲動到之前位置
        }

        msgList.value.forEach((item) => {
            if (!item.show) {
                item.show = true;
            }
        });
    }, 1);
});
```

邏輯分兩種情況：自己送出訊息（或第一次載入）就捲到底；載入舊訊息就扣掉原本的高度，停在原本的位置。這個思路是對的。

可以再整理的地方：

1. `nextTick` + `setTimeout` 兩層巢狀，讀起來不知道在等什麼。
2. 最後把 `item.show` 設成 `true`，又會觸發一次 DOM 更新，如果 `show` 會影響高度，剛算好的位置又被打亂。
3. `tempListHeight` 要在**改資料之前**記下來，這段沒看到，容易漏。

### 整理後的寫法
```ts
const msgWrap = ref<HTMLElement | null>(null);

// 自己送出訊息：捲到底
const appendMessage = async (message: Message) => {
    msgList.value.push(message);
    await nextTick();
    scrollToBottom();
};

// 往上載入舊訊息：維持原本看的位置
const prependHistory = async (history: Message[]) => {
    const wrap = msgWrap.value;
    if (!wrap) { return; }

    const previousHeight = wrap.scrollHeight; // 改資料前先記
    msgList.value.unshift(...history);
    await nextTick();

    wrap.scrollTop += wrap.scrollHeight - previousHeight;
};

const scrollToBottom = () => {
    const wrap = msgWrap.value;
    if (!wrap) { return; }

    wrap.scrollTo({ top: wrap.scrollHeight });
};
```

把兩種情況拆成兩個函式，每個都只等 `nextTick`，看得出在等什麼。

### 有圖片的話：等它撐開
```ts
const waitForImages = (container: HTMLElement) => {
    const pending = Array.from(container.querySelectorAll('img'))
        .filter((img) => !img.complete)
        .map((img) => new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
        }));

    return Promise.all(pending);
};

const appendMessage = async (message: Message) => {
    msgList.value.push(message);
    await nextTick();
    if (msgWrap.value) { await waitForImages(msgWrap.value); }
    scrollToBottom();
};
```

更穩的做法是後端回傳圖片寬高，前端先用 `aspect-ratio` 把位置占好，高度從一開始就對，連等都不用等。

| 方式 | 等的是什麼 | 可靠度 |
|---|---|---|
| 直接讀 | 什麼都沒等 | 拿到舊值 |
| `nextTick` | Vue 更新完 DOM | 純文字訊息夠用 |
| `nextTick` + `setTimeout` | 賭一段時間 | 通常可以，圖片會失準 |
| `nextTick` + 圖片 `load` | 圖片撐開 | 準 |
| 預先占位（`aspect-ratio`） | 不用等 | 最準 |

## 結論
`nextTick` 不是萬靈丹，它只答應你一件事：Vue 的 DOM 更新好了。看到自己在 `nextTick` 裡又包 `setTimeout`，先停下來問：我到底在等什麼？把那個「什麼」找出來，直接等它，程式碼就不用靠運氣了。

延伸閱讀：[原本參考的文章](https://juejin.cn/post/7389044903941292073)
