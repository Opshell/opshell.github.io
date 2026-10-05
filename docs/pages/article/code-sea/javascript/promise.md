---
title: 'Promise 鏈的錯誤去哪了？忘了 return 的那個 then'
image: ''
description: '在 then 裡面呼叫另一個 Promise 卻沒有 return，外面的 catch 就接不到它丟出的錯誤，loading 也永遠轉不停。用一段登入流程說明 Promise 鏈怎麼傳遞錯誤，以及攤平與 async/await 的改法。'
keywords: ''
author: Opshell
createdAt: '2024-09-25'
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
Claude 於 2026-10-05 補完：以原本的登入流程程式碼為例，寫成 Promise 鏈錯誤傳遞的說明，補了修正版與 async/await 版。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
登入流程是 Promise 鏈最常見的場景：先送帳密拿 token，再用 token 拿使用者資料，任何一步出錯都要跳通知。看起來 `then` 接 `then` 最後一個 `catch` 就搞定了，但只要中間少寫一個 `return`，錯誤就會從縫隙溜走。

這篇用一段登入的程式碼當例子，搭配[這篇講 Promise 流程與錯誤處理的教學](https://eyesofkids.gitbooks.io/javascript-start-es6-promise/content/contents/ch5_flow_n_error.html)的觀念，寫給已經會用 `then`、但還不確定錯誤會怎麼傳的人。
:::

## 懶人包
- `then` 裡面 `throw`，錯誤會往下傳，跳過中間的 `then`，直到遇到 `catch`。
- `then` 裡面呼叫另一個 Promise，**一定要 `return` 它**，外面的鏈才會等它、才接得到它的錯誤。
- 沒 `return` 的話，裡面的錯誤會變成「未處理的 rejection」，`catch` 不會跑，loading 會轉到天荒地老。
- 有先後順序的請求，把鏈攤平（每個 `then` 回傳下一個 Promise），或乾脆改用 `async/await`。

## 技術拆解

### Promise 鏈怎麼傳錯誤
把 Promise 鏈想成一條生產線，每個 `then` 是一個工作站，`catch` 是最後的品管站：

- 某一站 `throw` 了，或回傳了一個失敗的 Promise，這個瑕疵品會**直接被送到下一個品管站**，中間的工作站全部跳過。
- 某一站回傳一個 Promise，生產線會**停下來等它**完成，再把結果交給下一站。
- 某一站「自己另外開了一條生產線」卻沒告訴主線（沒 `return`），主線會直接往下走，那條支線出的問題，主線的品管站完全不知道。

### 原本的程式碼
```ts
sendRequest(url, 'POST', loginForm).then((auth) => { // Token 處理
    if (!auth)
        throw new Error('登入異常！, 網路錯誤！！');

    // if (!auth.status) {
    //     LoginErrorHandler('登入失敗！', auth.msg);
    //     return false;
    // }

    if (!auth.access_token)
        throw new Error('登入失敗！, Token 缺失！！');

    userStore.setToken(auth.access_token);
}).then(() => { // 取得使用者資料
    sendRequest('/api/user').then((res) => {
        if (!res)
            throw new Error('資料取得異常！, 網路錯誤！！');

        if (!res.status)
            throw new Error(`取得使用者資料失敗！, ${res.msg}`);

        userStore.signIn(res.data);

        // 導向來源 或者 首頁
        const redirect = route.redirectedFrom?.fullPath || '/';
        router.push({ path: redirect });
    });
}).catch((error) => {
    const [title, message] = error.message.split(', ');

    proxy.$notify('error', title, message).then(() => {
        isLoging.value = false;
    });
});
```

第一段處理 token 的部分沒問題：沒有 `auth` 或沒有 `access_token` 就 `throw`，錯誤會直接跳到最後的 `catch`，跳出通知。

問題在第二個 `then`：裡面的 `sendRequest('/api/user')` 沒有被 `return`。所以：

1. 第二個 `then` 啟動了請求，但自己馬上回傳 `undefined`，主線認為「這站做完了」。
2. 主線沒有錯誤，`catch` 不會執行。
3. 稍後 `/api/user` 回來，如果 `res.status` 是失敗，裡面 `throw` 的錯誤**沒有任何人接**，只會在 console 看到 `Uncaught (in promise)`。
4. 使用者看不到任何通知，`isLoging` 也不會被設回 `false`，登入按鈕就一直轉。

### 錯誤訊息的小技巧
原本的寫法用 `'標題, 內容'` 的格式塞進 `Error` 的訊息，`catch` 裡再用 `split(', ')` 拆成通知的標題和內容，一個 `catch` 就能處理所有步驟的錯誤，滿聰明的。要注意的是，如果後端回來的 `res.msg` 本身就有 `', '`，內容會被拆斷；想更穩可以自訂一個錯誤類別，把標題放在獨立的屬性：

```ts
class NotifyError extends Error {
    title: string;

    constructor(title: string, message: string) {
        super(message);
        this.title = title;
    }
}

throw new NotifyError('登入失敗！', 'Token 缺失！！');
```

## 例子與對比

### 修正一：攤平 Promise 鏈
每個 `then` 都把下一個 Promise 回傳出去，鏈就是平的，錯誤一路傳到底：

```ts
sendRequest(url, 'POST', loginForm)
    .then((auth) => { // Token 處理
        if (!auth) {
            throw new Error('登入異常！, 網路錯誤！！');
        }

        if (!auth.access_token) {
            throw new Error('登入失敗！, Token 缺失！！');
        }

        userStore.setToken(auth.access_token);
        return sendRequest('/api/user'); // 關鍵：把下一個請求 return 出去
    })
    .then((res) => { // 取得使用者資料
        if (!res) {
            throw new Error('資料取得異常！, 網路錯誤！！');
        }

        if (!res.status) {
            throw new Error(`取得使用者資料失敗！, ${res.msg}`);
        }

        userStore.signIn(res.data);

        // 導向來源 或者 首頁
        const redirect = route.redirectedFrom?.fullPath || '/';
        router.push({ path: redirect });
    })
    .catch((error) => {
        const [title, message] = error.message.split(', ');

        proxy.$notify('error', title, message).then(() => {
            isLoging.value = false;
        });
    });
```

### 修正二：改用 async/await
有先後順序的流程，`async/await` 讀起來就像一般的程式，不用煩惱哪裡漏了 `return`：

```ts
async function login() {
    try {
        const auth = await sendRequest(url, 'POST', loginForm);
        if (!auth) {
            throw new Error('登入異常！, 網路錯誤！！');
        }
        if (!auth.access_token) {
            throw new Error('登入失敗！, Token 缺失！！');
        }
        userStore.setToken(auth.access_token);

        const res = await sendRequest('/api/user');
        if (!res) {
            throw new Error('資料取得異常！, 網路錯誤！！');
        }
        if (!res.status) {
            throw new Error(`取得使用者資料失敗！, ${res.msg}`);
        }
        userStore.signIn(res.data);

        const redirect = route.redirectedFrom?.fullPath || '/';
        router.push({ path: redirect });
    } catch (error) {
        const [title, message] = (error as Error).message.split(', ');
        await proxy.$notify('error', title, message);
        isLoging.value = false;
    }
}
```

### 三種寫法比一比

| 寫法 | 錯誤會不會被接到 | 可讀性 | 容易犯的錯 |
|---|---|---|---|
| 巢狀 `then`，沒 `return` | 外層的不會 | 差，越巢越深 | 就是這篇的 bug |
| 攤平的 `then` 鏈 | 會 | 還行 | 忘記 `return` 就退回上一列 |
| `async/await` + `try...catch` | 會 | 最像同步程式 | 忘記 `await` |

## 結論
Promise 鏈的規則其實只有一條：-|想讓外面等你，就把 Promise 交出去|-。`then` 裡面開了新的請求卻沒 `return`，就像員工自己接了案子沒跟公司說，出包了公司也不知道要幫他擦屁股。

有先後順序的流程，現在大多直接寫 `async/await`；但看懂 `then` 鏈怎麼傳錯誤，遇到舊程式或函式庫的時候，才知道錯誤溜去哪了。
