---
title: 前端還要加水?水合(Hydration)是什麼?
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-09-19'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
# 前端術語｜「水合」(Hydration) 到底是什麼？從一杯即溶咖啡談起

在 **Vue**, **Nuxt**, React, Next.js 或其他現代前端框架的技術文章中，你很可能看過「**水合**」或 **Hydration** 這個詞。它聽起來很學術，但概念其實非常直觀且重要。

讓我們先從一個生活化的例子開始：沖泡一杯即溶咖啡。

### 脫水狀態 (Dehydrated)

想像一下，你手上有一包即溶咖啡粉。這包咖啡粉的狀態是：

-   **靜態的 (static)**、**乾燥的 (dehydrated)**。
-   它包含了咖啡的**核心資料**（咖啡因、香料、糖），但你現在還不能喝它。
-   它沒有「狀態」，例如溫度或液體形態。

這包咖啡粉，就像是我們從伺服器或 API 收到的「**貧瘠資料**」。它可能是純粹的 HTML 字串，或是沒有任何互動能力的 JSON 物件。

### 水合過程 (Hydration)

現在，你要怎麼喝這杯咖啡？你會**加入熱水**。

加入熱水的這個動作，就是「**水合 (Hydration)**」。

當水加進去後，咖啡粉從靜態的粉末，變成了**動態的**、可互動的（你可以喝、攪拌）液體，被賦予了新的**狀態**（溫度、體積）。它「**活了過來**」。

> **核心定義**：在前端開發中，「水合」(Hydration) 指的是**將一份「貧瘠」的、靜態的資料或結構，灌入「水份」（也就是應用程式的狀態、方法、響應性等），使其變成一個「豐滿」的、動態的、可互動的物件的過程。**

## 核心應用：程式碼範例解析

這個概念在前端主要有以下幾種應用場景，核心思想都是一致的。

### 情境一：SSR (伺服器端渲染) - 經典情境

這是 "Hydration" 一詞最原始的出處。

#### 1. 脫水狀態 (伺服器輸出的靜態 HTML)

伺服器（例如 Nuxt）為了 SEO 和首屏加載速度，會直接產生一個完整的 HTML 頁面。這個頁面看起來很完美，但它只是個沒有互動能力的「空殼」。

```html
<div id="app" data-server-rendered="true">
    <h1>商品計數器</h1>
    <p>目前數量: 1</p>
    <button>增加數量</button>
</div>
```

#### 2. 水合過程 (客戶端的 JavaScript)

瀏覽器下載完對應的 Vue (或其他框架) 的 JavaScript 程式碼後，會執行它來「激活」這個靜態頁面。

```javascript
// main.js - 客戶端執行的程式碼
import { createApp } from 'vue';

// Vue App 的定義，包含了狀態和方法
const app = createApp({
    data() {
        return {
            count: 1 // 狀態需要和伺服器端渲染時的狀態匹配
        };
    },
    methods: {
        increment() {
            this.count++;
        }
    }
});

// mount 的過程就是 "Hydration"
// Vue 會接管 #app 元素，而不是重新創建它
// 它會遍歷 DOM，附加事件監聽器，並使狀態具有響應性
app.mount('#app');
```

水合完成後，頁面上的按鈕就變得可以點擊，並且能夠正確地更新 `<p>` 標籤中的數字。頁面從一個靜態文件，變成了一個功能完整的單頁應用 (SPA)。

### 情境二：API 資料轉換
這是將後端資料轉為前端可用狀態的常見模式。

我們從後端獲取了一份查核表題目的「定義」，這是一份純粹的 JSON 資料。

```ts
// GET /api/topics/123 的回應
const rawTopicData = {
    id: 123,
    title: '伺服器硬體是否符合標準？',
    type: 2, // 2 代表單選題
    options: [
        { id: 1, title: '是' },
        { id: 2, title: '否' },
        { id: 3, title: '部分符合' }
    ]
};
```

2. 水合過程 (寫一個 Hydration 函式)

為了讓使用者能在表單中填寫這份查核表，我們需要為它添加一些前端 UI 專用的狀態。最佳實踐是編寫一個專門的函式來處理這個過程。

```js
/**
 * 將從 API 獲取的原始 Topic 資料「水合」成可用於表單填寫的狀態物件
 * @param {object} rawTopic - 來自 API 的原始題目資料
 * @returns {object} - 一個包含 UI 狀態的、豐滿的物件
 */
function hydrateTopicForFilling(rawTopic) {
    // 1. 保留所有原始資料
    const hydrated = { ...rawTopic };

    // 2. 注入「水份」：前端 UI 需要的額外狀態和預設值

    // 用於儲存非選擇題的答案 (例如文字、數字題)
    hydrated.answer = null;

    // 對於選擇題，我們需要知道哪個選項被勾選了
    // 遍歷 options 陣列，為每個選項注入 isChecked 狀態
    hydrated.options = rawTopic.options.map((option) => {
        return {
            ...option,
            isChecked: false // 預設為未勾選
        };
    });

    return hydrated;
}

// --- 使用它 ---
const formTopicState = hydrateTopicForFilling(rawTopicData);

/*
`formTopicState` 的結果會是：
{
  "id": 123,
  "title": "伺服器硬體是否符合標準？",
  "type": 2,
  "answer": null,
  "options": [
    { "id": 1, "title": "是", "isChecked": false },
    { "id": 2, "title": "否", "isChecked": false },
    { "id": 3, "title": "部分符合", "isChecked": false }
  ]
}
*/
```

這個 formTopicState 物件現在可以直接交給 Vue 的 ref 或 reactive，並透過 v-model 綁定到畫面上了。

### 情境三：Class-based Models (物件導向模式)
有時候，「水合」不僅是增加狀態，也可能是增加「行為 (方法)」。

1. 脫水狀態 (純粹的 User JSON)
```ts
const rawUserData = {
    id: 1,
    firstName: 'Vuer',
    lastName: 'Lin'
};
```

2. 水合過程 (實例化一個 Class)
我們可以定義一個 User class，它不僅有屬性，還有方法。

```js
class User {
    constructor(data) {
        // 將原始資料賦值給實例屬性
        this.id = data.id;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
    }

    // 注入「行為」：這個 Class 的實例擁有一個普通 JSON 物件沒有的方法
    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }
}

// 水合過程就是 new 一個 Class
const userInstance = new User(rawUserData);

// 現在我們可以呼叫它的方法
console.log(userInstance.getFullName()); // 輸出: "Vuer Lin"
```

在這個例子中，「水合」的過程是將一份純數據，轉化成一個帶有特定行為（方法）的物件實例。

## 總結
無論在哪種情境下，「水合 (Hydration)」的核心思想都是不變的。

它是一個「活化」或「豐富化」的過程，把一份純粹的、靜態的「資料/結構」，轉化成一個帶有「應用程式上下文（狀態、互動性、響應性、方法）」的、動態的物件。

就像把咖啡粉變成一杯熱咖啡，讓它從「原料」變成可以直接「享用」的成品。這是在現代前端開發中，處理伺服器與客戶端、數據與狀態之間關係的一個至關重要的概念。
