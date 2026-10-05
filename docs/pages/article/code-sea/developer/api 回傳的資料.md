---
title: '串 API 的那些事（五）：新增修改後，後端要不要順便回傳最新資料'
image: ''
description: '新增、修改的請求結束後，要後端順便把最新的資料帶回來，還是另外打一支查詢？整理群組裡的投票與論點，拆開「回傳那一筆」和「回傳整個列表」，最後用 Vue Query 做出 1+2 的折衷。'
keywords: ''
author: Opshell
createdAt: '2024-11-29'
categories:
  - Developer
tags:
  - API
  - RESTful API
  - Vue
  - TypeScript
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依作者的方向改寫成「串 API 的那些事」第五集，群組對話改寫成敘述（拿掉名字、保留論點），修正原本兩段相同的範例程式碼，補上 Vue Query 的折衷做法。前四集的系列目錄還沒加上這一集。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 系列：串 API 的那些事
這個系列從群組裡一段別人貼出來的 axios 封裝開始，一路改到型別安全，每一篇都在收拾上一篇留下的問題。
1. [Axios 封裝，從「能用」到「好用」](./串%20API%20的那些事/01-axios-封裝-從能用到好用)
2. [取名是小事，也是大事](./串%20API%20的那些事/02-取名是小事也是大事)
3. [用 TypeScript 收起你的碼腳](./串%20API%20的那些事/03-用-typescript-收起你的碼腳)
4. [告別非空斷言：非同步 Composable 的型別安全](./串%20API%20的那些事/04-告別非空斷言-非同步-composable-的型別安全)
5. **新增修改後，後端要不要順便回傳最新資料**（這篇）

**這篇的脈絡**：前四篇在處理「怎麼打 API」，這篇往前一步問「打完之後畫面怎麼更新」。這個問題我在群組裡問過，還差點想開投票，結果大家意見分得很開，所以把討論整理起來。
:::

在寫專案的時候，我常常思考一個問題：新增、修改的 API 請求，為了維持畫面和資料庫資料的一致性，在請求結束時要跟後端拿目前最新的資料狀態。我個人用過的做法有兩個：

1. **後端丟結果回來的時候，順便帶新的資料狀態。**
2. **另外開一支查詢的 API。**

各有優缺點：做法一網路請求少一點，頁面刷新也快一點；做法二符合單一職責原則，後端處理也相對單純。

## 懶人包
- 先把問題拆開：「回傳**被改的那一筆**」和「回傳**整個列表**」是兩件完全不同的事。
- 回傳那一筆（包含新增後的 `id`）是 `REST` 的基本操作，不算違反單一職責，後端應該給。
- 回傳整個列表就不建議了：資料一大、批次處理、多人同時操作時，反而更耗頻寬、更不準。
- 群組的投票大多選做法二，常見說法是「全端用 1，分離用 2」；小專案用 1 沒問題，需要後台修改的就選 2。
- 用 `Vue Query` 這類工具可以做到「1+2」：先用回傳的那一筆更新畫面，再在背景重抓列表。

## 技術拆解

### 兩種做法的優缺點

| | 做法一：回應順便帶資料 | 做法二：另外打查詢 |
| :--- | :--- | :--- |
| 請求數 | 一次 | 兩次 |
| 畫面更新 | 快，回來就能用 | 慢一點，要等第二支 |
| 後端職責 | 寫入的同時還要查詢、組資料 | 寫入只管寫入，查詢只管查詢 |
| 回應大小 | 資料一多就變大 | 寫入的回應很小 |
| 彈性 | 後端決定給什麼 | 前端自己拿捏什麼時候抓最新的 |

### 投票結果與大家的論點
那次在群組問，回覆大概是這樣：**選做法二的佔大多數**，有人說「我們大部分用 1」，也有人直接回「1+2」，還有一句我很喜歡的總結：「全端用 1，分離用 2」。~~（然後馬上被吐槽：「不是你一個人做分離嗎？」）~~

把大家的論點整理一下：

**支持做法二的：**
- 小專案用 1 當然沒問題，但都需要後台修改了，一定選 2。
- 本來就該開一支查詢；如果新增進去的是既有的列表 API，再戳它一次就好。
- 多個客戶端同時操作的時候，2 聽起來比較舒服。做法一回來的資料不是最新的還情有可原，畢竟它只代表「後端回給你那一刻」；但做法二是你自己專程去查的，還不準就說不過去了。
- 某些情況下，做法一反而更耗頻寬，例如批次處理的需求，或是要拿的列表開始變大。
- 2 讓前端可以自己拿捏什麼時候要抓最新的。
- 不管怎麼說，單一職責還是比較好，但開發上就真的比較慢。

**支持（或不反對）做法一的：**
- 修改的值是前端自己送的，還要後端再給一次嗎？
- 但新增後產生的 `id`，大家都同意應該要給。

### 新增時回傳 id，算做法一嗎？
這是我當時順便想到的問題：新增時，回傳新增後產生的 `id`，也算在做法一的情況嗎？還是只是新增的基本操作？

我的看法是：**算基本操作**。前端沒有 `id` 就沒辦法做後續的修改、刪除，連 `v-for` 的 `key` 都沒得用。照 `REST` 的慣例，`POST` 建立資源成功會回 `201 Created`，回應裡帶著新資源（或至少它的 `id`、`Location`），這是規格內的事，不是額外的服務。

我自己的習慣是：大部分單筆新增修改，只需要極少的回傳（例如新增後的 `id`），這種我都選 1 做簡單操作。但有時候需要大量回傳、頁面變動比較大，或者有清除暫存的需求，理論上是 2，但有時候還是會掙扎一下。

### 我的結論：回傳「那一筆」，不要回傳「那一堆」
整理下來，真正的分界線不是 1 或 2，而是**回傳的範圍**：

1. **被新增、修改的那一筆，後端應該完整回傳。** 「修改的值是前端送的」只對了一半：`updatedAt`、版本號、後端算出來的欄位（總金額、狀態）、被正規化過的值（去空白、轉小寫），前端都不知道。後端回傳的才是真正存進資料庫的樣子。
2. **整個列表不要塞在寫入的回應裡。** 列表要不要重抓、什麼時候抓、抓第幾頁，交給前端決定。

用餐廳來比喻：你加點一道菜，服務生回你「好的，這是您的牛肉麵，加大、不要蔥」，這是確認那一筆；但他不需要把整張帳單重印一次給你，要看帳單你自己會說。

順帶一提，群組裡還有人問：「RESTful 有沒有真的後端實作出不同的 method（`GET`、`POST`、`PUT`、`DELETE`）都同一支 API？」有，而且這就是 `REST` 的正常做法，同一個網址搭配不同的方法就是不同的操作，細節可以看[關於 RESTful API 的那些事](./RESTful-API)。

## 例子與對比

### 做法一：用回傳的那一筆更新畫面
原本草稿裡的兩個範例程式碼貼成一模一樣的了，這裡重寫一次：

```ts
import { ref } from 'vue';
import api from '@/api';

interface Todo {
    id: number;
    title: string;
    done: boolean;
    updatedAt: string;
}

const todos = ref<Todo[]>([]);

async function updateTodo(id: number, payload: Partial<Omit<Todo, 'id'>>): Promise<void> {
    // 後端回傳修改後的那一筆（包含 updatedAt 這類前端不知道的欄位）
    const { data: updatedTodo } = await api.patch<Todo>(`/todos/${id}`, payload);

    const index = todos.value.findIndex((todo) => todo.id === id);
    if (index !== -1) { todos.value[index] = updatedTodo; }
}

async function createTodo(title: string): Promise<void> {
    // 新增回傳的那一筆，至少要有後端產生的 id
    const { data: createdTodo } = await api.post<Todo>('/todos', { title });

    todos.value.unshift(createdTodo);
}
```

### 做法二：寫入完再重抓
```ts
async function fetchTodos(): Promise<void> {
    const { data } = await api.get<Todo[]>('/todos');

    todos.value = data;
}

async function updateTodoThenRefetch(id: number, payload: Partial<Omit<Todo, 'id'>>): Promise<void> {
    await api.patch(`/todos/${id}`, payload);
    // 寫入只管寫入，畫面要的資料自己再拿一次
    await fetchTodos();
}
```

### 1+2：用 Vue Query 兩個都要
自己管 `ref` 的話，做法一和做法二要二選一；用 `@tanstack/vue-query` 這類伺服器狀態管理工具，就可以兩個都要：先用回傳的那一筆**立刻**更新快取，再讓列表在背景**重新驗證**。

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import api from '@/api';
import type { Todo } from '@/types/todo'; // 跟上面同一個 Todo 介面

export function useTodos() {
    const queryClient = useQueryClient();

    const todosQuery = useQuery({
        queryKey: ['todos'],
        queryFn: () => api.get<Todo[]>('/todos').then((res) => res.data)
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...payload }: Pick<Todo, 'id'> & Partial<Omit<Todo, 'id'>>) =>
            api.patch<Todo>(`/todos/${id}`, payload).then((res) => res.data),
        onSuccess: (updatedTodo) => {
            // 做法一：用回傳的那一筆馬上更新畫面
            queryClient.setQueryData<Todo[]>(['todos'], (oldTodos) =>
                oldTodos?.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
            );
            // 做法二：標記過期，背景重抓，順便吃到別人同時做的修改
            queryClient.invalidateQueries({ queryKey: ['todos'] });
        }
    });

    return { todosQuery, updateMutation };
}
```

這樣後端只需要回傳「那一筆」，不用替每個畫面組列表；前端畫面馬上有反應，多人同時操作的情況也會在背景被修正。

### 什麼時候選哪個

| 情境 | 建議 |
| :--- | :--- |
| 單筆新增、修改，畫面只影響那一筆 | 回傳那一筆，前端直接替換 |
| 新增之後列表的排序、分頁會變 | 回傳那一筆 + 重抓目前這一頁 |
| 批次處理、一次改很多筆 | 回傳成功與失敗的摘要，再重抓 |
| 多人同時編輯同一份資料 | 重抓為主，搭配版本號防覆蓋 |
| 有清除快取、頁面大變動的需求 | 重抓 |

## 結論
「要不要順便回傳最新資料」這題，吵到最後會發現大家其實沒那麼對立：被改的那一筆，後端本來就該給；整個列表要不要重抓，交給前端決定。

真要說的話，答案就是那句「1+2」。只是下次在群組問問題之前，記得先確認一下自己能不能開投票 ~~（不能，我試過了）~~。
