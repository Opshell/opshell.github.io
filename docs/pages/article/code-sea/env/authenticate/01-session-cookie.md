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

http only



token放http only cookie阿

反正refresh不是放http only的cookie就是storage

要麼你JWT用來驗證別的不重要的東西，剩下的掛O AUTH看refresh token

這類作法是 MFA 的意思嗎 多因子驗證





這類作法是 MFA 的意思嗎 多因子驗證

如同剛剛阿米大和涉谷大所說，不要直接傳 user 資訊，因為這可以偽造，應該要傳送 access token，後端自行從 token 取得 user 資訊