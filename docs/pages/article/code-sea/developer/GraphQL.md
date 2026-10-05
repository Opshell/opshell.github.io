---
title: 'GraphQL 是什麼？跟 REST 比起來，什麼時候該用它'
image: ''
description: 'GraphQL 讓前端自己決定要拿哪些欄位，解決 REST 拿太多、拿太少、一頁要打好幾支的痛點，但快取、N+1 與權限也跟著變難。整理兩者的差異與適用場景。'
keywords: ''
author: Opshell
createdAt: '2025-02-12'
categories:
  - Web Application
tags:
  - GraphQL
  - RESTful API
  - API
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的參考連結（GraphQL 與 RESTful API 應用的場景與分析）寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
前端串 API 久了，常常會聽到「改用 `GraphQL` 就不用一直跟後端要欄位了」。這篇寫給已經熟悉 `REST`、想知道 `GraphQL` 到底解決了什麼、又帶來什麼新麻煩的前端工程師，最後回答「我的專案該不該換」。
:::

## 懶人包
- `REST` 是「後端開好菜單，一道菜一支 API」；`GraphQL` 是「一支 API，前端自己點要哪些欄位」。
- `GraphQL` 主要解決三件事：拿太多（over-fetching）、拿太少（under-fetching）、一個畫面要打好幾支 API。
- 代價是快取、N+1 查詢、權限控管、錯誤處理都變得比較難，後端的工作量其實是變多的。
- 資源單純、CRUD 為主、需要 HTTP 快取的，`REST` 就很夠；多種客戶端、畫面要拼很多關聯資料的，`GraphQL` 才划算。

## 技術拆解

### REST 的三個老毛病
先講痛點。假設要做一個「文章頁」，畫面上要有文章內容、作者名字跟頭像、最新三則留言。用 `REST` 通常長這樣：

```text
GET /api/posts/42
GET /api/users/7
GET /api/posts/42/comments?limit=3
```

1. **拿太多（over-fetching）**：`/api/users/7` 回傳了作者的生日、地址、註冊時間⋯⋯我只要名字跟頭像。
2. **拿太少（under-fetching）**：`/api/posts/42` 只給我 `authorId`，我得再打一支才拿得到作者。
3. **請求太多**：一個畫面三支 API，手機網路慢的時候，瀑布流一排開就很有感。

解法當然有，例如請後端開一支 `/api/posts/42?include=author,comments`，但每換一個畫面就要談一次，前後端的溝通成本就這樣一點一滴累積起來。

### GraphQL 怎麼解
`GraphQL` 是一種查詢語言加上一份型別定義（Schema）。後端只開**一個端點**（通常是 `POST /graphql`），把「有哪些資料、彼此怎麼關聯」用 Schema 描述出來，前端照著 Schema 寫查詢，要什麼就寫什麼：

```graphql
query PostPage($id: ID!) {
    post(id: $id) {
        title
        content
        author {
            name
            avatar
        }
        comments(limit: 3) {
            content
            createdAt
        }
    }
}
```

回來的 JSON 形狀跟查詢一模一樣，不多不少。這就像從「套餐」變成「自助餐」：菜色（Schema）是後端決定的，但夾什麼、夾多少是你自己決定的。

三個核心名詞記一下就好：

| 名詞 | 作用 | 對應到 REST |
| :--- | :--- | :--- |
| `Query` | 讀取資料 | `GET` |
| `Mutation` | 新增、修改、刪除 | `POST`／`PUT`／`PATCH`／`DELETE` |
| `Subscription` | 訂閱即時資料（通常走 WebSocket） | 沒有直接對應，要另外接 WebSocket 或 SSE |

### 換過去之後會遇到的事
自助餐聽起來很美好，但開過自助餐廳的人都知道，後台會累死。

1. **HTTP 快取幾乎沒用了**：`REST` 的 `GET /api/users/7` 可以直接被瀏覽器、CDN 快取；`GraphQL` 大多是 `POST` 到同一個網址，快取得靠 `Apollo Client`、`urql` 這類客戶端自己做正規化快取，或是額外設定 persisted queries。
2. **N+1 查詢**：查 10 篇文章、每篇帶作者，天真的寫法會變成 1 次查文章 + 10 次查作者。後端通常要搭配 `DataLoader` 這類批次載入的工具。
3. **查詢可以很深、很貴**：前端（或惡意的人）可以一路巢狀查下去，後端得限制查詢深度、複雜度，不然一支請求就能把資料庫拖垮。
4. **權限要細到欄位**：`REST` 是「這支 API 誰能打」，`GraphQL` 變成「這個欄位誰能看」。
5. **錯誤處理不一樣**：`GraphQL` 常常回 HTTP `200`，錯誤放在回應的 `errors` 陣列裡，而且可能「部分成功」，前端的錯誤處理邏輯要重寫。
6. **檔案上傳**：規格本身沒有定義，通常另外開一支 `REST` 端點處理比較省事。

## 例子與對比

### 同一個畫面，兩種寫法
```ts
// REST：三支請求，前端自己組
async function fetchPostPageByRest(id: number) {
    const post = await fetch(`/api/posts/${id}`).then((res) => res.json());
    const [author, comments] = await Promise.all([
        fetch(`/api/users/${post.authorId}`).then((res) => res.json()),
        fetch(`/api/posts/${id}/comments?limit=3`).then((res) => res.json())
    ]);

    return { ...post, author, comments };
}

// GraphQL：一支請求，形狀由查詢決定
const POST_PAGE_QUERY = `
    query PostPage($id: ID!) {
        post(id: $id) {
            title
            content
            author { name avatar }
            comments(limit: 3) { content createdAt }
        }
    }
`;

async function fetchPostPageByGraphql(id: string) {
    const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: POST_PAGE_QUERY, variables: { id } })
    }).then((response) => response.json());

    if (res.errors?.length) {
        throw new Error(res.errors[0].message);
    }

    return res.data.post;
}
```

注意 `GraphQL` 那段：就算 HTTP 狀態是 `200`，也要自己檢查 `errors`。

### 什麼時候選誰

| 情境 | 比較適合 | 理由 |
| :--- | :--- | :--- |
| 後台管理系統、CRUD 為主 | `REST` | 資源跟畫面幾乎一對一，`GraphQL` 的彈性用不到 |
| 公開 API、需要 CDN 快取 | `REST` | `GET` 加快取就是最便宜的效能 |
| 同一份資料要給 Web、App、第三方用 | `GraphQL` | 每個客戶端要的欄位不同，不用替每個開一支 |
| 畫面要拼很多關聯資料（社群、電商商品頁） | `GraphQL` | 一次請求拿齊，少掉瀑布流 |
| 前後端是同一個人或同一個小團隊 | `REST` | 溝通成本本來就低，`GraphQL` 的優勢不明顯 |
| 已經有一堆微服務，想給前端一個統一入口 | `GraphQL` | 當作 BFF（Backend for Frontend）聚合層很好用 |

::: tip 不一定要二選一
很多團隊是「核心資源用 `REST`，複雜的查詢頁另外開 `GraphQL`」；如果是 TypeScript 全端專案，也可以用 `tRPC`、`ts-rest` 這類方案直接共用型別，一樣能解決「前後端欄位對不上」的痛。
:::

### 延伸閱讀
- [GraphQL 與 RESTful API 應用的場景與分析](https://vocus.cc/article/63e4b449fd89780001242a45)
- [GraphQL 官方文件](https://graphql.org/learn/)

## 結論
`GraphQL` 不是 `REST` 的下一代，它是另一種分工方式：把「決定拿什麼」的權力交給前端，把「怎麼拿得又快又安全」的責任留給後端。

如果換 `GraphQL` 的理由只是「聽說很潮」，請先想想後端同事的頭髮 ~~（還有你自己的）~~。痛點真的是欄位對不上、一頁打五支 API，再來考慮也不遲。
