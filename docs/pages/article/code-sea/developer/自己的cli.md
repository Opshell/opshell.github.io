---
title: 自己的cli
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-10-09'
categories: 
tags: 
editLink: true
isPublished: false
---
我跟我主管提說 我們之前產品基本上功能跟介面相似度很高 我們可以開一個 template project 之後開案就 clone 那個專案就好 他先說 但技術會更新 我說所以那個專案也要迭代啊 然後說可是每個專案邏輯不一樣 接著若有所思

13:17 Mesak 阿米 這個很必要耶
13:18 Mesak 阿米 正在開發這東西
13:18 Mesak 阿米 基本專案搞定內部所有需求的 method之後  之後 fork 或是clone 就可以開始工作了
13:18 Jack 是模組化的意思嗎？
13:19 Astolfo 類似git template
13:19 Mesak 阿米 模組化是另一個方向
13:19 Astolfo 其實也可以自己開發一個CLI
13:19 Mesak 阿米 有點像是create vite@latest my-vue-app -- --template vue
13:20 Mesak 阿米 建立好之後就是你公司自己的包 有內建的 method
13:20 Mesak 阿米 如果公司規劃 也可以改用 monorepo 處理
13:20 Mesak 阿米 也是需要一個 base 的包

13:33 日安 所以我沒有很懂他感覺為難的點
13:33 Astolfo 掌握不了或者不深入理解
13:34 Astolfo 大多是前者
13:34 Astolfo 用nodeJS寫個CLI本身沒什麼問題
13:35 Astolfo 主要是那些需要被客製的部分和通用部分究竟有哪些作法可以在日後統一管理
13:38 日安 算了 就不管他們 我寫我的系統就好了
13:38 Mesak 阿米 有時候 這種規劃也是 經手的人沒有經驗
13:38 Mesak 阿米 又或者是做完某些東西反而事情變少了 看起來涼了
13:39 Mesak 阿米 戰略性裝忙
