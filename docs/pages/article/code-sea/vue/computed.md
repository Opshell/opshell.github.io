---
title: 'computed 的插隊能力：在資料進畫面前整理好，但別動到原資料'
image: ''
description: 'computed 可以插在原始資料與 template 之間，先過濾、補預設值再交給畫面。但在 computed 裡直接改原資料，是在埋一顆會自己引爆的雷。'
keywords: ''
author: Opshell
createdAt: '2025-05-15'
categories:
  - Vue
tags:
  - Vue
  - computed
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有標題「computed 的插隊能力」和一段程式碼，依此寫成全文，並指出原範例在 computed 裡改到原資料的問題。「插隊能力」的解讀是我猜的，請確認是不是你想講的意思。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
API 回來的資料，很少能直接丟進畫面：有的欄位是 `null`、有的陣列要先過濾、有的要補預設值。常見的情況是大家會在 `computed` 裡順手把資料「修好」，畫面也真的正常了。這篇想聊 `computed` 這個「插隊」的位置怎麼用才對，以及一個很常見、看起來能跑的錯誤寫法。
:::

## 懶人包
- `computed` 就像排在「原始資料」和「畫面」中間插隊的人：資料進畫面前，先經過它整理。
- 它的工作是**算出新的值**，不是**修改原本的值**。
- 在 `computed` 裡改原資料（`item.child = ...`）會產生副作用：原資料被偷偷改掉、可能觸發多餘的重算，邏輯也很難追。
- 正確做法是用 `map` 回傳新物件，原資料保持原樣。
- 需要「修好資料」的話，在拿到 API 回應的那一刻就整理，而不是在 `computed` 裡。

## 技術拆解

### 插隊的位置
資料流大概是這樣：

```
API 回應 → ref（原始資料） → computed（整理） → template（顯示）
```

`computed` 的好處是：原始資料一變它就自動重算，沒變就用快取。所以它很適合做「過濾、排序、補預設值、格式化」這種**從 A 推出 B** 的事情。

### 原本的寫法
```ts
const departmentDatas = computed(() => {
    return data.value.map((item) => {
        if (!item.child) {
            item.child = [];
        } else {
            item.child = item.child.filter((pos) => {
                return pos.lat && pos.lng;
            });
        }

        // ....
    });
});
```

意圖很清楚：沒有 `child` 就補空陣列，有的話把沒有座標的點濾掉。畫面也會正常。

問題在於 `item` 是**原始資料裡的物件**，`item.child = ...` 等於直接改了 `data.value`。這會帶來幾個麻煩：

1. **原資料被汙染**：別的地方用 `data.value` 時，拿到的已經是被過濾過的版本，濾掉的點再也找不回來。
2. **副作用不受控**：`computed` 什麼時候重算是 Vue 決定的，你沒辦法預期這段修改什麼時候發生。
3. **可能造成多餘的觸發**：在 `computed` 裡寫入響應式資料，會讓依賴它的東西被標記為需要更新。官方文件也明確建議 getter 不要有副作用。

用排隊來比喻：插隊的人幫你把東西包裝好再交給櫃台沒問題，但他把你包包裡的東西換掉，就不太對了 ~~（而且你回家才發現）~~。

## 例子與對比

### 做法 A：在 computed 裡改原資料（不建議）
就是上面那段。能跑，但 `data.value` 已經被改掉了。

### 做法 B：回傳新物件
```ts
type Position = { lat?: number; lng?: number };
type Department = { id: number; name: string; child?: Position[] | null };

const data = ref<Department[]>([]);

const departmentDatas = computed(() => {
    return data.value.map((item) => ({
        ...item,
        child: (item.child ?? []).filter((pos) => pos.lat && pos.lng)
    }));
});
```

原始資料一個字都沒動，`departmentDatas` 是全新的陣列。之後要顯示「全部點位」還是「有座標的點位」，兩份都在。

### 做法 C：拿到資料就整理
如果「沒有 `child` 就補空陣列」是**整個專案都要的規則**，那它不該住在某一個元件的 `computed` 裡，而是在接 API 的地方就處理掉：

```ts
const fetchDepartments = async () => {
    const response = await getDepartments();
    data.value = response.map((item) => ({
        ...item,
        child: item.child ?? []
    }));
};
```

這樣 `computed` 只需要做這個畫面特有的事（過濾座標），職責很單純。

| | A：computed 裡改原資料 | B：computed 回傳新資料 | C：進門就整理 |
|---|---|---|---|
| 原資料 | 被改掉 | 保持原樣 | 一開始就是乾淨的 |
| 副作用 | 有 | 無 | 無 |
| 適合 | 不建議 | 這個畫面特有的整理 | 全專案共通的規則 |

## 結論
`computed` 是很好用的插隊位置，但插隊的人只能幫忙整理、不能偷換東西。記住一句話就好：-|computed 只讀不寫|-。要寫，就回到資料的源頭去寫。
