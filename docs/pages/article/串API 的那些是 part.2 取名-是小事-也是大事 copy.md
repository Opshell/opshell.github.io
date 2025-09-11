---
title: 串API 的那些事 part.2 取名-是小事-也是大事
image:
description:
keywords:
author: 'Opshell'
createdAt: 2025-09-11
categories:
  - '未分類'
tags:
  -
editLink: true
isPublished: false
---

# 取名-是小事-也是大事
哈哈哈，這個問題問得太好了！檔案命名、變數命名，這種看似「小事」的地方，其實最能體現一個前端工程師{.vue}的經驗和對專案架構的思考深度。這絕對是我們會在群組裡花時間討論的議題。

一樣，我把這個討論整理成一篇筆記。

sitemap
Composable 的命名藝術：useApi.ts 真的夠清楚嗎？
延續上次我們討論的 axios 封裝，有大大接著問：「那這個檔案命名叫 useApi.ts 好嗎？」

這真是個畫龍點睛的問題。一個好的命名能讓其他協作者（以及幾個月後的自己）一眼就看懂這段程式碼的用途和範疇，是提升可讀性與可維護性的關鍵第一步。

先說結論：useApi.ts 哪裡做得好？
::: info
useApi.ts 這個命名沒有錯，而且遵循了 Vue Composable 的核心慣例。
:::

它最大的優點就是使用了 use 作為前綴。這是 Vue 3 Composition API 的一個強力慣例 (Convention)。當我們看到 use...，我們立刻就能知道：

這是一個 Composable Function：它可以用在 setup 語法糖或 setup() 鉤子中。

它可能具有響應性：內部可能使用了 ref、reactive 等。

它封裝了一段可重用的邏輯。

在一個小到中型的專案裡，如果整個系統只有一個主要的後端 API 來源，那 useApi.ts 其實非常直觀，大家都能理解它就是用來跟我們主要的後端{.info}溝通的工具。

批判性思考：useApi 的模糊地帶
然而，當專案規模擴大，或需要與多個不同服務對接時，useApi 的通用性就可能變成它的缺點。它的模糊地帶在於：

它沒有回答「這是哪個 API？」這個問題。

想像一下，我們的應用程式變得越來越複雜：

除了我們自己的後端{.info}服務，我們還需要串接：

一個第三方的金流服務 (例如：Stripe)

一個地圖服務 (例如：Google Maps API)

一個後台可能還需要去撈氣象局的公開資料

這時候，如果我們只有一個 useApi.ts，情況會變得很混亂。如果我們為每個服務都建立一個 Composable，那會長這樣：

useApi.ts (我們自己的後端)

useStripeApi.ts

useGoogleMapsApi.ts

useWeatherApi.ts

看到問題了嗎？useApi.ts 在這裡就顯得格格不入，它的名字太通用，導致我們必須在心裡默默記住：「喔，那個沒有指定名稱的 useApi 就是指我們自己的後端」。這種依賴「潛規則」的作法，對於新加入的團隊成員來說，就是一個溝通成本。

那該叫什麼？一些命名的建議
命名的核心原則是清晰地表達其意圖 (Expressive Intent)。針對這個 axios 封裝，我會根據它的抽象層級和專案情境給出幾個建議：

1. 根據「服務來源」命名 (推薦)
這是最直觀、最不容易混淆的作法。

useBackendApi.ts 或 useMainApi.ts

優點：非常明確！直接告訴你這是用來跟我們主要的後端 (Backend) 伺服器溝通的。當你需要跟其他第三方服務溝通時，你就可以很自然地建立 useShopifyApi.ts、useCwaApi.ts 等，檔案結構會非常清晰。

::: tip
我個人在團隊協作中，最偏好 useBackendApi.ts 這種命名方式。它幾乎沒有任何模糊空間。
:::

2. 根據「抽象層級」命名
這個角度更偏向軟體工程的思考，描述這個 Composable 本身是什麼，而不是它要去哪裡。

useHttpClient.ts

優點：語意上非常精準。我們所封裝的 sendRequest 函式，其本質就是一個 HTTP 客戶端 (HTTP Client)。這個命名表明它是一個較為底層、通用的工具，不關心具體的業務邏輯。如果你想強調它是一個通用工具，這個名字就很好。

useFetch.ts

優點：在 Vue 的生態圈中，useFetch 是一個很常見的命名（例如 VueUse 函式庫）。它廣為人知，一看就知道是發送網路請求用的。

缺點：可能會跟 VueUse 函式庫中的 useFetch 混淆，如果你的專案同時也安裝了 VueUse，可能會造成困擾。

總結：我的選擇與建議
綜合來看，useApi.ts 是一個合格的命名，但不是一個卓越的命名。

對於小型、單一後端來源的專案：useApi.ts 完全夠用，不用過度設計。

對於中大型、可能有多個 API 來源、強調多人協作的專案：

我強烈建議使用更具描述性的名稱。在「根據服務來源」和「根據抽象層級」兩種策略中：

我會優先選擇 useBackendApi.ts。

因為它最貼近日常溝通的語言，前端工程師{.vue}和後端{.info}工程師在討論問題時，會說「你打一下後端的 User API」，而不會說「你用一下 HTTP Client 去 call User Endpoint」。useBackendApi.ts 能讓程式碼和我們的溝通語言保持一致，這在團隊協作中非常有價值。

所以，下次當你建立一個 Composable 時，可以多想一步：這個名字，是否已經清楚地告訴了下一個人它的所有職責和範圍了呢？