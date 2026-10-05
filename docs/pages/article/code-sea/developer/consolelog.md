---
title: 'console 不只有 log：除錯好用的幾個方法，還有上線前怎麼清掉'
image: ''
description: 'console.table、group、time、count、trace 這些方法讓除錯更有條理；再補上印出 Vue 響應式物件的陷阱，以及用 ESLint 與打包設定把 console 擋在正式環境外面。'
keywords: ''
author: Opshell
createdAt: '2024-10-04'
categories:
  - Developer
tags:
  - JavaScript
  - Debug
  - Vue
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有標題「consolelog」，從頭寫成 console 的除錯用法與上線前的清理方式。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`console.log` 大概是每個前端最常打的一行程式碼。常見的情況是：畫面上一堆 `console.log('111')`、`console.log('here')`，DevTools 洗成一片，最後還忘了刪就上線。這篇整理幾個 `console` 其他好用的方法，以及怎麼讓它們不要跟著上線。
:::

## 懶人包
- 印變數用 `console.log({ user })`，名字跟值一起出來，不用再打 `'user:'`。
- 陣列物件用 `console.table`，分段用 `console.group`，量時間用 `console.time`，找誰呼叫用 `console.trace`。
- 印出來的物件是「點開當下」的值，不是「印出當下」的值；Vue 的響應式物件要先 `toRaw` 再複製。
- 上線前不要靠人工刪：`ESLint` 的 `no-console` 提醒、打包設定直接移除。

## 技術拆解

### 先把 log 印得好讀
```ts
const user = { id: 7, name: 'Opshell' };
const page = 2;

// 一般寫法：要自己補標籤
console.log('user:', user, 'page:', page);

// 物件簡寫：名字自動當標籤
console.log({ user, page });
```

分級也很有用，DevTools 可以照等級篩選：

```ts
console.debug('細節，預設會被藏起來');
console.info('一般資訊');
console.warn('怪怪的，但還能跑');
console.error('出事了');
```

### console.table：陣列物件一目了然
```ts
const orders = [
    { id: 1, product: '咖啡豆', amount: 450 },
    { id: 2, product: '濾紙', amount: 120 },
    { id: 3, product: '手沖壺', amount: 1280 }
];

console.table(orders);
// 只看部分欄位
console.table(orders, ['product', 'amount']);
```

比起一層一層點開，表格就像把一疊收據攤在桌上，誰金額不對一眼就看到。

### console.group：把一整段流程收在一起
```ts
console.groupCollapsed('送出訂單');
console.log('表單資料', { orders });
console.log('驗證結果', true);
console.groupEnd();
```

`groupCollapsed` 預設收合，DevTools 不會被洗版，要看再點開。

### console.time：量一段程式跑多久
```ts
console.time('組資料');

const total = orders.reduce((sum, order) => sum + order.amount, 0);

console.timeLog('組資料', '算完總金額');
console.timeEnd('組資料');
```

想知道某段迴圈到底慢不慢，用這個比憑感覺準。更細的分析還是交給 DevTools 的 Performance 面板。

### console.count、console.assert、console.trace
```ts
function onScroll() {
    // 這個函式到底被叫了幾次？
    console.count('onScroll');
}

// 條件不成立才印，成立就安靜
console.assert(total > 0, '總金額怎麼會是 0？', { total });

function updateCart() {
    // 印出呼叫堆疊：到底是誰在呼叫我？
    console.trace('updateCart 被呼叫了');
}
```

`console.count` 很適合抓「`watch` 怎麼跑了三次」這種問題；`console.trace` 則是抓「這個函式到底被誰叫」的神器。

### 陷阱：你看到的不一定是印出當下的值
```ts
const state = { count: 0 };

console.log(state);
state.count = 5;
// 在 DevTools 點開剛剛那筆，看到的可能是 count: 5
```

DevTools 對物件是「點開時才去讀」，所以你看到的是點開當下的值。想要「拍照存證」，就先複製一份：

```ts
console.log(structuredClone(state));
```

Vue 的 `ref`、`reactive` 還多一層 `Proxy`，直接印會看到一堆 `Proxy(Object)`，而且 `structuredClone` 也不吃 `Proxy`。先用 `toRaw` 拿到原始物件：

```ts
import { reactive, toRaw } from 'vue';

const form = reactive({ name: '', tags: ['vue'] });

console.log(structuredClone(toRaw(form)));
```

::: tip
在 Chrome DevTools 的設定裡打開「Custom formatters」，Vue 開發模式會把 `ref`、`reactive` 印成比較好讀的格式，不用一直展開 `[[Target]]`。
:::

## 例子與對比

### 上線前：人工刪 vs 讓工具處理
人工刪的問題大家都懂：一定會漏 ~~（而且通常漏在老闆打開 DevTools 的那一頁）~~。

**第一層：寫的時候就提醒。** `ESLint` 的 `no-console` 規則，讓 `log` 出現黃色警告，但保留 `warn`、`error`：

```ts
// eslint.config.ts
export default [
    {
        rules: {
            'no-console': ['warn', { allow: ['warn', 'error'] }]
        }
    }
];
```

**第二層：打包時直接移除。** Vite 6／7 預設用 `esbuild` 壓縮，可以在正式打包時把 `console.log`、`console.debug` 標記成無副作用，讓壓縮器整行拿掉：

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
    plugins: [vue()],
    esbuild: mode === 'production'
        ? { pure: ['console.log', 'console.debug'], drop: ['debugger'] }
        : {}
}));
```

如果想連 `warn`、`error` 都拿掉，可以用 `drop: ['console', 'debugger']`。改用 Rolldown／Oxc 的 Vite 版本，設定方式請以官方文件為準。

| 做法 | 優點 | 缺點 |
| :--- | :--- | :--- |
| 人工刪 | 不用設定 | 一定會漏 |
| `ESLint` 的 `no-console` | 寫的當下就看得到 | 只是提醒，還是可能被忽略 |
| 打包移除 | 正式環境保證乾淨 | 線上出問題時，也看不到你原本想留的 log |

所以真正需要在線上追的資訊，應該交給錯誤監控服務，而不是留一堆 `console.log` 祈禱。

## 結論
`console` 是除錯的瑞士刀，只會用 `log` 就像只拿它來開瓶蓋。`table` 看資料、`group` 分段、`time` 量速度、`trace` 抓兇手，再搭配 `ESLint` 和打包設定把它們擋在正式環境外面。

畢竟，`console.log('111')` 這種東西，還是留在開發環境就好。
