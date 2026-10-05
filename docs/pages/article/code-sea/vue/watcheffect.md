---
title: watchEffect 不好嗎？我為什麼不愛用它
image: ''
description: 'watchEffect 會自動收集依賴，寫起來很爽，但一不小心就把不該追蹤的資料也追蹤進去，出事時還很難溯源。整理它的三個坑，以及什麼時候該換回 watch。'
keywords: ''
author: Opshell
createdAt: '2025-07-25'
categories:
  - vue
tags:
  - vue
  - watchEffect
  - watch
  - 響應式
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的兩個小標（自動收集、不好溯源）寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：有人在 code review 時問「這裡為什麼不用 `watchEffect`？少寫一個參數不是比較簡潔嗎？」。簡潔是真的，但簡潔的代價常常是半年後沒人知道這段為什麼會一直重跑。這篇講我對 `watchEffect` 的保留，寫給已經會用 `watch`、正在猶豫要不要全面改用 `watchEffect` 的人。
:::

## 懶人包

- `watchEffect` 會把執行過程中「讀到的每一個響應式資料」都當成依賴，不用自己指定來源。
- 這很方便，但一不小心把只是拿來「用」的資料也讀進去，它就會跟著被追蹤，-|副作用會在你意想不到的時機重跑|-。
- 依賴藏在函式內容裡，出問題時很難溯源；`await` 之後讀到的東西又不會被追蹤，兩頭都容易踩。
- 我的原則：預設用 `watch` 寫清楚來源，只有「依賴很少、一眼看得完」的小副作用才用 `watchEffect`。

## 技術拆解

### watchEffect 是怎麼運作的

`watchEffect` 一建立就先執行一次，執行過程中讀到的 `ref.value`、`reactive` 的屬性，全部記下來當依賴。之後任何一個依賴變了，整個函式重跑一次，再重新收集依賴。

你可以把它想成一個沒有 return、專門拿來做副作用的 `computed`。

### 坑一：會自動收集對象

我個人不愛用，原因就是它會自動收集對象。一個不小心把副作用來源的資料掛到上面，就會跟著被追蹤。

舉個常見的情況：搜尋關鍵字變了要打 API，順便帶上使用者的語系設定。

```ts
watchEffect(() => {
    fetchList({
        keyword: keyword.value,
        locale: userSettings.locale // 只是想「拿來用」
    });
});
```

寫的人的意思是「關鍵字變了才打」，但 `userSettings.locale` 也被讀到了，所以使用者切換語系也會打一次。這還算無害，如果被讀到的是一個會頻繁變動的狀態（例如捲動位置、計時器），API 就會被打到爆。

### 坑二：不好溯源

`watch` 的依賴寫在第一個參數，一眼就知道「誰變了會觸發我」。`watchEffect` 的依賴散在函式內容裡，函式裡呼叫的其他函式、composable 讀到的東西也都算數。

出事的時候你會看到「這段一直重跑」，但要找出是哪個資料觸發的，得一行一行往下追，連被呼叫的函式都要點進去看。函式越長、越多人改過，越像在拆炸彈。

::: tip
真的要查，`watchEffect` 的第二個參數可以傳 `onTrack` 和 `onTrigger`，在開發模式下會告訴你收集了哪些依賴、是誰觸發的。能查，但這已經是在補救了。
:::

### 坑三：await 之後的東西不會被追蹤

依賴收集只發生在同步執行的那一段。函式裡一遇到 `await`，後面讀到的響應式資料就不會被追蹤。

```ts
watchEffect(async () => {
    const list = await fetchList(keyword.value); // keyword 有被追蹤
    if (filter.value) { // await 之後才讀，filter 不會被追蹤
        result.value = list.filter(item => item.type === filter.value);
    }
});
```

`filter` 變了不會重跑，又是一個要靠記憶的潛規則。

## 例子與對比

同一個需求，用 `watch` 把來源寫清楚：

```ts
watch(keyword, (newKeyword) => {
    fetchList({
        keyword: newKeyword,
        locale: userSettings.locale // 只在 callback 裡讀，不會被追蹤
    });
});
```

`watch` 的 callback 裡讀到的資料不會變成依賴，只有第一個參數的來源會。想讓它一建立就先跑一次，加 `{ immediate: true }` 就跟 `watchEffect` 一樣了。

| | `watch` | `watchEffect` |
|---|---|---|
| 依賴怎麼來 | 自己寫在第一個參數 | 執行時自動收集 |
| 會不會誤追蹤 | 不會，callback 裡讀的不算 | 會，讀到的都算 |
| 拿得到舊值 | 可以 | 不行 |
| 第一次執行 | 預設不會，`immediate: true` 才會 | 一建立就跑 |
| 好不好溯源 | 看第一個參數就知道 | 要讀完整個函式 |

那 `watchEffect` 什麼時候適合？依賴很少、函式短到一眼看得完、而且「讀到的全部都該觸發」的情況，例如把幾個狀態同步到 `document.title`：

```ts
watchEffect(() => {
    document.title = `${unreadCount.value} 則未讀 - ${pageName.value}`;
});
```

這種情境用 `watchEffect` 很順，用 `watch` 反而要把兩個來源列一遍。

## 結論

`watchEffect` 不是不好，是它把「誰會觸發我」這件事藏起來了。寫的當下省了一個參數，讀的人（包含半年後的自己）就要多花十分鐘猜。預設用 `watch`，把來源講清楚；`watchEffect` 留給短小、一眼看得完的副作用。

自動收集聽起來很聰明，但太聰明的同事，有時候比較難溝通。
