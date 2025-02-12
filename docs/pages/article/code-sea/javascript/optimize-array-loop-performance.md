---
title: '迴圈遍歷組資料效能優化'
author: 'Opshell'
createdAt: '2025/02/12'
categories:
  - 使用實例
tags:
  - javascript
  - vue
  - array
editLink: true
isPublished: true
---

有時候會有資料遍歷組合出新資料的需求，API 中不提供相關的群組功能，於是把群組資料直接寫進每筆資料中，抓取資料後要渲染時，最直覺得寫法就會是像下面的例子：

```ts
thisYearTaskList.value.forEach((item) => {
    if (!groupList.value[item.extendedProperties.private.groupId]) {
        groupList.value[item.extendedProperties.private.groupId] = item.extendedProperties.private.groupTitle;
    }
});
```
但是寫完當下就馬上會有個思考，這樣資料量大的話這個效能會慘不忍睹，為什麼呢?

1. `forEach` 的函式調用開銷：
大家都知道 forEach 的效能是所有遍歷裡面數一數二慢的，因為它會產生額外的函式調用。
在資料量小的時候為了可讀性這樣做不錯，但是量大的環境中使用 for...of 或 for 迴圈可以減少這些額外的效能開銷。
2. `Proxy 代理` 重複存取：
groupList.value 是 Vue 3 的 ref()，每次訪問 groupList.value 時都會觸發 Vue 的 Proxy 代理，影響效能。
3. 深層物件存取 (item.extendedProperties.private)
每次迭代時都會重複存取 item.extendedProperties.private.groupId 和 item.extendedProperties.private.groupTitle，這會增加物件屬性查詢的開銷。

來優化一下，於是想到了下面幾種方式：

## 1. 使用 for...of 搭配變數解構
```ts
const groupMap = groupList.value; // 減少 Vue Proxy 代理開銷

for (const item of thisYearTaskList.value) {
    const { groupId, groupTitle } = item.extendedProperties.private;

    if (!groupMap[groupId]) {
        groupMap[groupId] = groupTitle;
    }
}
```
優點：
- 降低 Vue Proxy 開銷：先存 groupList.value 到 groupMap，減少 Vue ref 的存取次數。
- 減少深層屬性存取：使用 解構 ({ groupId, groupTitle })，減少 . 屬性查詢的次數。
- 避免 forEach 的額外函式調用：使用 for...of，減少不必要的函式開銷。

缺點：
當 groupList.value 變動時，groupMap 不會自動更新（但在這段程式碼中通常不影響）。

## 2. 使用 reduce
```ts
const groupMap = groupList.value; // 減少 Vue Proxy 代理影響

thisYearTaskList.value.reduce((acc, item) => {
    const { groupId, groupTitle } = item.extendedProperties.private;
    if (!acc[groupId]) {
        acc[groupId] = groupTitle;
    }
    return acc;
}, groupMap);
```
優點：
程式碼更具函數式風格。簡單來說就是程式碼看起來高大上

缺點：
reduce 主要用來轉換新物件，但這裡是直接修改 groupMap，可讀性反而下降(看起來跩的缺點)。
reduce 會在每次迭代回傳 acc，比 for...of 更慢一些。

小結論：適合轉換新物件，但不推薦這種用途

## 3. 使用 Map
如果 groupList.value 是一個物件，你可以考慮改用 Map，Map 比 Object 查找速度更快：
```ts
const groupMap = new Map(Object.entries(groupList.value));

for (const item of thisYearTaskList.value) {
    const { groupId, groupTitle } = item.extendedProperties.private;

    if (!groupMap.has(groupId)) {
        groupMap.set(groupId, groupTitle);
    }
}

// 如果 groupList.value 是 Vue 物件，需要再轉回 Object
groupList.value = Object.fromEntries(groupMap);
```

優點：
- Map 的 .has() 查詢比 Object 更快。
- 適合大量數據處理，如果 thisYearTaskList.value 超過 1 萬筆資料，這種方式會有優勢。

缺點：
- 需要將 groupList.value 轉換回 Object，不適合 Vue 的 reactive()。

小結論：適合高效能存取，但不適合 Vue reactive 物件

## 結論
看來看去 如果是在 vue 的場景，for...of 的方式是最好的解了~
反正 待辦事項 一年不會超過一萬筆(吧)?
