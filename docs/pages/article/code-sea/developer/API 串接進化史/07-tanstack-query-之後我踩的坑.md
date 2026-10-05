---
title: 'API 串接進化史（七）：TanStack Query 之後我踩的坑'
image: ''
description: 'instanceof 在 HMR 下說謊、onSuccess 裡不要重設表單、一個查不到來源的第三次 GET、用 Promise 把 Modal 變成可以 await 的東西。導入 TanStack Query 之後的四個坑，每一個都讓我重新理解「狀態」這兩個字。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - Developer
tags:
  - TanStack Query
  - Vue
  - vee-validate
  - TypeScript
  - 心路歷程
editLink: true
isPublished: false
---
::: warning 草稿
這篇是 Claude 照你跟 Gemini 的對話記錄寫的草稿。四個坑的結論是對話裡最後確定的版本，中間繞路的過程我有濃縮。第三個坑（神祕的第三次 GET）對話裡沒有結案——Gemini 猜了三次都不對，你說「之前的錯誤不是你說的這樣 但是沒關係 目前沒有影響」。所以那段我寫成「沒查出來」，如果你後來找到原因就補上去。專案以 A／B／C 代稱；commit 訊息、日期、分支、API 路徑已在 10-06 去識別化。看完改成自己的話再刪掉這個區塊。
:::

::: info 系列：API 串接進化史
從大學的打磚塊一路到 TanStack Query，每一次改寫都是被某個坑推著走的。這個系列不講「最佳實踐」，講的是我為什麼會變成現在這樣。
1. [打磚塊、AJAX 跟 jQuery，我是怎麼被網路通訊啟蒙的](./01-打磚塊-ajax-跟-jquery-我是怎麼被網路通訊啟蒙的)
2. [2023：一支叫 getData 的函式](./02-2023-一支叫-getdata-的函式)
3. [2024：攔截器、token 刷新，以及我把它刪掉](./03-2024-攔截器-token-刷新-以及我把它刪掉)
4. [composable 化的代價：我把攔截器塞進函式裡](./04-composable-化的代價-我把攔截器塞進函式裡)
5. [三個專案，三份一模一樣的 useApi](./05-三個專案-三份一模一樣的-useapi)
6. [那三天：useBackendApi、useAsyncState，然後 TanStack Query](./06-那三天-usebackendapi-useasyncstate-然後-tanstack-query)
7. **TanStack Query 之後我踩的坑**（這篇）
8. [回頭看：兩套並存的 useApi，跟我現在會怎麼起手](./08-回頭看-兩套並存的-useapi-跟我現在會怎麼起手)

**這篇的脈絡**：上一篇把結構拆乾淨了，這篇講拆乾淨之後遇到的事。四個坑，兩個跟 TanStack Query 本身有關，兩個是它逼我重新想清楚的東西。順序照我踩到的時間。
:::

## 坑一：instanceof 說謊
上一篇的 `Errors` 類別，用法是這樣：
```ts
onError: (error) => {
    const messages = error instanceof Errors ? error.messages : [error.message];
    errorDialog(messages, '儲存失敗');
}
```
某天開始，`error instanceof Errors` 一直是 `false`。但 `console.log(error)` 展開來看，`messages` 陣列明明在裡面，`name` 也是 `'Errors'`。

`error instanceof Error` 是 `true`。`error instanceof Errors` 是 `false`。

查了很久。最後發現：**只在開發環境發生，而且 Ctrl+F5 整頁重載之後就好了。**

這是 Vite HMR 的鍋。`instanceof` 檢查的是原型鏈——「這個物件的原型鏈上有沒有 `Errors.prototype`」。當我改了 `authService.ts` 存檔，HMR 只重載這一個模組，它 import 的 `Errors` 是**新的一份**；而還沒被重載的 `LoginForm.vue` 手上的 `Errors` 是**舊的一份**。兩個 `Errors` 類別，兩個 `prototype`，`instanceof` 當然是 `false`。

而 `Error` 是全域的，只有一份，所以 `instanceof Error` 永遠對。

解法是不要靠血統，靠品牌：
```ts
export class Errors extends Error {
    public readonly _tag = 'Errors'; // 身份證
    public messages: string[];
    constructor(messages: string[]) {
        super(messages.join(', '));
        this.messages = messages;
        this.name = 'Errors';
    }
}

export function isErrors(error: unknown): error is Errors {
    return typeof error === 'object' && error !== null && (error as Errors)._tag === 'Errors';
}
```
`isErrors` 只看物件身上有沒有 `_tag === 'Errors'`，不管它是哪個模組 `new` 出來的。而且它是 type guard，`if (isErrors(error))` 裡面 TypeScript 知道 `error.messages` 存在。

這個坑在正式環境永遠不會發生（沒有 HMR），但它會讓你在開發的時候每隔幾分鐘懷疑一次人生。

::: tip 順便學到的
`instanceof` 在跨模組實例、iframe、Web Worker 之間都不可靠。想要可靠的型別判斷，看結構，不看血統。TypeScript 本來就是結構型別系統，這樣反而比較一致。
:::

## 坑二：onSuccess 裡不要碰表單
C 專案有一頁設定維護，一個類別的標題可以就地編輯。用 vee-validate 的 `useForm` 管表單，`useQuery` 拿資料，`useMutation` 存。

第一版的 `useMutation`：
```ts
const updateCategoryMutation = useMutation({
    mutationFn: updateCategoryAPI,
    onMutate: async (updated) => { /* 樂觀更新：先改快取 */ },
    onError: (error, _vars, context) => { /* 回滾 */ },
    onSettled: (data, _err, _vars, context) => {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
        resetForm({ values: deepCopy(data) }); // 用後端回傳的資料重設表單
    }
});
```
看起來很完整：樂觀更新、失敗回滾、成功後同步。問題在最後那行 `resetForm`。

想像使用者手速很快：改標題 → 按儲存 → 在 API 回來之前又改了幾個字。API 回來，`onSettled` 用**後端回傳的（舊的）標題**重設表單，使用者剛打的字被吃掉了。

跟 Gemini 討論了十幾輪，中間繞了「`onSuccess` 用 `values.value` 重設（保留輸入但丟掉後端真相）」、「智慧合併（比較 `variables` 跟 `values` 判斷使用者有沒有再改）」兩個版本，越寫越複雜。

最後我問了一句：「我們不是已經有一個 `watch(currentCategory, ...)` 在把 Query 的資料同步進表單了嗎？那 `onSuccess` 裡再做一次不是重複的嗎？」

是重複的。正確的 `onSuccess` 只做一件事：
```ts
onSuccess: (dataFromServer) => {
    queryClient.setQueryData(queryKey, (old) => {
        const next = deepCopy(old);
        const i = next.categories.findIndex(c => c.id === dataFromServer.id);
        if (i !== -1) { next.categories[i] = dataFromServer; }
        return next;
    });
    // 不碰表單。快取更新 → computed 重算 → watch 觸發 → 表單自己同步
}
```
把真相丟回快取，然後**相信響應式系統**。`currentCategory` 是從快取算出來的 computed，它變了，`watch` 就會跑，`watch` 裡本來就有 `resetForm`。`onSuccess` 不需要知道表單存在。

::: tip 回頭看
這是 TanStack Query 最難轉過來的地方：它不是「請求機」，是「同步機」。你不該在回呼裡想「資料回來了，我要做什麼」，你該想「快取是真相，畫面只是快取的投影」。只要把真相更新對，投影會自己對。

群組裡有位大大說得更狠：「`useQuery` 不該有 `onSuccess`，你需要它代表你的心智模型錯了。」我花了十幾輪對話才同意。
:::

順便一提，那頁還有一個「`[Vue warn] Set operation on key "title" failed: target is readonly`」的警告，追到最後是 vee-validate 的 `values` 直接 `v-model` 跟 TanStack Query 回傳的 readonly 資料打架。解法是改用 `defineField('title')` 拿一個專門給 `v-model` 的 ref，不要直接動 `values`。這個就不展開了。

## 坑三：查不到來源的第三次 GET
帳號管理那頁：列表用 `useQuery(['users', 'list', params])`，點編輯打開 Modal，Modal 裡 `useQuery(['users', 'detail', id])` 拿單筆，存完 `invalidateQueries(['users', 'list'])` 刷列表。

Network 面板看到的是：
1. `GET /users/42`（打開 Modal）
2. `GET /users/42`（存完之後）
3. `GET /users?page=4`（列表刷新）

第二個 GET 是誰發的？我沒有 invalidate `['users', 'detail']`，Modal 關了 query 應該是 inactive，`refetchOnWindowFocus` 也關了。

跟 Gemini 來回了四輪。它猜「`invalidateQueries(['users'])` 前綴匹配到 detail」——沒有，我只 invalidate 了 `['users', 'list']`。猜「父層有遺留的 `useQuery`」——沒有，父層只有 `prefetchQuery`。猜「`prefetchQuery` 被重新渲染觸發了」——我在 handler 裡加了 `debugger`，沒有再進去。最後猜「你的 update API 裡面自己又 GET 了一次」——也不是。

我甚至用 `queryCache.subscribe` 監聽了所有快取事件，detail query 從頭到尾沒有被標記成 stale。

✍️ **這個坑到那次對話結束都沒有結案。** 後來專案趕進度，而且那個多出來的 GET 除了多一次請求之外沒有壞處——資料反而更新。所以我標了 TODO 就往下走了。如果你後來找到原因，寫在這裡。

我把它留在文章裡的原因是：這是 TanStack Query 最讓人不安的地方。它做了太多「幫你」的事——stale 就重抓、focus 就重抓、mount 就重抓、invalidate 連 inactive 的也重抓——你不知道某次請求是哪一條規則觸發的。Devtools 能看狀態，但看不到「誰觸發了這次 fetch」。

學到的不是答案，是一個習慣：**每個 `useQuery` 都明確寫 `staleTime`**，不要用預設的 0。預設 0 代表「資料一落地就過期」，任何風吹草動都會重抓。你以為你在做快取，其實你在做自動重抓。

## 坑四：Modal 不能 await
登入成功之後，如果 `is_pwd_expired` 是 `true`，要先跳「密碼過期」的 Modal 讓使用者改密碼，改完才能導向首頁。

```ts
onSuccess: async (userData) => {
    if (userData.is_pwd_expired) {
        isRePasswordModalShow.value = true; // 這行不會等
    }
    router.push({ name: 'Admin' }); // 立刻跑
}
```
`isRePasswordModalShow.value = true` 只是改一個 ref，不會卡住。Modal 開了，但頁面已經跳走了。

這跟 TanStack Query 沒關係，但它是我在 `useMutation` 的 `onSuccess` 裡遇到的，而且解法很漂亮，所以放這裡。

解法是把「開 Modal 並等它完成」包成一個 Promise：
```ts
function promptForPasswordReset(): Promise<iResult> {
    isRePasswordModalShow.value = true;
    return new Promise((resolve) => {
        appBus.once('re-password-success', (res) => {
            isRePasswordModalShow.value = false;
            resolve(res);
        });
    });
}

onSuccess: async (userData) => {
    if (userData.is_pwd_expired) {
        await promptForPasswordReset(); // 現在會等了
    }
    router.push({ name: 'Admin' });
}
```
Modal 裡改密碼成功就 `appBus.emit('re-password-success', res)`，Promise resolve，`onSuccess` 繼續往下。因為「不改密碼不能離開」是硬需求，所以沒有 reject，Modal 也設成 `persistent`。

`appBus` 是 VueUse 的 `useEventBus`。這裡又踩了一個小坑：v10 之後 `useEventBus` 要給一個 key，而且要型別安全的話得用 `EventBusKey`：
```ts
export interface AppEvents {
    're-password-success': [iResult]; // 注意是陣列，代表 listener 的參數列表
}
export const RePasswordBusKey: EventBusKey<AppEvents> = Symbol('re-password-events');

// 兩邊都用同一把 key
const appBus = useEventBus(RePasswordBusKey);
```
Gemini 在這裡連錯三次（先說不用 key、再說 payload 不用包陣列、最後我提醒它才想起 `EventBusKey`）。AI 對版本敏感的 API 真的不可靠，查文件比較快。

::: tip 這個模式可以到處用
「開一個 UI、等使用者做完、拿結果繼續」——確認框、選擇器、任何需要使用者介入的流程。把它包成 Promise，呼叫端就能寫成直線的 `await`，不用在十幾個 ref 跟 watch 之間追流程。
:::

## 四個坑的共同點
回頭看，這四個坑分別是：
- 模組系統（HMR）
- 響應式系統（快取 → computed → watch）
- TanStack Query 的自動行為（stale、refetch）
- 非同步流程控制（Promise 化 UI）

沒有一個是「axios 怎麼用」。從 2023 年的 `getData` 到這裡，問題的層次整個往上移了：以前煩惱的是 header 怎麼帶、錯誤怎麼轉格式；現在煩惱的是狀態從哪來、誰是真相、什麼時候該相信框架。

這大概就是「進化」的意思。不是問題變少了，是問題變得比較有趣了。

下一篇收尾：B 專案那兩套並存的 `useApi`、同事開的第三代、以及如果現在要開新專案，我會怎麼起手。
