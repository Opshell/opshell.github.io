---
title:  '登入機制比較&分析'
author: 'Opshell'
createdAt: '2024/08/27'
categories: 'Web Application'
tags:
  - Web Application
editLink: true
isPublished: false
---

# 登入機制分析 & 探討

[前后端分离常用的认证方式（ Session 、JWT）](https://juejin.cn/post/6972395146599989279)

## 1. Session-Cookie
当服务端需要对访问的客户端进行身份认证时，常用的做法是通过session-cookie 机制；

### 問題；
- 当客户访问量增加，服务端需要存储大量的session会话，对服务端有很大考验
- 当服务端为集群时，用户登录其中一台服务器，会将session保存在该服务器的内存中，但是当用户访问其他服务器时。会无法访问。（已经有了成熟的解决方案）
    - 可以采用使用缓存服务器来保证共享
    - 第三方缓存来保存session

- 由于依赖cookie，所以存在CSRF安全问题

## 2. Token 认证机制
token(令牌，访问资源的凭证) 认证是一种机制，具体的实现可以是一个随机的字符串，也可以是标准的jwt。

token需要查库验证token 是否有效，而JWT不用查库或者少查库，直接在服务端进行校验。
因为用户的信息及加密信息在第二部分payload和第三部分签证中已经生成，只要在服务端进行校验就行，并且校验也是JWT自己实现的。

::: tip
JWT 是 JSON Web Token的缩写.
是由3部分拼成的一个字符串，每个部分之间用.分隔。
在HTTP通信 过程中，进行身份认证的一种方式。也可以在各个服务之间进行信息传输
是Token认证方式的一种具体实现

jwt的认证方式，服务端不需要保存任何session会话，是无状态的，比较容易扩展。
因为不依赖cookie，可以存在localStorage里，所以可以防御csrf攻击，更安全。
JWT 默认是不加密的，任何人都可以读到，所以不要把秘密信息放在这个部分。
:::

### 放在cookie里会引起跨域，如何避免？
放在HTTP请求的头信息Authorization字段里。Authorization: Bearer <token>.
另一种做法是，跨域的时候，token(jwt) 就放在 POST 请求的数据体里面。

## 3. OAuth(開放授權)

## 參考資料：
1. [是誰在哈囉? 如何搞定 SPA 與 API Server 的登入驗證](https://5xcampus.com/posts/hello-spa-rails-api-server.html?srsltid=AfmBOoppOY6k8YAlRwwzoovB0v6oa3Uao95lEf6SysnKh-HDJfl33qhg)
2. [前后端分离常用的认证方式（ Session 、JWT）](https://juejin.cn/post/6972395146599989279)
2-1. [会话跟踪技术：Cookie 和Session](https://juejin.cn/post/6973982725493506085/)

http only

token放http only cookie阿

反正refresh不是放http only的cookie就是storage

要麼你JWT用來驗證別的不重要的東西，剩下的掛O AUTH看refresh token

這類作法是 MFA 的意思嗎 多因子驗證

這類作法是 MFA 的意思嗎 多因子驗證

如同剛剛阿米大和涉谷大所說，不要直接傳 user 資訊，因為這可以偽造，應該要傳送 access token，後端自行從 token 取得 user 資訊

[前后端分离架构：为何不推荐使用Cookie-Session机制？](https://blog.csdn.net/xycxycooo/article/details/141256384)

使用者的認證方式常用的有2種：Session-cookie` 認證機制 和 Token認證機制（jwt是他具體的實現）。

https://medium.com/@paulyang1234/cookie-session-%E8%88%87-jwt-token-%E5%AE%89%E5%85%A8%E6%80%A7%E5%95%8F%E9%A1%8C-8945a8a579ac









https://medium.com/@osvaldogarcia_67748/setup-oauth2-with-laravel-4df7e96c724f
https://laravel.com/docs/11.x/passport