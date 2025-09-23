---
title: forEach 錦囊
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-06-09'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
#

## 陣列元素移除時
有 1、2 加到 5 清除時  4 會被跳過

markList.value.forEach((mark) => {
    console.log('mark', mark.id, mark.order);
    if (mark.id === 0) {
        markList.value.splice(markList.value.indexOf(mark), 1);
    }
});

可以正常
for (let i = markList.value.length - 1; i >= 0; i--) {
    const mark = markList.value[i];
    console.log('mark', mark.id, mark.order);
    if (mark.id === 0) {
        markList.value.splice(i, 1);
    }
}

這是因為在使用 forEach 迴圈時，當你從陣列中移除元素時，會導致迴圈的索引和陣列的長度發生變化，從而導致一些元素被跳過。

forEach 的問題
當你使用 forEach 迴圈並在迴圈中移除元素時，會發生以下情況：

forEach 迴圈會遍歷每個元素。
當你移除一個元素時，陣列的長度會減少。
這會導致 forEach 迴圈的索引和陣列的長度不同步，從而導致一些元素被跳過。
具體示例
假設 markList.value 有 5 個元素，並且你要移除 id 為 0 的元素：

當 forEach 遍歷到第四個元素時，如果這個元素被移除，陣列的長度會變成 4，但 forEach 的索引已經到了 4，這會導致第五個元素被跳過。

使用 for 迴圈的優勢
使用 for 迴圈從後向前遍歷陣列時，不會出現這個問題，因為移除元素不會影響尚未遍歷的元素的索引。

這樣的迴圈從後向前遍歷，當移除元素時，不會影響尚未遍歷的元素的索引，因此不會跳過任何元素。

總結
當你需要在迴圈中移除陣列元素時，建議使用從後向前遍歷的 for 迴圈，以避免索引和陣列長度不同步的問題。這樣可以確保所有符合條件的元素都能被正確移除。

## 你需要將 forEach 迴圈改為 for...of 迴圈並加上 await，因為 forEach 不能與 await 一起使用。
