---
title: Vue 3 的 watch：新舊值為什麼一模一樣？
image: ''
description: 'watch 一個物件，callback 拿到的 newValue 和 oldValue 卻永遠相等？從 ref、reactive、getter 三種來源講 watch 到底在看什麼，再整理出 deep、getter、手動複製三種解法與它們的代價。'
keywords: ''
author: Opshell
createdAt: '2024-09-10'
categories:
  - vue
tags:
  - vue
  - watch
  - 響應式
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把原本的上課筆記整理成全文，「watch 物件時新舊值為什麼一樣」獨立成一段講清楚，順手修正了原本貼上的解釋裡「watch 預設一律淺層」的說法（`reactive` 來源其實是隱式 deep）。原本筆記開頭的面試題清單收在文末。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`watch`、`watchEffect`、`computed` 加上響應式的底層，大致上是資深 Vue 開發者一定要能講清楚的東西。這篇從一個很常見的卡關開始：資料明明變了，`watch` 卻沒反應；或者有反應了，callback 裡的新值和舊值卻一模一樣。寫給已經會用 `watch`、但還沒想過「它到底在看什麼」的人。
:::

## 懶人包

- `watch` 看的是「來源」：`ref` 只看 `.value` 有沒有被換掉，`reactive` 物件會隱式 deep，getter 只看回傳值有沒有變。
- 改物件裡面的屬性（mutate）不會產生新物件，所以 `newValue` 和 `oldValue` 指向同一個 Proxy，-|印出來永遠一樣|-，加 `deep: true` 也一樣。
- 想要正確的新舊值，就盯「值」不要盯「箱子」：用 getter 監聽單一欄位；真的要整包舊值，才在 getter 裡自己複製一份。
- `deep` 和整包複製都是要付錢的，大物件一直深層走訪，記憶體跟 CPU 都會很有感。

## 技術拆解

### 先搞懂：watch 到底在看什麼

`watch` 的第一個參數叫「來源」，同樣是「一包物件」，用不同方式傳進去，行為差很多：

| 來源 | 什麼時候觸發 | callback 的新舊值 |
|---|---|---|
| `ref(物件)` | 只有 `.value` 整個被換掉 | 換掉時是兩個不同物件 |
| `ref(物件)` + `deep: true` | 裡面任何屬性變動 | 屬性變動時是**同一個**物件 |
| `reactive(物件)` | 裡面任何屬性變動（隱式 deep） | **同一個**物件 |
| `() => obj.name`（回傳基本型別） | 那個值變了 | 正確的新值與舊值 |
| `() => obj.nested`（回傳物件） | 只有 `nested` 被換掉 | 換掉時是兩個不同物件 |

打個比方，`watch` 是在顧一個箱子：`ref` 的預設是「箱子有沒有被換掉」，不管裡面的東西；`reactive` 和 `deep` 是「箱子裡有東西動了就叫我」；getter 則是「我只盯箱子裡的這一樣東西」。

::: tip
Vue 3.5 之後 `deep` 也可以給數字，例如 `deep: 1` 只往下看一層，不用為了一個淺層屬性把整棵樹走完。
:::

### 情境：ref 包的資料，watch 為什麼沒反應？

假設 API 回來的資料長這樣，要把 `tags` 轉成純陣列給 `el-select` 用：

```json
"data" : {
    "tags": {
        "2": {
            "id": 2767,
            "tag": 15
        },
        "3": {
            "id": 2768,
            "tag": 16
        }
    },
}
```

當時試了三種寫法：

```ts
// 轉成純 Array 給 el-select 用
const tags: Ref<number[]> = ref([]);

// 把 tags 分割成多個 單select

const tags = computed(() => {
    return tempData.value.tags.map(tag => tag.tag);
});

watch(tempData, (val) => {
    tags.value = val.tags.map(tag => tag.tag);
});

watchEffect(() => {
    tags.value = tempData.value.tags.map(tag => tag.tag);
});
```

`computed` 會響應，但在後續的操作會有問題，所以只能考慮 `watch` 和 `watchEffect`。（`computed` 預設是唯讀的，`el-select` 的 `v-model` 要寫回去就卡住了。）

那問題來了：這個情境下，為什麼 `watch` 不會響應，`watchEffect` 卻可以正常運作？

答案就在上面那張表。`tempData` 是個 `ref`，`watch(tempData, ...)` 只在 `tempData.value` 整個被換掉時觸發；如果後續只是改了 `tempData.value.tags` 裡面的東西，箱子沒換，`watch` 當然不會叫。

`watchEffect` 不一樣，它會把執行過程中「讀到的每一個響應式屬性」都收集成依賴：`tempData.value`、`.tags`、每一筆的 `.tag` 都讀了，所以裡面任何一個變動都會重跑。

`後來用watch deep / watchEffect 來處理...`

::: warning
注意這份資料的 `tags` 其實是「用 id 當 key 的物件」，不是陣列，物件沒有 `.map()`。真的要轉陣列記得先 `Object.values(tempData.value.tags)`。
:::

### 重點：watch 物件時新舊值為什麼一樣？

這個坑在表單特別常見。用 `VeeValidate` 的 `useForm` 拿到的 `values`、或自己用 `reactive` 包的表單，丟進 `watch` 之後，callback 裡印出來的 `newValue` 和 `oldValue` 永遠一樣。這不是 `VeeValidate` 或 `Zod` 的 bug，是 Vue 響應式系統處理物件的方式。

拆開來看就三件事：

1. `reactive` 回傳的是一個 **Proxy**。你在表單裡改一個欄位，是在**改這個 Proxy 的屬性**（mutate），不是生出一個新物件。
2. `watch` 監聽 `reactive` 物件時是隱式 deep，所以屬性一動就會觸發，這部分沒問題。
3. 但觸發時 Vue 手上只有一個物件：改之前是它，改之後還是它。`newValue` 和 `oldValue` 拿到的是**同一個參考**，-|它沒有幫你拍一張「改之前」的快照|-。

所以你印出來看到「兩個都是新值」，`newValue === oldValue` 是 `true`。`deep: true` 的作用只是「裡面有變就叫我」，不是「幫我留一份舊的」。~~(箱子裡的東西被換了，你問箱子之前長怎樣，箱子也只能給你看現在的樣子。)~~

### deep 的代價：記憶體與效能

`watch` 如果一直把整包資料丟進去監聽，會發生很可怕的記憶體消耗。

deep 監聽每次都要把整棵物件樹走一遍來收集依賴；表單欄位一多、或者資料是一大包 API 回應，每打一個字就走一次。再加上很多人為了拿舊值會在 callback 裡 `cloneDeep`，就變成每打一個字複製一整包，資料量大的頁面一下就感覺得出來。

能用 getter 盯單一欄位就不要盯整包，真的要 deep 就考慮用數字限制深度。

參考資料：https://codlin.me/blog-vue/hang-tight-for-a-sec-before-you-start-watch

### 順便：watchEffect

`watchEffect`：不用指定目標，可以自行收集依賴的 watch，只是因為很容易發生來源不明的問題，所以實務上真的滿少用。可以把它想成「沒有 return、而且可能有副作用的 `computed`」。

```ts
const count = ref(0); // 響應式狀態
const anotherCount = ref(5); // 另一個響應式狀態

watchEffect(() => {
    console.log(`count 的值是 ${count.value}`);
});
```

像這個例子就只會抓 `count.value` 的變化，而不會把 `anotherCount` 當作監聽對象。為什麼我不愛用它，另外寫在 `watchEffect` 那篇。

## 例子與對比

同一個表單，三種需求，三種寫法。以下用 `reactive` 示範，`VeeValidate` 的 `useForm()` 回傳的 `values` 也是響應式物件，行為一樣（schema 怎麼接 `Zod` 以官方文件為準）。

```ts
import { reactive, watch } from 'vue';

const form = reactive({
    name: '',
    email: ''
});
// 用 VeeValidate 的話：const { values } = useForm({ validationSchema });
```

### 做法一：只要知道「有變」

```ts
watch(form, (newValue, oldValue) => {
    console.log('表單值已變更:', newValue);
    console.log('新舊值是否相同:', newValue === oldValue); // true
});
```

`reactive` 本來就是隱式 deep，不用另外寫 `deep: true`（如果來源是 `ref` 包的物件才需要）。適合「有動就自動暫存草稿」這種不在乎舊值的情境。

### 做法二：只盯特定欄位（最推薦）

```ts
watch(
    () => form.name,
    (newName, oldName) => {
        console.log(`姓名從 "${oldName}" 變更為 "${newName}"`);
    }
);

// 要盯好幾個欄位，可以給陣列
watch(
    [() => form.name, () => form.email],
    ([newName, newEmail], [oldName, oldEmail]) => {
        console.log(oldName, '→', newName, oldEmail, '→', newEmail);
    }
);
```

getter 回傳的是字串，字串是值不是參考，新舊值自然就對了，而且只有這個欄位變才會觸發，最省。

### 做法三：真的需要整包舊值

```ts
import { cloneDeep } from 'lodash-es';

watch(
    () => cloneDeep(form), // 在監聽來源中就進行深層複製
    (newValue, oldValue) => {
        console.log('舊值:', oldValue);
        console.log('新值:', newValue);
        console.log('新舊值是否相同:', newValue === oldValue); // false
    }
);
```

`cloneDeep` 讀過每一個屬性，所以每個欄位都會被收集成依賴；每次觸發都回傳一個新物件，`oldValue` 就是上一次的快照。這裡不需要再加 `deep: true`，加了只是讓 Vue 多走一遍複製出來的物件。

::: warning
不要寫成 `() => structuredClone(toRaw(form))`：`toRaw` 拿到的是原始物件，讀它不會被追蹤，結果就是一個依賴都沒收集到、永遠不會觸發。
:::

代價前面講過了：每次變動都深層複製一次，大型表單請三思。

| 需求 | 寫法 | 新舊值正確 | 成本 |
|---|---|---|---|
| 有動就好 | `watch(form, cb)` | 否（同一個物件） | 中 |
| 盯某幾個欄位 | `watch(() => form.name, cb)` | 是 | 低 |
| 要整包比對 | `watch(() => cloneDeep(form), cb)` | 是 | 高 |

## 結論

`watch` 新舊值一樣不是 bug，是你盯著箱子，而箱子從頭到尾都是同一個。想清楚自己要的是「有變就好」、「某個欄位的前後值」還是「整包快照」，再挑對應的寫法，九成的情況用 getter 盯欄位就夠了。

理解響應式盯的是「參考」還是「值」，這類問題基本上就不會再咬到你。箱子不會說謊，只是它記性很差。

::: details 原本的筆記開頭
原本筆記的開頭是一段關於 Vue 3 底層的題目清單，跟這篇主題不完全相關，原話留著當之後的寫作題庫：

總之待會我會考Vue3的底層

其實上禮拜開始我們都有探討過
大致上如果你是資深開發者，必須要知道Watch、WatchEffect、computed、以及響應式底層

Watch、WatchEffect
底層響應邏輯?

還有2更新到3以後最重大的改變，以及你用了這麼久，有沒有一些自己的感受
對於效能調校、打包優化、長時間使用網頁造成的記憶體消耗如何釋放

再來是前端共通的知識領域，通訊方式與協定、不同部門協作的溝通、短時間內有高壓力剛性需求心態如何調整
:::
