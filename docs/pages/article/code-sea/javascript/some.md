---
title: '檢索陣列的那些方式'
author: 'Opshell'
createdAt: '2025/01/24'
categories:
  - 使用實例
tags:
  - javascript
  - array
editLink: true
isPublished: false
refer:
  -
---

## Some
`Some` 是不常用但是用起來超級方便的好東西，最常用的地方就是拿來檢查陣列中是否有符合條件的項目，有的話就直接回傳 `true` 否則回傳 `false`。
來個範例：

```ts
// 檢查是否有任何物件是關閉的狀態，有的話就回傳 true
function checkHasClose() {
    return list.value.some((item) => {
        return !item.isOpen || item.child.some((child) => !child.isOpen);
    });
}

// 如果要達成同樣的效果  用 foreach 會是這樣

```
