---
title: v-for 的那些事
author: Opshell
createdAt: '2025-02-04'
categories:
  - Vue
tags:
  - vue
editLink: true
isPublished: false
refer:
  - null
image: ''
description: ''
keywords: ''
---
3.2開始就有這個東西能用

v-memo讓你指定哪些值需要被監聽，有變動才去整個重新渲染

v-for="item in list" :key="item.id" v-memo="[item.status === active]"

你如果沒有這麼做，會導致v-for的結構每次都重新創建vnode

同時如果你的v-for本身有包入子組件，他也可以避免不必要更新

就是memo裡面沒有指定的那些值通通pass

## 為什麼不要用 index 來當作 key
假設我有一個 v-for 渲染

```ts
<ElDrag
    v-for="(mark, i) in markList"
    :key="`mark_${mark.order}`"
    :class="{ mark: imageTypeId === 1, position: imageTypeId === 4 }"
    :x="mark.x" :y="mark.y"
    :order="mark.order"
    :drag-width="80" :drag-height="80"
    :container="dragBox"
    @update:position="pos => updatePostion(pos, i)"
    @focus-mark="focusMark(i)"
/>
```

一開始 :key="`mark_${i}`"
假設我渲染了十個圈圈
在執行刪除第五個時 重新渲染會有問題
第十個會不見，而不是 第五個會不見
當我改上使用 mark.order 後就正常了
為什麼?

## Anser
這個問題的確很常見，是 Vue.js 在處理 v-for 渲染時的「就地更新策略 (in-place patch)」所導致的。讓我來詳細解釋給你聽。

問題的根源：就地更新策略

Vue.js 為了提升效能，在更新 v-for 渲染的列表時，預設會採用「就地更新策略」。簡單來說，它不會為了變動的資料重新建立所有 DOM 元素，而是盡可能地重複使用既有的元素。

當你使用 :key="mark_${i}" 時，key 值是索引值 i。當你刪除第五個元素時，後續元素的索引值會跟著改變：

第六個元素原本是 key="mark_5"，刪除後變成 key="mark_4"
第七個元素原本是 key="mark_6"，刪除後變成 key="mark_5"
...
第十個元素原本是 key="mark_9"，刪除後變成 key="mark_8"
由於 key 值改變了，Vue.js 會認為這些元素是新的，因此會用新的資料去更新 DOM。但由於是「就地更新」，它會直接覆蓋在原有的位置上。

這就導致了詭異的現象：你刪除了第五個，但實際上被覆蓋的是後面的元素，最後一個元素因為沒有對應的 key 值而被移除，所以看起來就像是第十個消失了。

解決方案：使用唯一且穩定的 key 值

解決這個問題的關鍵在於使用唯一且穩定的 key 值。mark.order 看起來就是一個適合的選擇，因為它代表了標記的順序，而且這個順序並不會因為刪除元素而改變。

當你使用 :key="mark_${mark.order}" 時，key 值就不會因為刪除元素而變動：

第五個元素原本是 key="mark_5"，刪除後 key="mark_5" 依然存在
後續元素的 key 值也不會改變
這樣 Vue.js 就能正確地判斷哪些元素是真正被刪除的，哪些元素需要更新，才能確保畫面正確渲染。

總結

使用索引值作為 v-for 的 key 值容易出問題，尤其是在會變動列表的場合 (新增、刪除、排序)。
盡量使用唯一且穩定的屬性作為 key 值，例如 ID、UUID、或不會重複的名稱。
如果你的資料沒有適合的唯一屬性，可以考慮手動產生 UUID。
希望這個解釋能幫助你理解問題的本質，並在未來避免類似的錯誤！

## 在 Vue 中操作陣列
承襲上面的例子：
當今天我們要做一些基本的CRUD時，可能會這樣做：
```ts
    function addMark() {
        const randomKey = Math.random().toString(36).substr(2, 9);

        markList.value.push({
            id: randomKey,
            title: '',
            x: dragBoxLeft.value,
            y: dragBoxTop.value,
            order: markList.value.length + 1
        });
    }

    function deleteMark(order: number) {
        markList.value = markList.value.filter(mark => mark.order !== order);
    }
```
但是會發現  如果今天先執行了刪除，然後要新增時吃現了怪異的情況，新增的Mark 沒有出現，直到我們對畫面進行動作，新增的標記才會一口氣跑出來‧
這是因為，變更檢測限制：
Vue 的響應式系統 (Vue3 是 Proxy) 無法直接監聽數組的某些變更，例如直接通過索引修改數組元素 (arr[index] = newValue) 或使用 push()、pop()、shift()、unshift()、splice() 等方法修改數組長度。

所以造成上面問題的原因就是 fiter 破壞了響應，所以當我們改成了下面這樣就好啦~：
```ts
    function addMark() {
        const randomKey = Math.random().toString(36).substr(2, 9);

        markList.value.push({
            id: randomKey,
            title: '',
            x: dragBoxLeft.value,
            y: dragBoxTop.value,
            order: markList.value.length + 1
        });
    }

    function deleteMark(order: number) {
        markList.value = markList.value.filter(mark => mark.order !== order);// [!code --]
        const i = markList.value.findIndex(mark => mark.order === order);  // [!code ++]
        if (i > -1) {  // [!code ++]
            markList.value.splice(i, 1);  // [!code ++]
        }  // [!code ++]
    }
```
