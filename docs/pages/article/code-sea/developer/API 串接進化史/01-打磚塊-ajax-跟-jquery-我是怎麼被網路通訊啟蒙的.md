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

**這篇的脈絡**：前陣子把專案裡自己封裝的 axios composable 整個重構：寫開發規範、導入 Zod、拆出 repository 跟 service 層、接上 TanStack Query。先在小專案試跑，再到多人協作的大專案實測，回頭修了開發規範的最後一段。弄完坐在那邊發呆，突然想起幾年前還在糾結「要用 axios 還是 fetch」的自己，再往前想，想到大學時候那個用 AJAX 做的打磚塊。這條路走了十幾年，坑踩了一路，不寫下來可惜。
:::

## 緣起
每次重構完一個東西，都會有一段短暫的、自我感覺良好的時間。

這次是 API 層。把三個專案裡複製貼上了兩年的 `useApi.ts` 整個翻掉，換成 `useBackendApi` 加 TanStack Query，API 函式會丟錯誤、型別用 Zod 守著邊界、頁面只管 `useQuery`。坐在那邊看著乾淨的 `features/` 目錄，心想：終於。

然後就想到，三年前的我也是這樣坐著，看著剛寫好的 `getData()` 函式，心想：終於。

再往前推，大學的時候，看著 Chrome 的 Network 面板第一次出現自己寫的 `XMLHttpRequest`，心想：哇。

所以這個系列不是教怎麼封裝 axios。網路上那種文章太多了，我自己也寫過。這個系列是回頭看這十幾年，每一次的「終於」是為了什麼需求，是什麼事情又讓我覺得需要推翻重來。

## 一切從打磚塊開始
那是 HTML5 剛被喊得滿天飛的年代。`<canvas>` 是當紅炸子雞~~（夠老吧）~~，Flash 還沒死透但大家已經開始寫它的訃聞，而「AJAX」這個詞還會被拿來當履歷上的高級技能寫。我報了個國科會的大專生計畫，題目是用 HTML5 加 AJAX 做網頁連線遊戲——打磚塊對戰。不用綁在 PHP、.NET 上，畫面能動態渲染，還能用 PhoneGap（後來的 Cordova）包成 App——一套 JS 打網頁、手機、伺服器三個平台。用我們教授當時的話說：可是酷得不得了。

兩個人，兩個瀏覽器，一顆球。

沒有用任何套件。那時候我根本不知道有套件這回事。整個遊戲是原生 JS 加 HTML5 手刻的：`<canvas>` 畫球畫板子畫磚塊、`requestAnimationFrame`（或者是 `setTimeout`，記不清了）跑遊戲迴圈，然後網路的部分——

```js
var xhr = new XMLHttpRequest();
xhr.open('GET', 'state.php?room=' + roomId, true);
xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
        var state = JSON.parse(xhr.responseText);
        opponent.x = state.paddleX;
        ball.x = state.ballX;
        ball.y = state.ballY;
    }
};
xhr.send();
```

就是這樣。`new XMLHttpRequest()`、`open`、`onreadystatechange`、`readyState === 4`——這四行後來被 jQuery 包成一個 `$.ajax`，再後來被 axios 包成一個 `axios.get`，再後來被我包成一支 `sendRequest`。但第一次寫的時候，每一行都是自己敲的，每一個 `readyState` 的數字都是查了才知道是什麼。

**當時怎麼同步兩邊的狀態？** 印象中是用 `setTimeout` 定時去 poll 伺服器，把對方的板子位置跟球的座標抓回來。那個年代 WebSocket 的規格才剛定下來，瀏覽器支援參差不齊，而且還是 JS 新手，怎麼可能玩這麼高級的東西 XD。

**那球的「真相」在誰手上？** 算力主要吃客戶端：兩邊各算各的物理，每次碰撞就把球的座標丟到伺服器，對方下一次 poll 再抓回去。這樣就會有一個問題：兩邊算出來的結果不一樣怎麼辦？我記得當時是「誰先碰到就誰算」，所以球有時候會瞬移。

現在回頭看，那大概是我第一次感受到「網路通訊」這件事的重量：資料不是在你手上，它在另一台機器上，你要去要，要等它回來，而且它不一定會回來。當時沒有這麼清楚的體悟，只覺得球會跳。

但那顆跳動的球，就是後來所有東西的起點。

::: tip 回頭看
從手寫 `XMLHttpRequest` 開始有一個好處：之後不管包了幾層，我都知道最底下是什麼。axios 的 `interceptors` 聽起來很神，拆開就是「在 `send()` 前後各塞一個函式」；`responseType: 'blob'` 也只是 `xhr.responseType = 'blob'`。攔截器在第三篇會再遇到，blob 在第二篇。
:::

## jQuery 時代：$.ajax 寫到手軟
畢業後進了業界，那是 jQuery 的黃金年代。第一次看到 `$.ajax` 把我那十行 `XMLHttpRequest` 變成三行的時候，心裡想的是：原來可以這樣。然後就再也沒有手寫過 `onreadystatechange`。

當時接到一個需求，要把網頁打包成 App。既然要打包，就不能靠後端 render 頁面了，和公司所有的 `<?php echo $data; ?>` 說再見了，所有資料都得前端自己去要。於是整個專案變成純前端：HTML 寫畫面，`$.ajax` 要資料，拿回來用 jQuery 塞進 DOM。

那時候的程式碼大概就是這樣吧：
```js
$.ajax({
    url: '/api/products',
    type: 'GET',
    success: function (res) {
        if (res.code === 'OK') {
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

現在看會覺得很蠢，但那時候真的沒有「封裝」的概念。`$.ajax` 本身就已經是 jQuery 幫你封裝好的 `XMLHttpRequest` 了，還要再包一層？包什麼？

::: tip 回頭看
「純前端」這件事，其實就是前後端分離的雛形。只是那時候沒人這樣叫它，我也沒意識到自己正在做的事情，十年後會變成前端工程師的預設工作型態。
:::

## 然後 Vue 來了
中間跳過幾年。後來的專案有把 `$.ajax` 稍微包一層，變成一個好呼叫的模組——但那只是為了少打幾行，token、錯誤、後端的格式還是每一頁各自處理。直到前端飛速發展：React、Vue 2、Vue 3、Composition API、Vite。

框架換了，但串 API 這件事其實沒變多少：還是要帶 token、還是要處理錯誤、還是要把後端的格式轉成畫面要的格式。差別只在於 `$.ajax` 換成了 `axios`、`fetch`，callback 換成了 Promise，然後 Promise 又換成了 `async/await`。

2023 年底，我開了一個新專案。有了前面幾年的經驗，那是我第一次認真坐下來想：通訊之間要處理的細節其實很多——token、錯誤、後端的格式——它們應該收進同一個入口，而不是每一頁各寫一次。那個入口是一支函式，叫 `getData`。也蠻好懂的吧 XD，就是從後端撈東西回來渲染。

下一篇，從它開始。
