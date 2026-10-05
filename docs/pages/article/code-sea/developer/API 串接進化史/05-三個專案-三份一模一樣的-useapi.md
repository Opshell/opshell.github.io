---
title: 'API 串接進化史（五）：三個專案，三份一模一樣的 useApi'
image: ''
description: '2025 年上半年，我手上有三份 useApi.ts：A 專案、B 專案、新開的 C 專案，外加一個 side project。每一份都是複製來的，連 bug 都一樣。直到在群組裡看到別人貼出的 useApi，才真的回頭看自己的。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - Developer
tags:
  - API
  - Axios
  - 架構
  - 心路歷程
editLink: true
isPublished: false
---
::: warning 草稿
這篇是 Claude 照 git 歷史寫的草稿。專案以 A／B／C 代稱；commit 訊息、日期、分支、API 路徑已在 10-06 去識別化。flowmodoro 是你自己的 side project 所以直接寫。群組討論那段接的是你已經寫好的「串 API 的那些事」四篇，我只連過去不重講。看完改成自己的話再刪掉這個區塊。
:::

::: info 系列：API 串接進化史
從大學的打磚塊一路到 TanStack Query，每一次改寫都是被某個坑推著走的。這個系列不講「最佳實踐」，講的是我為什麼會變成現在這樣。
1. [打磚塊、AJAX 跟 jQuery，我是怎麼被網路通訊啟蒙的](./01-打磚塊-ajax-跟-jquery-我是怎麼被網路通訊啟蒙的)
2. [2023：一支叫 getData 的函式](./02-2023-一支叫-getdata-的函式)
3. [2024：攔截器、token 刷新，以及我把它刪掉](./03-2024-攔截器-token-刷新-以及我把它刪掉)
4. [composable 化的代價：我把攔截器塞進函式裡](./04-composable-化的代價-我把攔截器塞進函式裡)
5. **三個專案，三份一模一樣的 useApi**（這篇）
6. [那三天：useBackendApi、useAsyncState，然後 TanStack Query](./06-那三天-usebackendapi-useasyncstate-然後-tanstack-query)
7. [TanStack Query 之後我踩的坑](./07-tanstack-query-之後我踩的坑)
8. [回頭看：兩套並存的 useApi，跟我現在會怎麼起手](./08-回頭看-兩套並存的-useapi-跟我現在會怎麼起手)

**這篇的脈絡**：2025 年夏天開了 C 專案，起手式照舊：把 B 專案的 `useApi.ts` 複製過去。這已經是第三次了。這篇講複製貼上的封裝會發生什麼事、side project 裡那個意外長出來的三層結構，以及群組裡一段別人的程式碼怎麼讓我回頭看自己的。
:::

## 複製貼上的族譜
先把族譜畫出來：

```
2023 年底  A 專案  useApi.ts 誕生（getData → sendRequest）
            │
2024 春     ├──複製──→  B 專案  useApi.ts
            │               │
2024 秋     │（攔截器）      │（攔截器、刷新、刪刷新、composable 化、搬回去、旗標）
            │               │
2025 初     │               ├──複製──→  flowmodoro（side project）
            │               │
2025 夏     │               └──複製──→  C 專案  useApi.ts
```

每一次複製，都是「新專案開起來，先把能用的拿過來」。沒有人會在專案第一天重寫 API 層，有的話那個人大概不用趕進度。

複製的內容是什麼？C 專案第一個 commit 的 `useApi.ts`，跟 B 專案前一年年底那份比，差異只有：
- import 路徑
- `eResponseStatus` 多了兩個值
- 一個 `getImage` 的訊息文字

其他 180 行一模一樣。包括兩個全域旗標、包括 `return null`、包括 `.catch` 裡那行會在斷網時自己炸掉的 `error.response.data.message`。

## 複製的不只是程式碼
程式碼複製過去，bug 也複製過去，這很直覺。比較不直覺的是：**設計上的假設**也複製過去了，而那些假設在新專案裡不一定成立。

舉三個：

**假設一：後端回的是 `{ status, messages, data }`。** B 專案的後端是這樣，C 專案的後端也是這樣——因為是同一家公司的後端團隊。但 flowmodoro 的「後端」是 Google Calendar API，它回的是 `{ items: [...] }`，根本沒有 `status`。於是 flowmodoro 的 `sendRequest` 裡 `iResult` 的轉換整段形同虛設，每個呼叫端都直接去讀 `response?.data.items`。

**假設二：401 代表登入逾時，要跳 Dialog 登出。** A 專案的 401 是 token 過期可以刷新；B 專案的 401 是真的過期要登出；Google 的 401 是 scope 不夠或 token 過期，而且 Google 的 token 是一小時，沒有 refresh 的話每小時都要重新授權。同一段攔截器，在三個專案裡做的是三件不一樣的事。

**假設三：`sendRequest` 不會 throw。** 這個假設在 2025 年秋天之前都沒人挑戰，因為每個呼叫端都乖乖判 `null` 再判 `status`。但它決定了一件事：這份 `useApi.ts` 跟 TanStack Query **天生不相容**。下一篇講。

## flowmodoro：意外長出來的三層
2025 年初的 side project 值得單獨講一下，因為它是四個專案裡唯一一個 API 層長出三層的，而且不是刻意設計的。

flowmodoro 是一個番茄鐘的變體，任務存在 Google Calendar 裡（一個任務對應多個 event，用 `extendedProperties.private.taskId` 串起來）。它的資料流：

```
TaskList.vue
    └── calendarService.fetchYearTasks()        ← 業務邏輯：一年內的任務、聚合成 task
            └── useGoogleCalendar().getEvents()  ← Google Calendar REST：endpoint、參數
                    └── useApi().sendRequest()   ← axios：token、proxy
```

三層。`useApi` 管 HTTP，`useGoogleCalendar` 管 Google 的 endpoint 跟型別，`calendarService` 管「一個任務是什麼」。

這個結構不是規劃出來的。一開始只有 `useApi` 跟 `useGoogleCalendar`，頁面直接呼叫 `getEvents()` 然後自己聚合。後來聚合的邏輯越來越長（一個 task 要從多個 event 湊起來、status 要取最後一個 event 的、group 資訊要從 extendedProperties 撈），頁面的 `<script setup>` 變成 300 行，就抽了一支 `useCalendarService.ts` 出去。commit 訊息是「抽離 task calendar 操作邏輯」。

抽出去之後發現：這不就是 service 層嗎。頁面只管 UI，service 管「這個業務上的東西怎麼從資料拼出來」，API 層管「怎麼跟外面要資料」。

```ts
export const calendarService = {
    async fetchYearTasks(filterStatus = 'active') {
        const params = {
            timeMin: dayjs().startOf('year').format(),
            timeMax: dayjs().endOf('year').format()
        };
        return GCalender.getEvents(params);
    },
    aggregateTasks(events: iEvent[]): iAggregaTask[] {
        const taskMap: Record<string, iAggregaTask> = {};
        for (const event of events) {
            const taskId = event.extendedProperties.private.taskId || event.id;
            if (!taskMap[taskId]) { taskMap[taskId] = { /* 從第一個 event 建 task */ }; }
            taskMap[taskId].commits.push({ /* 每個 event 是一次執行 */ });
        }
        return Object.values(taskMap);
    },
    // addTask、updateTask、startTask、endTask...
};
```

這個 side project 兩個月就停了，但「service 層」這個概念留了下來。半年後在 C 專案裡正式長出 `features/*/services/`，就是從這裡來的。

::: tip 回頭看
公司專案裡沒長出 service 層，是因為後端已經把「一個任務是什麼」算好了，前端拿到的 `data` 直接能用。side project 的「後端」是 Google Calendar，它不知道什麼是任務，所以前端被迫自己算。

被迫，才會長出新的一層。
:::

## 群組裡的那段 useApi
2025 年夏天，有人在前端群組貼了他專案裡的 `useApi` composable，問大家怎麼看。

我點開一看：全域旗標、`return null`、攔截器把 400 resolve 回去、`getImage` 跟 `sendRequest` 各自處理 token。

那不就是我的嗎。

不是真的是我的（他不在同一家公司），但長得幾乎一樣。這很合理——大家都看同樣的文章、踩同樣的坑、長出同樣的解法。但看別人的程式碼跟看自己的程式碼是兩種體驗：自己的看了兩年，每一行都有理由；別人的第一眼就看到那些理由站不住。

我在群組裡回了一長串，後來整理成四篇文章：
1. [Axios 封裝，從「能用」到「好用」](../串%20API%20的那些事/01-axios-封裝-從能用到好用)：全域旗標的競爭條件、`return null` 讓呼叫端每次都要兩層 `if`、`getImage` 重複 `sendRequest` 的邏輯
2. [取名是小事，也是大事](../串%20API%20的那些事/02-取名是小事也是大事)：`useApi` 這個名字沒回答「哪個 API」，多個來源時該叫 `useBackendApi`
3. [用 TypeScript 收起你的碼腳](../串%20API%20的那些事/03-用-typescript-收起你的碼腳)：用函式重載分開 GET 跟 POST 的參數約束、`[] as I` 這種假預設值
4. [告別非空斷言](../串%20API%20的那些事/04-告別非空斷言-非同步-composable-的型別安全)：為什麼回傳 `boolean` 會讓 TypeScript 看不懂「成功時 data 一定有值」、改成「成功回傳資料、失敗 throw」

那四篇寫的是「別人的程式碼該怎麼改」。寫完回頭看自己三個專案裡的 `useApi.ts`，每一條都中。

## 然後就是那年秋天
第四篇寫完大約一週，C 專案進了一個「優化資料獲取層」的 commit：`useApi.ts` 刪掉，`useBackendApi.ts` 跟 `useAsyncState.ts` 進來。

三天後，又一個 commit 把 TanStack Query 導進了整個框架。

那三天改掉的東西，比前面兩年加起來還多。下一篇講。
