---
title: 'API 串接進化史（一）：打磚塊、AJAX 跟 jQuery，我是怎麼被網路通訊啟蒙的'
image: ''
description: '從大學用 HTML5 + AJAX 寫打磚塊對戰、jQuery 時代的 $.ajax，到 2023 年第一次自己封裝 axios。這個系列不是教學，是我十幾年來串 API 的黑歷史。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - Developer
tags:
  - API
  - Axios
  - AJAX
  - 心路歷程
editLink: true
isPublished: false
---
::: warning 草稿
這篇是 Claude 照 git 歷史與對話記錄寫的草稿。第一篇幾乎都是倉庫裡沒有的記憶，下面標 ✍️ 的地方要你自己補：
- 打磚塊對戰當時怎麼傳資料？定時輪詢 `XMLHttpRequest`？還是那時候已經碰到 WebSocket？
- 打包成 App 的那個案子是什麼？用 PhoneGap／Cordova 嗎？
- 第一次覺得「每頁都寫一次 `$.ajax` 不對勁」是哪個瞬間？
補完把這個區塊刪掉，發文工具才會放行。
:::

::: info 系列：API 串接進化史
從大學的打磚塊一路到 TanStack Query，每一次改寫都是被某個坑推著走的。這個系列不講「最佳實踐」，講的是我為什麼會變成現在這樣。
1. **打磚塊、AJAX 跟 jQuery，我是怎麼被網路通訊啟蒙的**（這篇）
2. [2023：一支叫 getData 的函式](./02-2023-一支叫-getdata-的函式)
3. [2024：攔截器、token 刷新，以及我把它刪掉](./03-2024-攔截器-token-刷新-以及我把它刪掉)
4. [composable 化的代價：我把攔截器塞進函式裡](./04-composable-化的代價-我把攔截器塞進函式裡)
5. [三個專案，三份一模一樣的 useApi](./05-三個專案-三份一模一樣的-useapi)
6. [那三天：useBackendApi、useAsyncState，然後 TanStack Query](./06-那三天-usebackendapi-useasyncstate-然後-tanstack-query)
7. [TanStack Query 之後我踩的坑](./07-tanstack-query-之後我踩的坑)
8. [回頭看：兩套並存的 useApi，跟我現在會怎麼起手](./08-回頭看-兩套並存的-useapi-跟我現在會怎麼起手)

**這篇的脈絡**：前陣子把專案裡自己封裝的 axios composable 整個重構，拆出 repository 跟 service 層、導入 TanStack Query。弄完坐在那邊發呆，突然想起兩年前還在糾結「要用 axios 還是 fetch」的自己，再往前想，想到大學時候那個用 AJAX 做的打磚塊。這條路走了十幾年，坑踩了一路，不寫下來可惜。
:::

## 緣起
每次重構完一個東西，都會有一段短暫的、自我感覺良好的時間。

這次是 API 層。把三個專案裡複製貼上了兩年的 `useApi.ts` 整個翻掉，換成 `useBackendApi` 加 TanStack Query，API 函式會丟錯誤、型別用 Zod 守著邊界、頁面只管 `useQuery`。坐在那邊看著乾淨的 `features/` 目錄，心想：終於。

然後下一秒就想到，兩年前的我也是這樣坐著，看著剛寫好的 `getData()` 函式，心想：終於。

再往前推，大學的時候，看著 Chrome 的 Network 面板第一次出現自己寫的 `XMLHttpRequest`，心想：哇。

所以這個系列不是教你怎麼封裝 axios。網路上那種文章太多了，我自己也寫過幾篇。這個系列是回頭看這十幾年，每一次「終於」之後，是什麼事情逼我把它推翻重來。

## 一切從打磚塊開始
✍️ **這段要你補。** 我只知道：大學、國科會計畫、HTML5 剛紅、AJAX 剛出來、打磚塊對戰。

那是 HTML5 剛被喊得滿天飛的年代。`<canvas>` 是新玩具，Flash 還沒死透但大家已經開始寫它的訃聞，而「AJAX」這個詞還會被拿來當履歷上的技能寫。我報了個國科會的大專生計畫，題目是用 HTML5 加 AJAX 做網頁連線遊戲——打磚塊對戰。

兩個人，兩個瀏覽器，一顆球。

✍️ 當時怎麼同步兩邊的狀態？我猜是用 `setInterval` 定時去 poll 伺服器，把對方的板子位置跟球的座標抓回來。那個年代 WebSocket 的規格才剛定下來，瀏覽器支援參差不齊，應該不會用。但這段要你確認。

現在回頭看，那大概是我第一次感受到「網路通訊」這件事的重量：資料不是在你手上，它在另一台機器上，你要去要，要等它回來，而且它不一定會回來。當時沒有這麼清楚的體悟，只覺得球會跳。

但那顆跳動的球，就是後來所有東西的起點。

## jQuery 時代：$.ajax 寫到手軟
畢業後進了業界，那是 jQuery 的黃金年代。

✍️ 這段也要你補：是什麼案子要打包成 App？用 PhoneGap 或 Cordova？

當時接到一個需求，要把網頁打包成 App。既然要打包，就不能靠後端 render 頁面了，所有資料都得前端自己去要。於是整個專案變成純前端：HTML 寫畫面，`$.ajax` 要資料，拿回來用 jQuery 塞進 DOM。

那時候的程式碼大概長這樣：
```js
$.ajax({
    url: '/api/products',
    type: 'GET',
    success: function (res) {
        if (res.status === 0) {
            $.each(res.data, function (i, item) {
                $('#list').append('<li>' + item.name + '</li>');
            });
        } else {
            alert(res.message);
        }
    },
    error: function () {
        alert('網路錯誤');
    }
});
```
每一頁都有一段這樣的東西，有些頁面有五六段。token 要帶的話，就每段都加一行 `headers`。後端改了回傳格式，就全站搜尋 `res.data` 一個一個改。

現在看會覺得很蠢，但那時候真的沒有「封裝」的概念。不是不會，是沒想過要。`$.ajax` 本身就已經是 jQuery 幫你封裝好的 `XMLHttpRequest` 了，還要再包一層？包什麼？

::: tip 回頭看
「純前端」這件事，其實就是前後端分離的雛形。只是那時候沒人這樣叫它，我也沒意識到自己正在做的事情，十年後會變成前端工程師的預設工作型態。
:::

✍️ 這裡可以寫一段當時第一次覺得「這樣寫不對」的瞬間，如果有的話。沒有也沒關係，很多人是直到換了框架才回頭發現的。

## 然後 Vue 來了
中間跳過幾年。Vue 2、Vue 3、Composition API、Vite。

框架換了，但串 API 這件事其實沒變多少：還是要帶 token、還是要處理錯誤、還是要把後端的格式轉成畫面要的格式。差別只在於 `$.ajax` 換成了 `axios`，callback 換成了 Promise，然後 Promise 又換成了 `async/await`。

2023 年底，我開了一個新專案。那是我第一次認真坐下來想：這次不要每頁寫一次了，寫一支函式把它包起來。

那支函式叫 `getData`。

下一篇，我們從它開始。
