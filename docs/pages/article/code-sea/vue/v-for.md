---
title: v-for 的那些事：v-memo、key 與陣列操作
author: Opshell
createdAt: '2025-02-04'
categories:
  - Vue
tags:
  - vue
  - v-for
  - v-memo
editLink: true
isPublished: false
refer:
  - null
image: ''
description: 'v-for 人人會寫，但列表一大、一會動，就開始出現怪事。整理三個小主題：用 v-memo 跳過不必要的重新渲染、為什麼不要用 index 當 key、以及刪除後新增的元素怎麼不見了。'
keywords: ''
---
::: warning 草稿
Claude 於 2026-10-05 補完：補上開頭、懶人包、脈絡與結論，把 AI 回答改寫成敘述，並在陣列操作那段補充 Vue 3 響應式的實際行為與 key 重複的可能原因。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`v-for` 大概是 `Vue` 裡第一個學會、也最少回頭看的指令。直到某天做一個可以拖拉的標記功能：畫面上有一排圈圈，可以新增、刪除、拖位置，結果刪掉第五個，消失的卻是第十個；先刪再新增，新的圈圈又不出現。

這篇把那陣子踩到的三件事記下來，寫給列表會動、會增刪的人。
:::

## 懶人包
- `v-memo`（Vue 3.2+）讓你指定「哪些值變了才重新渲染這一項」，大列表裡可以跳過大量沒必要的 vnode 比對。
- 不要用 index 當 `key`：刪掉中間一項，後面每一項的 index 都會往前挪，`Vue` 會「就地更新」，有內部狀態的子元件就會對不上資料。
- `key` 要-|唯一而且穩定|-：用 id、UUID，不要用會重複或會變的值。
- 陣列操作出怪事時，先懷疑 key 有沒有重複、有沒有人抓著舊陣列的參考，而不是急著怪 `filter`。

## 技術拆解

### v-memo：沒變的就別再算一次
`Vue` 3.2 開始就有這個東西能用。`v-memo` 讓你指定哪些值需要被監聽，有變動才去把這一項整個重新渲染：

```vue
<div v-for="item in list" :key="item.id" v-memo="[item.id === selected]">
    <p>ID: {{ item.id }} - selected: {{ item.id === selected }}</p>
    <ItemDetail :item="item" />
</div>
```

如果你沒有這麼做，每次 `list` 或 `selected` 一變，`v-for` 的每一項都會重新建立 vnode 再比對一次。有了 `v-memo`，陣列裡的值沒變的那些項目，`Vue` 會直接整個跳過，連裡面的子元件也不會被觸發不必要的更新。說白了就是：-|memo 裡沒有指定的那些值，通通 pass|-。

注意幾件事：

- `v-memo` 要跟 `v-for` 寫在同一個元素上。
- 依賴陣列要寫完整，漏寫的值變了，畫面就不會更新（它就是照你說的 pass 掉了）。
- 官方的說法是，它只在效能真的有感的大列表（上千筆）才值得用，一般列表不用急著加。

### 為什麼不要用 index 當 key
假設我有一個 `v-for` 渲染一排可拖拉的標記：

```vue
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

一開始寫的是 ``:key="`mark_${i}`"``。假設渲染了十個圈圈，刪除第五個之後重新渲染就出問題了：-|不見的是第十個，而不是第五個|-。改用 `mark.order` 之後就正常了。為什麼？

原因是 `Vue` 的-|就地更新策略（in-place patch）|-。為了效能，`Vue` 更新列表時會盡量重複使用既有的元素，靠 `key` 判斷「這一項是不是剛剛那一項」。

用 index 當 key 時，刪掉第五項（`mark_4`）之後：

| 刪除前 | 刪除後 |
|---|---|
| `mark_0`～`mark_3`：第 1～4 個 | `mark_0`～`mark_3`：第 1～4 個 |
| `mark_4`：第 5 個 | `mark_4`：**第 6 個的資料** |
| `mark_5`：第 6 個 | `mark_5`：**第 7 個的資料** |
| … | … |
| `mark_9`：第 10 個 | （不見了） |

`Vue` 看到 `mark_0`～`mark_8` 都還在，就沿用原本那九個元件，只是把新的 props 塞進去；`mark_9` 沒了，就把-|最後一個元件|-拆掉。如果 `ElDrag` 裡面有自己的狀態（拖拉後的位置、focus 狀態），這些狀態還留在原本的元件身上，就會跟新塞進來的資料對不上，看起來就像第十個消失了、第五個還在。

改用 `mark.order` 之後，刪掉第五個，其他人的 key 都不會變，`Vue` 就能正確判斷「被刪掉的是 `mark_5`」，只拆那一個。

總結一下：

- 用 index 當 key，在會增刪、排序的列表很容易出問題。
- 盡量用唯一且穩定的屬性當 key，例如 ID、UUID、或不會重複的名稱。
- 資料沒有適合的唯一屬性，就在建立時自己產生一個 UUID。

### 在 Vue 中操作陣列
承襲上面的例子，做基本的增刪時可能會這樣寫：

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

結果發現：先執行刪除、再新增時出現了怪異的情況，新增的標記沒有出現，直到對畫面做其他動作，新增的標記才一口氣跑出來。

當時的理解是「變更偵測的限制」：Vue 的響應式系統無法直接監聽陣列的某些變更，例如直接用索引改元素（`arr[index] = newValue`），或用 `push()`、`pop()`、`shift()`、`unshift()`、`splice()` 改長度，所以判斷是 `filter` 破壞了響應，改成 `splice` 就好啦～：

```ts
function deleteMark(order: number) {
    markList.value = markList.value.filter(mark => mark.order !== order); // [!code --]
    const i = markList.value.findIndex(mark => mark.order === order); // [!code ++]
    if (i > -1) { // [!code ++]
        markList.value.splice(i, 1); // [!code ++]
    } // [!code ++]
}
```

::: warning 回頭補充：Vue 3 其實偵測得到
上面那段「無法監聽 `push`、索引賦值」是 `Vue 2`（`Object.defineProperty`）的限制。`Vue 3` 改用 `Proxy`，`push`、`splice`、`arr[i] = x` 都偵測得到，`markList.value = 新陣列` 對 `ref` 來說也是正常的響應式更新，`filter` 本身不會破壞響應。

改成 `splice` 會好，比較可能是下面兩個原因之一：

1. **有人抓著舊陣列**：例如某處寫了 `const marks = markList.value`、或把陣列傳給拖拉套件／非響應式的物件保存。`filter` 產生的是新陣列，那個參考還指著舊的；`splice` 是原地修改，大家拿到的還是同一個陣列。
2. **key 重複了**：刪掉 order 5 之後剩九個，`order: markList.value.length + 1` 算出來是 10，跟原本就存在的第十個撞 key。重複的 key 會讓 `Vue` 的比對出現不可預期的結果（開發模式下 console 會有 `Duplicate keys` 警告）。這個問題 `splice` 版本其實也有，只是沒被觸發到而已。
:::

## 例子與對比
把上面三件事收在一起，比較穩的寫法是：key 用建立時就產生、之後不會變的 `id`；`order` 用「目前最大值 + 1」，不要用長度推算：

```ts
type Mark = { id: string; title: string; x: number; y: number; order: number };

const markList = ref<Mark[]>([]);

function addMark() {
    const maxOrder = Math.max(0, ...markList.value.map(mark => mark.order));

    markList.value.push({
        id: crypto.randomUUID(), // substr 已經是棄用 API，直接用瀏覽器內建的 UUID
        title: '',
        x: dragBoxLeft.value,
        y: dragBoxTop.value,
        order: maxOrder + 1
    });
}

function deleteMark(id: string) {
    const i = markList.value.findIndex(mark => mark.id === id);
    if (i > -1) {
        markList.value.splice(i, 1);
    }
}
```

```vue
<ElDrag
    v-for="mark in markList"
    :key="mark.id"
    :x="mark.x" :y="mark.y"
    :order="mark.order"
    @focus-mark="focusMark(mark.id)"
/>
```

| 寫法 | 刪中間一項 | 刪後再新增 |
|---|---|---|
| `key = index` | 子元件狀態錯位，看起來刪錯人 | 一樣錯位 |
| `key = order`、`order = length + 1` | 正常 | 可能撞 key |
| `key = id`、`order = max + 1` | 正常 | 正常 |

## 結論
`v-for` 本身很單純，麻煩的是「列表會動」這件事。`v-memo` 是大列表的加分題，`key` 才是必考題：唯一、穩定、不要拿 index 充數。遇到增刪之後畫面怪怪的，先去 console 找 `Duplicate keys`，比怪 `filter` 快多了。~~（`filter`：這鍋我不背。）~~
