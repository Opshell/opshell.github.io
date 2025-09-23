---
title: promise
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-09-25'
categories:
tags:
editLink: true
isPublished: false
---
https://eyesofkids.gitbooks.io/javascript-start-es6-promise/content/contents/ch5_flow_n_error.html

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
