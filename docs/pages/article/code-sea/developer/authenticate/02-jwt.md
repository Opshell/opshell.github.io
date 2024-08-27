---
title:  'What is JWT'
author: 'Opshell'
createdAt: '2024/08/27'
categories: 'Web Application'
tags:
  - Web Application
editLink: true
isPublished: false
---

oauth

https://5xcampus.com/posts/what-is-jwt

[Token 放 localStorage？sessionStorage？還是 Cookie？](https://israynotarray.com/information-security/20230516/18406287/)

[token 放哪裡](https://wenku.csdn.net/answer/c5e02568044b4bd5a190d3d3e66ec6bc?ydreferer=aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS8%3D)

[結合 JWT 與 Refresh Token 達到黑名單失效機制](https://tec.xenby.com/44-%E7%B5%90%E5%90%88-jwt-%E8%88%87-refresh-token-%E9%81%94%E5%88%B0%E9%BB%91%E5%90%8D%E5%96%AE%E5%A4%B1%E6%95%88%E6%A9%9F%E5%88%B6)

[OAuth 2.0 筆記 (7) 安全性問題](https://blog.yorkxin.org/posts/oauth2-7-security-considerations/)

[討論 OAuth 2 的 token 更新策略](https://editor.leonh.space/2022/oauth-token/)

http only + aouth

原本是(O)
請求-> 過期要ReToken(後端) -> 給 ReToken -> 刷新Token 順便給資料(後端)
改成(X)
請求 順便帶ReToken -> 給資料  過期就給新的 Token(後端)

你應該會有一個事件是專門在ACCESS TOKEN過期的時候去執行的，這時候才會把REFRESH TOKEN拿出來用

也就是說  我會有個 function
在每次 請求後  都會先過這個判斷
判斷他是不是有回傳過期給我
有的話
我就給他reflash token
他回來後  我更新token
再送一次原本的請求
