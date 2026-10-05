---
title: 'API 串接進化史（八）：回頭看，兩套並存的 useApi，跟我現在會怎麼起手'
image: ''
description: 'B 專案到現在還是 23 個檔用舊 useApi、15 個檔用新的，兩套攔截器掛在同一個 axios 上；同事開了第三代拆成五個檔，說要統一替換，但一個呼叫端都沒換。系列收尾：十幾年串 API 學到的五件事，以及現在開新專案的起手式。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - Developer
tags:
  - API
  - Axios
  - TanStack Query
  - 架構
  - 心路歷程
editLink: true
isPublished: false
---
::: warning 草稿
這篇是 Claude 照 git 歷史寫的草稿。專案以 A／B／C 代稱；commit 訊息、日期、分支、API 路徑已在 10-06 去識別化。「現在會怎麼起手」那段是照 C 專案最終版的結構整理的，如果你現在的想法已經不一樣，直接改。看完改成自己的話再刪掉這個區塊。
:::

::: info 系列：API 串接進化史
從大學的打磚塊一路到 TanStack Query，每一次改寫都是被某個坑推著走的。這個系列不講「最佳實踐」，講的是我為什麼會變成現在這樣。
1. [打磚塊、AJAX 跟 jQuery，我是怎麼被網路通訊啟蒙的](./01-打磚塊-ajax-跟-jquery-我是怎麼被網路通訊啟蒙的)
2. [2023：一支叫 getData 的函式](./02-2023-一支叫-getdata-的函式)
3. [2024：攔截器、token 刷新，以及我把它刪掉](./03-2024-攔截器-token-刷新-以及我把它刪掉)
4. [composable 化的代價：我把攔截器塞進函式裡](./04-composable-化的代價-我把攔截器塞進函式裡)
5. [三個專案，三份一模一樣的 useApi](./05-三個專案-三份一模一樣的-useapi)
6. [那三天：useBackendApi、useAsyncState，然後 TanStack Query](./06-那三天-usebackendapi-useasyncstate-然後-tanstack-query)
7. [TanStack Query 之後我踩的坑](./07-tanstack-query-之後我踩的坑)
8. **回頭看：兩套並存的 useApi，跟我現在會怎麼起手**（這篇）

**這篇的脈絡**：前七篇講的是「怎麼變好的」。這篇講沒變好的部分：一個跑了兩年的專案，新舊兩套封裝並存，誰都不敢拆。然後把這十幾年學到的東西整理成幾句話，給下一個專案的自己。
:::

## B 專案：新舊並存
C 專案可以在三天內把 API 層翻掉，是因為它那年秋天的時候才三個月大，用 `useApi` 的檔案不到十個。

B 專案（一個前台加後台的系統）不行。它 2024 年春天開案，到 2025 年秋天 `useBackendApi` 進來的時候，已經有 40 個檔在 `import useApi from '@hooks/useApi'`。那 40 個檔背後是 1000 多個 commit、三個人、一年半的功能。

所以 B 專案的做法是：**新的 API 用新的，舊的不動。**

2026 年春天的狀態：
- `hooks/useApi.ts`（舊）：23 個檔在用
- `hooks/useBackendApi.ts`（新）：15 個檔在用
- 兩個檔都 `export default function useApi()`——是的，新的那個函式名字也叫 `useApi`，只有檔名不一樣
- 兩個檔都在模組層各自註冊了一個 `axios.interceptors.response`

最後那點是真的有問題的。兩個模組都被載入時，同一個 axios 上掛著兩個回應攔截器，一個 500 回來會跑兩次。舊的那個遇到 500 會 `if (showNetErrorDialog) { return; }`——如果旗標已經是 `true`，它直接 `return undefined`，請求就這樣以 `undefined` 結束，連 reject 都沒有。

這個狀況我讀程式碼推出來的，沒實際重現過。因為舊攔截器跳 Dialog 用的是全域旗標，新攔截器用的是 `QDialog.isActive`，兩邊互相不知道對方的存在，但剛好都會檢查「有沒有 Dialog 開著」，所以畫面上只會看到一個。症狀又被吸收了。

::: tip 第四篇說過的
你的 bug 有多快被修，取決於它有多醜。這個不醜，所以它會活很久。
:::

## 同事的第三代
2026 年春天，同事從開發分支拉了一條新分支，commit 訊息的意思是：把兩套 useApi 合併，並把呼叫端統一替換掉。

內容是 `src/http/` 底下五個檔：
```
http/
├── index.ts          useApi()：sendRequest、getImage
├── interceptors.ts   攔截器，在 main.ts 用副作用 import 註冊一次
├── types.ts          iResult、iApiOptions、eResponseStatus、tRawResponse
├── constants.ts      HTTP_ERROR_MESSAGES、HTTP_ERROR_TITLES、DIALOG_TIMEOUT
└── messageParser.ts  extractMessages、ensureMessages
```
拆得很好。攔截器終於從 composable 檔案裡獨立出來，在 `main.ts` 裡 `import '@http/interceptors'` 註冊一次，第四篇講的那個問題從結構上就不會再發生。Dialog 去重從「有沒有任何 Dialog 開著」改成 `Map<key, boolean>` 依錯誤類型去重，還加了 10 秒逾時保護防止旗標卡死。錯誤訊息從散在各處的字串集中成常數表。

然後這條分支：
- 沒有改任何一個呼叫端。23 加 15 個檔還是各自 import 舊的跟新的。
- 沒有刪舊檔。所以如果三個模組都被載入，axios 上會有**三個**攔截器。
- 沒有合回開發分支。開發分支之後又往前走了四個 commit，分支就停在那裡。

commit 訊息說要統一替換，實際上是「寫了一個更好的版本放在旁邊」。

我完全理解為什麼。替換 38 個檔的 import 是一件無聊但不難的事；難的是每個檔替換之後都要測一次，而這個專案沒有自動化測試，38 個檔代表 38 次手動點點點。在一個趕進度的專案裡，沒有人有這個時間，所以「寫一個新的放旁邊」是唯一能在一天內做完的事。

::: tip 這不是在怪誰
我在 C 專案裡做的事跟他一樣：舊的 `useAsyncState` 沒刪、`VITE_USE_MOCK` 沒刪、A 專案的 `ApiClient` 放了半年才刪。差別只是我的死碼沒有副作用，他的多了一個攔截器。

技術債不是「寫得爛」，是「知道怎麼寫好，但沒時間換」。
:::

## 十幾年學到的五件事
從打磚塊到這裡，如果要壓成幾句話：

### 1. 封裝是為了「只在一個地方認後端」
2023 年的 `getData` 做對的就是這一件事：後端的格式只在這裡翻譯一次。後來加的所有東西——攔截器、泛型、重載、Zod——都是在把「認後端」這件事做得更徹底。jQuery 時代每頁寫一次 `$.ajax` 不是不會封裝，是沒意識到自己正在到處認後端。

### 2. 副作用只做一次的，放模組層
攔截器、QueryClient、store 初始化。放進每次呼叫都會跑的函式裡，就是第四篇那個坑。這條規則很簡單，但兩個專案都犯了，一個花 15 天、一個花 16 個月才修。

### 3. 失敗要 throw，不要 return null
`return null` 是 2023 年最影響深遠的錯誤決定。它讓每個呼叫端都要多一層 `if`，讓錯誤資訊消失在 console，最後讓整套封裝跟 TanStack Query 天生不相容。「成功回傳資料、失敗 throw」才是 Promise 設計出來的用法。

### 4. HTTP 層、endpoint 層、狀態層，三件事分開
- `sendRequest` 管 HTTP：把任何結果包成 `iResult`，不 throw
- API 函式管 endpoint：驗參數、呼叫、判 `status`、驗回傳、throw `Errors`
- `useQuery` / `useMutation` 管時機與狀態：什麼時候抓、放多久、誰在等

2023 年一支函式做三件事，2025 年拆成三層。拆開的好處不是「比較乾淨」，是每一層可以獨立換掉：換 fetch 只動第一層，換後端格式只動第二層，不用 TanStack Query 只動第三層。

### 5. 沒有症狀的 bug 最危險
寫反的 `if`、重複註冊的攔截器、兩套攔截器並存。每一個都因為症狀被別的東西吸收而活了很久。而且它們會跟著複製貼上到下一個專案。

對策不是「更小心」——人不可能每次都小心。對策是**讓錯誤有症狀**：Zod 驗證失敗就 throw、`parseWithSchema` 在 DEV 印出哪個欄位不對、`retry: 1` 讓失敗早點浮出來。你不能靠眼睛找 bug，你要讓 bug 自己叫。

## 現在開新專案，我會怎麼起手
照 C 專案 2026 年的結構，但把那些「等有空再改」的事一開始就做掉：

```
src/
├── main.ts                      QueryClient（staleTime 5 分、retry 1、refetchOnWindowFocus false）
├── shared/
│   ├── http/
│   │   ├── interceptors.ts      在 main.ts 註冊一次，用 import router 不用 useRouter
│   │   ├── client.ts            sendRequest：重載、options、永遠回傳 iResult、不 throw
│   │   └── types.ts
│   └── utils/
│       ├── errors.ts            Errors（帶 _tag）、isErrors、normalizeError
│       └── zod.ts               parseWithSchema、snakeToCamel、camelToSnake
└── features/<feature>/
    ├── apis/                    endpoint：Params.parse → sendRequest → throw → Parser
    ├── schema/                  Zod：Core、Params、Payload、Parser；型別用 z.input / z.output 推
    ├── services/                多支 API 組合的 use case
    ├── hooks/                   這個 feature 的 useQuery / useMutation
    └── index.ts
```

幾個跟現在不一樣的決定：

- **`sendRequest` 不是 composable。** 它不需要 `setup()` 的 context，token 從 store 拿，store 用 `useUserStore()` 在模組層拿就好。叫它 `client.ts`，export 一個函式，API 檔直接 import。`useApi()` 這個名字從 2024 年底背到現在，該放下了。
- **攔截器第一天就在 `main.ts` 註冊。** 不要等到發現重複才搬。
- **每個 `useQuery` 都寫 `staleTime`。** 不用預設的 0。第七篇那個查不到來源的 GET，一半的機率是這個。
- **queryKey 用 factory。** C 專案到現在都是手寫陣列 `['order', 'list', params]`，打錯一個字就 invalidate 不到。這個我還沒做，但下個專案會。
- **第一個 feature 做完就寫一個 API 函式的測試。** 不是為了覆蓋率，是為了之後替換封裝的時候有東西可以跑。B 專案那 38 個檔換不動，就是因為沒有這個。

## 結語
這個系列寫了八篇，從大學那顆會跳的球寫到 TanStack Query 的 `staleTime`。中間經過一支叫 `getData` 的函式、三個洞的 token 刷新、塞進函式裡的攔截器、三份一模一樣的複製貼上、三天的大翻修、四個形狀很怪的坑，跟一個到現在還是兩套並存的專案。

回頭看，沒有一次改寫是「我想到了更好的做法」。每一次都是被某個坑推著走：token 會過期所以要攔截器、攔截器拿不到 router 所以改 composable、composable 重複註冊所以搬回去、三個 ref 太煩所以手刻 `useAsyncState`、`useAsyncState` 做不了快取所以 TanStack Query、TanStack Query 要 throw 所以改契約、契約改了型別守不住所以 Zod。

每一步都只往前一格。但十幾年下來，回頭看已經看不到起點了。

這大概就是為什麼要寫這個系列。不是為了告訴誰「應該這樣做」——每個專案的坑都不一樣。是為了提醒自己：下次坐在那邊看著剛重構完的東西心想「終於」的時候，記得那只是下一個「終於」的起點。

~~然後記得把 `useAsyncState.ts` 刪掉。~~
