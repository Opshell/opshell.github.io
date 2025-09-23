---
title: 論 pinia vuex 與 vue query
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-11-01'
categories:
tags:
editLink: true
isPublished: false
---
Opshell
    各位大大早安~
    最近又回頭精煉 pinia 的技能
    想問問各位大大
    https://cloud.tencent.com/developer/article/1945421
    現在的pinia還需要這樣嗎?

竹子たけ
    發文者功底不錯
    但看過去只是為了共用而共用而已
    再說，其實大型項目回歸 vuex 的設計理念反而我覺得有更多好處
    Pinia 的設計理念在小項目比較凸顯好處

歌岸似聲
    我覺得就是彈性高，讓複雜度下降很多

竹子たけ
    沒錯，所以如果要搞大型項目，技術選型我覺得可以再琢磨一下啦

Astolfo
    我個人會用setup的pinia

Opshell
    大型的多人項目 用 Vuex 的確可以避免很多人為的懶癌問題

Astolfo
    這時候需要思考，即便專案很大，有必要什麼都往store塞嗎

竹子たけ
    以前拉 api 都要進 store 這個設計
    我也覺得在 vue-query 之下可以省掉了

鱈魚
    真的，目前只有做複雜的應用程式需要 store，一般網頁完全不需要了

竹子たけ
    真正進去 store 是需要 feature module 之間溝通的 context 才需要進去

Opshell
    拉api 都要進 store 是把api 都封裝進去 store的意思嗎?
Astolfo
    call api事件都往裡面塞是很痛苦的
竹子たけ
    對啊，前幾年很流行

鱈魚
    vue-query 可以指定 cache key，vue query 會自動幫你合併 request 或者直接取用快取
Astolfo
    還可以搭著axios用

Astolfo
    websocket和userInfo那種東西我才會這樣做

竹子たけ
    所以 vue-query 的定位不是 api fetcher
    是 api state manager

    TanStack/core  這包很精華
    完全把框架邏輯抽象掉

Astolfo
    不過我主要用vue-query還是為了cache和api status
    用不到的，你繼續用axios或fetch寫try catch都沒差
Opshell
    像是  userinfo 之類的 catch 嗎?
Astolfo
    只要是需要狀態管理的功能，又需要cache，我就會用

竹子たけ
    如果遇到需要寫 DI
    我絕對是反對 auto import
    我反而覺得 vuex 的設計更合適

    搭配 vuex dynamic register
    完全可以 tree shaking
    所以文中我覺得他的理解不夠深
鱈魚
    DI 和 auto import 好像沒有直接關係？
竹子たけ
    我講的是 依賴注入這個使用概念
鱈魚
    auto import 只是讓你不需要手動加上 import 那一行，屬於 DX 的部分
    DI 則是不要在內部依賴實例，在約定介面的情況下從外部注入需要用到的實例，屬於實際運行的部分
    以上是我的理解，所以我覺得他們應該是沒有甚麼關係

竹子たけ
    DX 是 Developer Experience
    DI 是 Dependency Injection

    我現在越來越偏好少封裝、少共用
    global 東西越少越好
    宣告越清楚越好

    蛤？很麻煩？
    現在都 AI 在寫 Code 了，又不是讓你手寫
    Tab 兩下就寫完了

    好不好做依賴反查我覺得是大型專案更關切的

Opshell
    的確  現在是  能越清楚找到脈絡更重要
    所以感覺  現在  程式碼可讀性的重要性比以前高不少

竹子たけ
    因為 AI Debug 很弱

Opshell
    他會無限鬼打牆XD

竹子たけ
    宣告清楚可以幫助 AI 和 人找出問題
    所以我不喜歡任何「偷懶型設計」
